// Convoso Webhook Endpoint for Lead Integration
// URL: https://insurance.syncedupsolutions.com/api/leads/convoso-webhook

const { Pool } = require('pg');
const crypto = require('crypto');

// Database connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Convoso API authentication and validation
function validateConvosoRequest(req) {
    const { headers, body } = req;
    
    // Validate API key (if Convoso provides one)
    const apiKey = headers['x-convoso-api-key'] || headers['authorization'];
    const expectedKey = process.env.CONVOSO_API_KEY;
    
    if (expectedKey && apiKey !== expectedKey && apiKey !== `Bearer ${expectedKey}`) {
        return { valid: false, error: 'Invalid API key' };
    }
    
    // Validate webhook signature (if Convoso provides HMAC signature)
    const signature = headers['x-convoso-signature'];
    const webhookSecret = process.env.CONVOSO_WEBHOOK_SECRET;
    
    if (webhookSecret && signature) {
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(JSON.stringify(body))
            .digest('hex');
            
        if (signature !== `sha256=${expectedSignature}`) {
            return { valid: false, error: 'Invalid webhook signature' };
        }
    }
    
    // Basic payload validation
    if (!body || typeof body !== 'object') {
        return { valid: false, error: 'Invalid payload format' };
    }
    
    return { valid: true };
}

