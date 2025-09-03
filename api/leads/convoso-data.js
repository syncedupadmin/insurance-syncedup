// API endpoint for fetching Convoso leads data and analytics
// Supports both Manager and Admin portals

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Authentication middleware
function authenticateUser(req) {
    const token = req.headers.authorization;
    // In production, implement proper JWT verification
    // For now, basic validation
    if (!token) {
        return { authenticated: false, error: 'No authorization token' };
    }
    
    return { authenticated: true };
}

// Get user role from token/session
function getUserRole(req) {
    // In production, decode JWT to get user role
    // For now, return from headers or default to agent
    return req.headers['x-user-role'] || 'agent';
}

// Get user ID from token/session
function getUserId(req) {
    // In production, decode JWT to get user ID
    return req.headers['x-user-id'] || '1';
}

export default async function handler(req, res) {
    const { method, query } = req;
    
    // Authenticate request
    const auth = authenticateUser(req);
    if (!auth.authenticated) {
        return res.status(401).json({ error: auth.error });
    }
    
    const userRole = getUserRole(req);
    const userId = getUserId(req);
    
    const client = await pool.connect();
    
    try {
        switch (method) {
            case 'GET':
                return await handleGetRequest(client, req, res, userRole, userId);
            case 'POST':
                return await handlePostRequest(client, req, res, userRole, userId);
            case 'PUT':
                return await handlePutRequest(client, req, res, userRole, userId);
            default:
                return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        client.release();
    }
}

async function handleGetRequest(client, req, res, userRole, userId) {
    const { 
        type = 'leads',
        timeframe = 'today',
        source,
        status,
        agent,
        limit = '50',
        offset = '0',
        sortBy = 'received_at',
        sortOrder = 'DESC'
    } = req.query;
    
    switch (type) {
        case 'leads':
            return await getLeadsData(client, res, {
                timeframe, source, status, agent, limit, offset, sortBy, sortOrder, userRole, userId
            });
        case 'analytics':
            return await getAnalyticsData(client, res, { timeframe, source, userRole });
        case 'agent-performance':
            return await getAgentPerformance(client, res, { timeframe, userRole });
        case 'source-performance':
            return await getSourcePerformance(client, res, { timeframe, userRole });
        case 'live-stats':
            return await getLiveStats(client, res, { userRole });
        default:
            return res.status(400).json({ error: 'Invalid type parameter' });
    }
}

async function getLeadsData(client, res, params) {
    const { timeframe, source, status, agent, limit, offset, sortBy, sortOrder, userRole, userId } = params;
    
    // Build WHERE clause based on filters
    const conditions = [];
    const values = [];
    let valueIndex = 1;
    
    // Time filtering
    if (timeframe !== 'all') {
        switch (timeframe) {
            case 'today':
                conditions.push(`cl.received_at >= CURRENT_DATE`);
                break;
            case 'week':
                conditions.push(`cl.received_at >= CURRENT_DATE - INTERVAL '7 days'`);
                break;
            case 'month':
                conditions.push(`cl.received_at >= CURRENT_DATE - INTERVAL '30 days'`);
                break;
            case 'quarter':
                conditions.push(`cl.received_at >= CURRENT_DATE - INTERVAL '90 days'`);
                break;
        }
    }
    
    // Source filtering
    if (source) {
        conditions.push(`cl.source = $${valueIndex}`);
        values.push(source);
        valueIndex++;
    }
    
    // Status filtering
    if (status) {
        conditions.push(`cl.status = $${valueIndex}`);
        values.push(status);
        valueIndex++;
    }
    
    // Agent filtering (for managers/admins or agent's own leads)
    if (agent) {
        conditions.push(`cl.agent_assignment = $${valueIndex}`);
        values.push(parseInt(agent));
        valueIndex++;
    } else if (userRole === 'agent') {
        conditions.push(`cl.agent_assignment = $${valueIndex}`);
        values.push(parseInt(userId));
        valueIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get leads with agent information
    const leadsQuery = `
        SELECT 
            cl.*,
            u.name as agent_name,
            u.email as agent_email,
            EXTRACT(EPOCH FROM (NOW() - cl.received_at))/3600 as hours_since_received,
            CASE 
                WHEN cl.received_at > NOW() - INTERVAL '1 hour' THEN 'hot'
                WHEN cl.received_at > NOW() - INTERVAL '4 hours' THEN 'warm'
                ELSE 'cold'
            END as lead_temperature,
            (
                SELECT COUNT(*) 
                FROM lead_activity_log lal 
                WHERE lal.lead_id = cl.lead_id
            ) as activity_count
        FROM convoso_leads cl
        LEFT JOIN users u ON cl.agent_assignment = u.user_id
        ${whereClause}
        ORDER BY cl.${sortBy} ${sortOrder}
        LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
    `;
    
    values.push(parseInt(limit), parseInt(offset));
    
    const leadsResult = await client.query(leadsQuery, values);
    
    // Get total count
    const countQuery = `
        SELECT COUNT(*) as total
        FROM convoso_leads cl
        LEFT JOIN users u ON cl.agent_assignment = u.user_id
        ${whereClause}
    `;
    
    const countResult = await client.query(countQuery, values.slice(0, -2)); // Remove limit/offset
    
    return res.json({
        success: true,
        data: {
            leads: leadsResult.rows,
            total: parseInt(countResult.rows[0].total),
            limit: parseInt(limit),
            offset: parseInt(offset)
        }
    });
}

async function getAnalyticsData(client, res, params) {
    const { timeframe, source, userRole } = params;
    
    // Build time condition
    let timeCondition = '';
    switch (timeframe) {
        case 'today':
            timeCondition = 'AND date = CURRENT_DATE';
            break;
        case 'week':
            timeCondition = 'AND date >= CURRENT_DATE - INTERVAL \'7 days\'';
            break;
        case 'month':
            timeCondition = 'AND date >= CURRENT_DATE - INTERVAL \'30 days\'';
            break;
        case 'quarter':
            timeCondition = 'AND date >= CURRENT_DATE - INTERVAL \'90 days\'';
            break;
        default:
            timeCondition = '';
    }
    
    const sourceCondition = source ? `AND source = '${source}'` : '';
    
    // Get analytics data
    const analyticsQuery = `
        SELECT 
            source,
            SUM(total_leads) as total_leads,
            SUM(new_leads) as new_leads,
            SUM(contacted_leads) as contacted_leads,
            SUM(qualified_leads) as qualified_leads,
            SUM(sold_leads) as sold_leads,
            SUM(total_cost) as total_cost,
            SUM(total_revenue) as total_revenue,
            ROUND(AVG(conversion_rate), 2) as avg_conversion_rate,
            ROUND(AVG(avg_lead_score), 2) as avg_lead_score,
            CASE 
                WHEN SUM(total_leads) > 0 THEN ROUND(SUM(total_cost) / SUM(total_leads), 2)
                ELSE 0 
            END as cost_per_lead,
            CASE 
                WHEN SUM(sold_leads) > 0 THEN ROUND(SUM(total_cost) / SUM(sold_leads), 2)
                ELSE 0 
            END as cost_per_sale,
            CASE 
                WHEN SUM(total_cost) > 0 THEN ROUND((SUM(total_revenue) - SUM(total_cost)) / SUM(total_cost) * 100, 2)
                ELSE 0 
            END as roi_percentage
        FROM lead_analytics
        WHERE 1=1 ${timeCondition} ${sourceCondition}
        GROUP BY source
        ORDER BY total_leads DESC
    `;
    
    const analyticsResult = await client.query(analyticsQuery);
    
    // Get daily trend data
    const trendQuery = `
        SELECT 
            date,
            SUM(total_leads) as leads,
            SUM(total_cost) as cost,
            SUM(sold_leads) as conversions
        FROM lead_analytics
        WHERE date >= CURRENT_DATE - INTERVAL '30 days' ${sourceCondition}
        GROUP BY date
        ORDER BY date DESC
        LIMIT 30
    `;
    
    const trendResult = await client.query(trendQuery);
    
    return res.json({
        success: true,
        data: {
            analytics: analyticsResult.rows,
            trend: trendResult.rows
        }
    });
}

async function getAgentPerformance(client, res, params) {
    const { timeframe, userRole } = params;
    
    let timeCondition = '';
    switch (timeframe) {
        case 'today':
            timeCondition = 'AND cl.received_at >= CURRENT_DATE';
            break;
        case 'week':
            timeCondition = 'AND cl.received_at >= CURRENT_DATE - INTERVAL \'7 days\'';
            break;
        case 'month':
            timeCondition = 'AND cl.received_at >= CURRENT_DATE - INTERVAL \'30 days\'';
            break;
        case 'quarter':
            timeCondition = 'AND cl.received_at >= CURRENT_DATE - INTERVAL \'90 days\'';
            break;
        default:
            timeCondition = '';
    }
    
    const performanceQuery = `
        SELECT 
            u.user_id,
            u.name,
            u.email,
            COUNT(cl.id) as total_leads,
            COUNT(CASE WHEN cl.status = 'contacted' THEN 1 END) as contacted_leads,
            COUNT(CASE WHEN cl.status = 'qualified' THEN 1 END) as qualified_leads,
            COUNT(CASE WHEN cl.status = 'sold' THEN 1 END) as converted_leads,
            ROUND(
                COUNT(CASE WHEN cl.status = 'sold' THEN 1 END)::DECIMAL / 
                NULLIF(COUNT(cl.id), 0) * 100, 2
            ) as conversion_rate,
            SUM(cl.cost) as total_lead_cost,
            ROUND(AVG(cl.lead_score), 2) as avg_lead_score,
            ROUND(AVG(cl.call_attempts), 2) as avg_call_attempts,
            ROUND(AVG(EXTRACT(EPOCH FROM (cl.last_call_time - cl.received_at))/3600), 2) as avg_response_time_hours
        FROM users u
        LEFT JOIN convoso_leads cl ON u.user_id = cl.agent_assignment
        WHERE u.role = 'agent' AND u.status = 'active' ${timeCondition}
        GROUP BY u.user_id, u.name, u.email
        ORDER BY converted_leads DESC, conversion_rate DESC
    `;
    
    const performanceResult = await client.query(performanceQuery);
    
    return res.json({
        success: true,
        data: performanceResult.rows
    });
}

async function getSourcePerformance(client, res, params) {
    const { timeframe, userRole } = params;
    
    let timeCondition = '';
    switch (timeframe) {
        case 'today':
            timeCondition = 'WHERE received_at >= CURRENT_DATE';
            break;
        case 'week':
            timeCondition = 'WHERE received_at >= CURRENT_DATE - INTERVAL \'7 days\'';
            break;
        case 'month':
            timeCondition = 'WHERE received_at >= CURRENT_DATE - INTERVAL \'30 days\'';
            break;
        case 'quarter':
            timeCondition = 'WHERE received_at >= CURRENT_DATE - INTERVAL \'90 days\'';
            break;
        default:
            timeCondition = '';
    }
    
    const sourceQuery = `
        SELECT 
            source,
            campaign_name,
            COUNT(*) as total_leads,
            COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted_leads,
            COUNT(CASE WHEN status = 'sold' THEN 1 END) as converted_leads,
            SUM(cost) as total_cost,
            ROUND(AVG(cost), 2) as avg_cost_per_lead,
            ROUND(AVG(lead_score), 2) as avg_lead_score,
            ROUND(
                COUNT(CASE WHEN status = 'sold' THEN 1 END)::DECIMAL / 
                COUNT(*) * 100, 2
            ) as conversion_rate,
            CASE 
                WHEN COUNT(CASE WHEN status = 'sold' THEN 1 END) > 0 
                THEN ROUND(SUM(cost) / COUNT(CASE WHEN status = 'sold' THEN 1 END), 2)
                ELSE 0 
            END as cost_per_conversion
        FROM convoso_leads
        ${timeCondition}
        GROUP BY source, campaign_name
        ORDER BY total_leads DESC, conversion_rate DESC
    `;
    
    const sourceResult = await client.query(sourceQuery);
    
    return res.json({
        success: true,
        data: sourceResult.rows
    });
}

async function getLiveStats(client, res, params) {
    const { userRole } = params;
    
    // Get real-time statistics
    const statsQuery = `
        SELECT 
            COUNT(*) as total_leads_today,
            COUNT(CASE WHEN status = 'new' THEN 1 END) as new_leads_today,
            COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted_today,
            COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_today,
            SUM(cost) as total_cost_today,
            ROUND(AVG(lead_score), 2) as avg_lead_score_today,
            COUNT(CASE WHEN received_at > NOW() - INTERVAL '1 hour' THEN 1 END) as leads_last_hour,
            COUNT(CASE WHEN received_at > NOW() - INTERVAL '15 minutes' THEN 1 END) as leads_last_15min
        FROM convoso_leads
        WHERE received_at >= CURRENT_DATE
    `;
    
    const statsResult = await client.query(statsQuery);
    
    // Get latest leads (last 10)
    const latestLeadsQuery = `
        SELECT 
            lead_id, first_name, last_name, phone_number, source, 
            status, cost, lead_score, received_at,
            u.name as agent_name
        FROM convoso_leads cl
        LEFT JOIN users u ON cl.agent_assignment = u.user_id
        ORDER BY received_at DESC
        LIMIT 10
    `;
    
    const latestLeadsResult = await client.query(latestLeadsQuery);
    
    return res.json({
        success: true,
        data: {
            stats: statsResult.rows[0],
            latestLeads: latestLeadsResult.rows
        }
    });
}

async function handlePostRequest(client, req, res, userRole, userId) {
    // Handle lead updates, assignments, etc.
    const { action, leadId, data } = req.body;
    
    switch (action) {
        case 'update-status':
            return await updateLeadStatus(client, res, leadId, data, userId);
        case 'assign-agent':
            return await assignLeadToAgent(client, res, leadId, data, userId);
        case 'add-note':
            return await addLeadNote(client, res, leadId, data, userId);
        default:
            return res.status(400).json({ error: 'Invalid action' });
    }
}

async function updateLeadStatus(client, res, leadId, data, userId) {
    const { status, notes } = data;
    
    try {
        await client.query('BEGIN');
        
        // Update lead status
        const updateResult = await client.query(`
            UPDATE convoso_leads 
            SET status = $1, updated_at = NOW()
            WHERE lead_id = $2
            RETURNING *
        `, [status, leadId]);
        
        if (updateResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Lead not found' });
        }
        
        // Log activity
        await client.query(`
            INSERT INTO lead_activity_log (
                lead_id, agent_id, activity_type, new_status, notes, created_at
            ) VALUES ($1, $2, 'status_change', $3, $4, NOW())
        `, [leadId, userId, status, notes]);
        
        await client.query('COMMIT');
        
        return res.json({
            success: true,
            data: updateResult.rows[0]
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
}

async function handlePutRequest(client, req, res, userRole, userId) {
    // Handle lead updates
    const { leadId } = req.query;
    const updateData = req.body;
    
    if (!leadId) {
        return res.status(400).json({ error: 'Lead ID required' });
    }
    
    // Build update query dynamically based on provided fields
    const allowedFields = [
        'first_name', 'last_name', 'email', 'phone_number', 'status', 
        'priority', 'notes', 'insurance_type', 'lead_score'
    ];
    
    const updateFields = [];
    const values = [];
    let valueIndex = 1;
    
    for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
            updateFields.push(`${key} = $${valueIndex}`);
            values.push(value);
            valueIndex++;
        }
    }
    
    if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    updateFields.push(`updated_at = NOW()`);
    values.push(leadId);
    
    const updateQuery = `
        UPDATE convoso_leads 
        SET ${updateFields.join(', ')}
        WHERE lead_id = $${valueIndex}
        RETURNING *
    `;
    
    const result = await client.query(updateQuery, values);
    
    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Lead not found' });
    }
    
    return res.json({
        success: true,
        data: result.rows[0]
    });
}