// Normalize lead data from Convoso format
function normalizeLeadData(convosoData) {
    // Map Convoso fields to our database schema
    const normalized = {
        lead_id: convosoData.lead_id || convosoData.id || convosoData.leadId,
        external_id: convosoData.external_id || convosoData.externalId,
        phone_number: convosoData.phone_number || convosoData.phone || convosoData.phoneNumber,
        first_name: convosoData.first_name || convosoData.firstName,
        last_name: convosoData.last_name || convosoData.lastName,
        email: convosoData.email,
        source: convosoData.source || convosoData.lead_source || 'convoso',
        campaign_id: convosoData.campaign_id || convosoData.campaignId,
        campaign_name: convosoData.campaign_name || convosoData.campaignName,
        cost: parseFloat(convosoData.cost || convosoData.lead_cost || 0),
        state: convosoData.state || convosoData.address_state,
        city: convosoData.city || convosoData.address_city,
        zip_code: convosoData.zip_code || convosoData.zipCode || convosoData.zip,
        age: parseInt(convosoData.age) || null,
        gender: convosoData.gender,
        insurance_type: convosoData.insurance_type || convosoData.insuranceType || 'auto',
        coverage_type: convosoData.coverage_type || convosoData.coverageType,
        current_carrier: convosoData.current_carrier || convosoData.currentCarrier,
        policy_expires: convosoData.policy_expires || convosoData.policyExpires,
        agent_assignment: null, // Will be assigned by round-robin or rules
        status: 'new',
        priority: convosoData.priority || 'normal',
        lead_score: parseInt(convosoData.lead_score || convosoData.score) || 50,
        call_attempts: 0,
        last_call_time: null,
        notes: convosoData.notes || convosoData.comments,
        received_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    // Additional data fields (JSON storage for flexibility)
    const additionalData = { ...convosoData };
    delete additionalData.lead_id;
    delete additionalData.phone_number;
    delete additionalData.first_name;
    delete additionalData.last_name;
    delete additionalData.email;
    delete additionalData.source;
    delete additionalData.cost;
    
    normalized.additional_data = additionalData;
    
    return normalized;
}

// Agent assignment logic (round-robin or rules-based)
async function assignLeadToAgent(client, leadData) {
    try {
        // Get active agents (excluding managers and admins for lead assignment)
        const agentsResult = await client.query(`
            SELECT user_id, name, email 
            FROM users 
            WHERE role = 'agent' 
            AND status = 'active' 
            ORDER BY last_lead_assigned ASC, created_at ASC
        `);
        
        if (agentsResult.rows.length === 0) {
            console.log('No active agents available for assignment');
            return null;
        }
        
        // Simple round-robin assignment (can be enhanced with more sophisticated logic)
        const assignedAgent = agentsResult.rows[0];
        
        // Update agent's last_lead_assigned timestamp
        await client.query(`
            UPDATE users 
            SET last_lead_assigned = NOW() 
            WHERE user_id = $1
        `, [assignedAgent.user_id]);
        
        return assignedAgent.user_id;
        
    } catch (error) {
        console.error('Error in agent assignment:', error);
        return null;
    }
}

// Main webhook handler
export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use POST.' 
        });
    }
    
    console.log('Convoso webhook received:', {
        timestamp: new Date().toISOString(),
        headers: req.headers,
        body: req.body
    });
    
    const client = await pool.connect();
    
    try {
        // Validate request
        const validation = validateConvosoRequest(req);
        if (!validation.valid) {
            console.error('Webhook validation failed:', validation.error);
            return res.status(401).json({ 
                success: false, 
                error: validation.error 
            });
        }
        
        // Normalize lead data
        const leadData = normalizeLeadData(req.body);
        
        if (!leadData.lead_id || !leadData.phone_number) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: lead_id or phone_number' 
            });
        }
        
        await client.query('BEGIN');
        
        // Check if lead already exists
        const existingLead = await client.query(
            'SELECT lead_id FROM convoso_leads WHERE lead_id = $1 OR phone_number = $2',
            [leadData.lead_id, leadData.phone_number]
        );
        
        if (existingLead.rows.length > 0) {
            // Update existing lead
            const updateResult = await client.query(`
                UPDATE convoso_leads SET
                    first_name = $2,
                    last_name = $3,
                    email = $4,
                    source = $5,
                    campaign_id = $6,
                    campaign_name = $7,
                    cost = $8,
                    state = $9,
                    city = $10,
                    zip_code = $11,
                    age = $12,
                    gender = $13,
                    insurance_type = $14,
                    coverage_type = $15,
                    current_carrier = $16,
                    policy_expires = $17,
                    priority = $18,
                    lead_score = $19,
                    notes = $20,
                    additional_data = $21,
                    updated_at = NOW()
                WHERE lead_id = $1
                RETURNING *
            `, [
                leadData.lead_id, leadData.first_name, leadData.last_name,
                leadData.email, leadData.source, leadData.campaign_id,
                leadData.campaign_name, leadData.cost, leadData.state,
                leadData.city, leadData.zip_code, leadData.age, leadData.gender,
                leadData.insurance_type, leadData.coverage_type, leadData.current_carrier,
                leadData.policy_expires, leadData.priority, leadData.lead_score,
                leadData.notes, JSON.stringify(leadData.additional_data)
            ]);
            
            console.log('Lead updated:', updateResult.rows[0]);
            
        } else {
            // Assign lead to agent
            const assignedAgentId = await assignLeadToAgent(client, leadData);
            leadData.agent_assignment = assignedAgentId;
            
            // Insert new lead
            const insertResult = await client.query(`
                INSERT INTO convoso_leads (
                    lead_id, external_id, phone_number, first_name, last_name, email,
                    source, campaign_id, campaign_name, cost, state, city, zip_code,
                    age, gender, insurance_type, coverage_type, current_carrier,
                    policy_expires, agent_assignment, status, priority, lead_score,
                    call_attempts, last_call_time, notes, additional_data,
                    received_at, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                    $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
                    $27, $28, $29, $30
                ) RETURNING *
            `, [
                leadData.lead_id, leadData.external_id, leadData.phone_number,
                leadData.first_name, leadData.last_name, leadData.email,
                leadData.source, leadData.campaign_id, leadData.campaign_name,
                leadData.cost, leadData.state, leadData.city, leadData.zip_code,
                leadData.age, leadData.gender, leadData.insurance_type,
                leadData.coverage_type, leadData.current_carrier, leadData.policy_expires,
                leadData.agent_assignment, leadData.status, leadData.priority,
                leadData.lead_score, leadData.call_attempts, leadData.last_call_time,
                leadData.notes, JSON.stringify(leadData.additional_data),
                leadData.received_at, leadData.created_at, leadData.updated_at
            ]);
            
            console.log('New lead created:', insertResult.rows[0]);
        }
        
        // Update analytics
        await client.query(`
            INSERT INTO lead_analytics (
                date, source, total_leads, total_cost, avg_lead_score,
                created_at, updated_at
            ) VALUES (
                CURRENT_DATE, $1, 1, $2, $3, NOW(), NOW()
            ) ON CONFLICT (date, source) DO UPDATE SET
                total_leads = lead_analytics.total_leads + 1,
                total_cost = lead_analytics.total_cost + $2,
                avg_lead_score = (lead_analytics.avg_lead_score * lead_analytics.total_leads + $3) / (lead_analytics.total_leads + 1),
                updated_at = NOW()
        `, [leadData.source, leadData.cost, leadData.lead_score]);
        
        await client.query('COMMIT');
        
        // Success response
        res.status(200).json({
            success: true,
            message: 'Lead processed successfully',
            data: {
                lead_id: leadData.lead_id,
                status: leadData.status,
                agent_assignment: leadData.agent_assignment,
                processed_at: new Date().toISOString()
            }
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Webhook processing error:', error);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error processing lead',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
        
    } finally {
        client.release();
    }
}

// Health check endpoint for webhook monitoring
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1mb',
        },
    },
}