import { createClient } from '@supabase/supabase-js';
import { decrypt } from '../../utils/encryption.js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Validate webhook signature using HMAC-SHA256
 * @param {string} payload - Raw request payload
 * @param {string} signature - Webhook signature header
 * @param {string} secret - Webhook secret
 * @returns {boolean} Signature validation result
 */
function validateWebhookSignature(payload, signature, secret) {
    if (!secret || !signature) {
        return true; // Skip validation if no secret configured
    }
    
    try {
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload, 'utf8')
            .digest('hex');
        
        const providedSignature = signature.replace('sha256=', '');
        
        return crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(providedSignature, 'hex')
        );
        
    } catch (error) {
        console.error('Signature validation error:', error);
        return false;
    }
}

/**
 * Normalize lead data from Convoso webhook payload
 * @param {object} webhookData - Raw webhook payload
 * @param {string} agencyId - Agency identifier
 * @returns {object} Normalized lead data
 */
function normalizeLeadData(webhookData, agencyId) {
    // Handle different webhook event structures
    const leadData = webhookData.lead || webhookData.data || webhookData;
    
    const normalized = {
        // Core identifiers
        lead_id: leadData.lead_id || leadData.id || leadData.leadId,
        external_id: leadData.external_id || leadData.externalId || leadData.reference_id,
        
        // Contact information
        phone_number: leadData.phone_number || leadData.phone || leadData.phoneNumber,
        email: leadData.email || leadData.email_address,
        first_name: leadData.first_name || leadData.firstName || leadData.fname,
        last_name: leadData.last_name || leadData.lastName || leadData.lname,
        
        // Address information
        address_line1: leadData.address || leadData.address_line1 || leadData.street,
        address_line2: leadData.address_line2 || leadData.apartment,
        city: leadData.city,
        state: leadData.state || leadData.province,
        zip_code: leadData.zip_code || leadData.zipCode || leadData.postal_code || leadData.zip,
        country: leadData.country || 'US',
        
        // Personal information
        age: parseInt(leadData.age) || null,
        date_of_birth: leadData.date_of_birth || leadData.dob,
        gender: leadData.gender,
        
        // Lead source and campaign
        source: leadData.source || leadData.lead_source || 'convoso',
        campaign_id: leadData.campaign_id || leadData.campaignId,
        campaign_name: leadData.campaign_name || leadData.campaignName,
        utm_source: leadData.utm_source,
        utm_medium: leadData.utm_medium,
        utm_campaign: leadData.utm_campaign,
        
        // Financial information
        cost: parseFloat(leadData.cost || leadData.lead_cost || leadData.price || 0),
        estimated_value: parseFloat(leadData.estimated_value || leadData.value || 0),
        
        // Insurance specific information
        insurance_type: leadData.insurance_type || leadData.insuranceType || leadData.product_type || 'auto',
        coverage_type: leadData.coverage_type || leadData.coverageType,
        current_carrier: leadData.current_carrier || leadData.currentCarrier || leadData.current_insurer,
        policy_expires: leadData.policy_expires || leadData.policyExpires || leadData.expiration_date,
        policy_number: leadData.policy_number || leadData.policyNumber,
        annual_premium: parseFloat(leadData.annual_premium || leadData.annualPremium || 0) || null,
        
        // Lead quality and scoring
        lead_score: parseInt(leadData.lead_score || leadData.score || leadData.quality_score || 50),
        lead_quality: leadData.lead_quality || leadData.quality || 'b_grade',
        lead_intent: leadData.lead_intent || leadData.intent || 'medium',
        behavioral_score: parseInt(leadData.behavioral_score || 50),
        engagement_score: parseInt(leadData.engagement_score || 50),
        
        // Status and priority
        status: 'new',
        sub_status: leadData.sub_status || leadData.status,
        priority: leadData.priority || (parseInt(leadData.lead_score || 50) > 80 ? 'high' : 'normal'),
        lead_temperature: leadData.lead_temperature || 
                         (parseInt(leadData.lead_score || 50) > 80 ? 'hot' : 
                          parseInt(leadData.lead_score || 50) > 60 ? 'warm' : 'cold'),
        
        // Communication preferences
        preferred_contact_method: leadData.preferred_contact_method || leadData.contact_preference || 'phone',
        best_time_to_call: leadData.best_time_to_call || leadData.best_call_time,
        timezone: leadData.timezone || leadData.time_zone,
        do_not_call: Boolean(leadData.do_not_call || leadData.dnc),
        do_not_email: Boolean(leadData.do_not_email || leadData.dne),
        
        // Audit and tracking
        source_ip: leadData.source_ip || leadData.ip_address,
        user_agent: leadData.user_agent,
        referrer_url: leadData.referrer_url || leadData.referrer,
        landing_page: leadData.landing_page || leadData.landing_url,
        
        // Notes and additional data
        notes: leadData.notes || leadData.comments || leadData.description,
        tags: Array.isArray(leadData.tags) ? leadData.tags : [],
        
        // Timestamps
        received_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    // Store additional unmapped fields
    const additionalData = { ...leadData };
    
    // Remove fields we've already mapped
    const mappedFields = [
        'lead_id', 'id', 'leadId', 'external_id', 'externalId', 'reference_id',
        'phone_number', 'phone', 'phoneNumber', 'email', 'email_address',
        'first_name', 'firstName', 'fname', 'last_name', 'lastName', 'lname',
        'address', 'address_line1', 'street', 'address_line2', 'apartment',
        'city', 'state', 'province', 'zip_code', 'zipCode', 'postal_code', 'zip',
        'country', 'age', 'date_of_birth', 'dob', 'gender', 'source', 'lead_source',
        'campaign_id', 'campaignId', 'campaign_name', 'campaignName',
        'utm_source', 'utm_medium', 'utm_campaign', 'cost', 'lead_cost', 'price',
        'estimated_value', 'value', 'insurance_type', 'insuranceType', 'product_type',
        'coverage_type', 'coverageType', 'current_carrier', 'currentCarrier', 'current_insurer',
        'policy_expires', 'policyExpires', 'expiration_date', 'policy_number', 'policyNumber',
        'annual_premium', 'annualPremium', 'lead_score', 'score', 'quality_score',
        'lead_quality', 'quality', 'lead_intent', 'intent', 'behavioral_score', 'engagement_score',
        'sub_status', 'status', 'priority', 'lead_temperature', 'preferred_contact_method',
        'contact_preference', 'best_time_to_call', 'best_call_time', 'timezone', 'time_zone',
        'do_not_call', 'dnc', 'do_not_email', 'dne', 'source_ip', 'ip_address',
        'user_agent', 'referrer_url', 'referrer', 'landing_page', 'landing_url',
        'notes', 'comments', 'description', 'tags'
    ];
    
    mappedFields.forEach(field => delete additionalData[field]);
    normalized.additional_data = additionalData;
    
    return normalized;
}

/**
 * Assign lead to agent using round-robin or smart assignment
 * @param {object} supabaseClient - Database client
 * @param {string} agencyId - Agency identifier
 * @param {object} leadData - Normalized lead data
 * @returns {number|null} Assigned agent ID
 */
async function assignLeadToAgent(supabaseClient, agencyId, leadData) {
    try {
        // Get active agents for this agency
        const { data: agents, error: agentsError } = await supabaseClient
            .from('portal_users')
            .select('id, name, email, last_lead_assigned')
            .eq('agency_id', agencyId)
            .eq('role', 'agent')
            .eq('is_active', true)
            .order('last_lead_assigned', { ascending: true, nullsFirst: true });
        
        if (agentsError || !agents?.length) {
            console.log(`No active agents found for agency ${agencyId}`);
            return null;
        }
        
        // Smart assignment based on lead characteristics
        let selectedAgent = null;
        
        // Priority 1: High-value leads to top performers
        if (leadData.lead_score >= 80 || leadData.priority === 'high') {
            // In a real implementation, we'd track agent performance metrics
            // For now, use simple round-robin for high-priority leads
            selectedAgent = agents[0];
        }
        
        // Priority 2: Insurance type specialization
        // In production, agents could have specialization preferences
        
        // Default: Round-robin assignment
        if (!selectedAgent) {
            selectedAgent = agents[0]; // Agents are already ordered by last_lead_assigned
        }
        
        // Update agent's last assignment time
        const { error: updateError } = await supabaseClient
            .from('portal_users')
            .update({ 
                last_lead_assigned: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', selectedAgent.id);
        
        if (updateError) {
            console.error('Error updating agent assignment time:', updateError);
        }
        
        console.log(`Assigned lead ${leadData.lead_id} to agent ${selectedAgent.name} (ID: ${selectedAgent.id})`);
        return selectedAgent.id;
        
    } catch (error) {
        console.error('Error in agent assignment:', error);
        return null;
    }
}

/**
 * Log webhook activity for audit and debugging
 * @param {object} supabaseClient - Database client
 * @param {string} agencyId - Agency identifier
 * @param {object} logData - Webhook activity data
 */
async function logWebhookActivity(supabaseClient, agencyId, logData) {
    try {
        await supabaseClient
            .from('webhook_logs')
            .insert({
                agency_id: agencyId,
                request_id: logData.requestId,
                webhook_url: logData.webhookUrl,
                http_method: 'POST',
                request_headers: logData.requestHeaders,
                response_headers: logData.responseHeaders,
                signature_validation: logData.signatureValidation,
                api_key_validation: logData.apiKeyValidation,
                request_payload: logData.requestPayload,
                response_payload: logData.responsePayload,
                payload_size_bytes: logData.payloadSize,
                http_status_code: logData.statusCode,
                processing_status: logData.processingStatus,
                processing_time_ms: logData.processingTime,
                error_message: logData.errorMessage,
                error_code: logData.errorCode,
                lead_id: logData.leadId,
                lead_action: logData.leadAction,
                agent_assigned: logData.agentAssigned,
                source_ip: logData.sourceIp,
                user_agent: logData.userAgent,
                request_size_bytes: logData.requestSize,
                response_size_bytes: logData.responseSize,
                received_at: new Date().toISOString(),
                processed_at: logData.processedAt,
                completed_at: new Date().toISOString()
            });
    } catch (error) {
        console.error('Error logging webhook activity:', error);
        // Don't throw - logging errors shouldn't break webhook processing
    }
}

/**
 * Update lead analytics
 * @param {object} supabaseClient - Database client
 * @param {string} agencyId - Agency identifier
 * @param {object} leadData - Lead data for analytics
 */
async function updateAnalytics(supabaseClient, agencyId, leadData) {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        await supabaseClient
            .from('lead_analytics')
            .upsert({
                agency_id: agencyId,
                date: today,
                source: leadData.source,
                campaign_id: leadData.campaign_id,
                campaign_name: leadData.campaign_name,
                insurance_type: leadData.insurance_type,
                total_leads: 1,
                new_leads: 1,
                total_cost: leadData.cost,
                cost_per_lead: leadData.cost,
                avg_lead_score: leadData.lead_score,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'agency_id,date,source,campaign_id',
                ignoreDuplicates: false
            });
        
        // Update the upserted record to increment counters
        await supabaseClient.rpc('increment_lead_analytics', {
            p_agency_id: agencyId,
            p_date: today,
            p_source: leadData.source,
            p_campaign_id: leadData.campaign_id || '',
            p_cost: leadData.cost,
            p_lead_score: leadData.lead_score
        });
        
    } catch (error) {
        console.error('Error updating analytics:', error);
        // Don't throw - analytics errors shouldn't break webhook processing
    }
}

/**
 * Main webhook handler for agency-specific endpoints
 */
export default async function handler(req, res) {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Convoso-Signature');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Webhooks must use POST.' 
        });
    }
    
    // Extract agency ID from URL path
    const agencyId = req.query.agency;
    
    if (!agencyId) {
        return res.status(400).json({
            success: false,
            error: 'Agency ID is required in URL path'
        });
    }
    
    const logData = {
        requestId,
        webhookUrl: `https://insurance.syncedupsolutions.com/api/leads/convoso-webhook/${agencyId}`,
        requestHeaders: req.headers,
        requestPayload: req.body,
        payloadSize: JSON.stringify(req.body).length,
        sourceIp: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestSize: req.headers['content-length'] || 0,
        processingStatus: 'processing',
        signatureValidation: 'not_checked',
        apiKeyValidation: 'not_checked'
    };
    
    try {
        console.log(`Webhook received for agency ${agencyId}:`, {
            requestId,
            timestamp: new Date().toISOString(),
            payload: req.body
        });
        
        // Get agency integration configuration
        const { data: integration, error: integrationError } = await supabase
            .from('agency_integrations')
            .select('*')
            .eq('agency_id', agencyId)
            .eq('integration_type', 'convoso')
            .eq('is_active', true)
            .single();
        
        if (integrationError || !integration) {
            logData.processingStatus = 'error';
            logData.errorMessage = 'No active integration found for this agency';
            logData.errorCode = 'NO_INTEGRATION';
            logData.statusCode = 404;
            
            await logWebhookActivity(supabase, agencyId, logData);
            
            return res.status(404).json({
                success: false,
                error: 'No active Convoso integration found for this agency',
                agencyId,
                requestId
            });
        }
        
        // Decrypt webhook secret for signature validation
        let webhookSecret = null;
        if (integration.encrypted_webhook_secret) {
            try {
                webhookSecret = decrypt(integration.encrypted_webhook_secret, agencyId);
                logData.signatureValidation = 'available';
            } catch (decryptError) {
                console.error('Error decrypting webhook secret:', decryptError);
                logData.signatureValidation = 'decrypt_error';
            }
        }
        
        // Validate webhook signature if secret is configured
        const signature = req.headers['x-convoso-signature'] || req.headers['x-webhook-signature'];
        if (webhookSecret) {
            const rawPayload = JSON.stringify(req.body);
            const isValidSignature = validateWebhookSignature(rawPayload, signature, webhookSecret);
            
            if (!isValidSignature) {
                logData.processingStatus = 'error';
                logData.signatureValidation = 'invalid';
                logData.errorMessage = 'Invalid webhook signature';
                logData.errorCode = 'INVALID_SIGNATURE';
                logData.statusCode = 401;
                
                await logWebhookActivity(supabase, agencyId, logData);
                
                return res.status(401).json({
                    success: false,
                    error: 'Invalid webhook signature',
                    requestId
                });
            }
            
            logData.signatureValidation = 'valid';
        }
        
        // Normalize lead data
        const leadData = normalizeLeadData(req.body, agencyId);
        
        if (!leadData.lead_id || !leadData.phone_number) {
            logData.processingStatus = 'error';
            logData.errorMessage = 'Missing required fields: lead_id or phone_number';
            logData.errorCode = 'MISSING_REQUIRED_FIELDS';
            logData.statusCode = 400;
            
            await logWebhookActivity(supabase, agencyId, logData);
            
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: lead_id or phone_number',
                requestId
            });
        }
        
        // Begin database transaction
        const { data: transactionResult, error: transactionError } = await supabase.rpc('begin_transaction');
        
        if (transactionError) {
            throw new Error(`Transaction start failed: ${transactionError.message}`);
        }
        
        try {
            // Check if lead already exists
            const { data: existingLead, error: existingLeadError } = await supabase
                .from('convoso_leads')
                .select('id, lead_id, status')
                .eq('agency_id', agencyId)
                .eq('lead_id', leadData.lead_id)
                .single();
            
            if (existingLeadError && existingLeadError.code !== 'PGRST116') {
                throw new Error(`Error checking existing lead: ${existingLeadError.message}`);
            }
            
            let leadAction = 'created';
            let agentAssigned = null;
            
            if (existingLead) {
                // Update existing lead
                const { error: updateError } = await supabase
                    .from('convoso_leads')
                    .update({
                        ...leadData,
                        agency_id: agencyId,
                        updated_at: new Date().toISOString(),
                        last_updated_by: null // System update
                    })
                    .eq('agency_id', agencyId)
                    .eq('lead_id', leadData.lead_id);
                
                if (updateError) {
                    throw new Error(`Error updating lead: ${updateError.message}`);
                }
                
                leadAction = 'updated';
                console.log(`Lead ${leadData.lead_id} updated for agency ${agencyId}`);
                
            } else {
                // Assign lead to agent
                agentAssigned = await assignLeadToAgent(supabase, agencyId, leadData);
                leadData.agent_id = agentAssigned;
                
                // Insert new lead
                const { error: insertError } = await supabase
                    .from('convoso_leads')
                    .insert({
                        ...leadData,
                        agency_id: agencyId,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                
                if (insertError) {
                    throw new Error(`Error inserting lead: ${insertError.message}`);
                }
                
                leadAction = 'created';
                console.log(`New lead ${leadData.lead_id} created for agency ${agencyId}, assigned to agent ${agentAssigned}`);
            }
            
            // Update analytics
            await updateAnalytics(supabase, agencyId, leadData);
            
            // Commit transaction
            await supabase.rpc('commit_transaction');
            
            const processingTime = Date.now() - startTime;
            
            // Log successful webhook activity
            logData.processingStatus = 'success';
            logData.statusCode = 200;
            logData.processingTime = processingTime;
            logData.leadId = leadData.lead_id;
            logData.leadAction = leadAction;
            logData.agentAssigned = agentAssigned;
            logData.processedAt = new Date().toISOString();
            
            await logWebhookActivity(supabase, agencyId, logData);
            
            // Create audit trail entry
            await supabase
                .from('convoso_audit_trail')
                .insert({
                    agency_id: agencyId,
                    event_type: `lead_${leadAction}`,
                    event_category: 'integration',
                    event_description: `Lead ${leadAction} via Convoso webhook`,
                    lead_id: leadData.lead_id,
                    request_id: requestId,
                    success: true,
                    metadata: {
                        source: 'webhook',
                        campaign_id: leadData.campaign_id,
                        campaign_name: leadData.campaign_name,
                        lead_score: leadData.lead_score,
                        agent_assigned: agentAssigned,
                        processing_time_ms: processingTime
                    },
                    processing_time_ms: processingTime,
                    event_timestamp: new Date().toISOString()
                });
            
            // Success response
            res.status(200).json({
                success: true,
                message: `Lead ${leadAction} successfully`,
                data: {
                    lead_id: leadData.lead_id,
                    action: leadAction,
                    agency_id: agencyId,
                    agent_assigned: agentAssigned,
                    status: leadData.status,
                    processing_time_ms: processingTime
                },
                requestId,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            // Rollback transaction
            await supabase.rpc('rollback_transaction');
            throw error;
        }
        
    } catch (error) {
        console.error(`Webhook processing error for agency ${agencyId}:`, error);
        
        const processingTime = Date.now() - startTime;
        
        // Log failed webhook activity
        logData.processingStatus = 'error';
        logData.statusCode = 500;
        logData.processingTime = processingTime;
        logData.errorMessage = error.message;
        logData.errorCode = 'PROCESSING_ERROR';
        logData.processedAt = new Date().toISOString();
        
        await logWebhookActivity(supabase, agencyId, logData);
        
        // Create error audit trail
        await supabase
            .from('convoso_audit_trail')
            .insert({
                agency_id: agencyId,
                event_type: 'webhook_error',
                event_category: 'integration',
                event_description: 'Webhook processing failed',
                request_id: requestId,
                success: false,
                error_message: error.message,
                metadata: {
                    source: 'webhook',
                    error_type: error.constructor.name,
                    processing_time_ms: processingTime
                },
                processing_time_ms: processingTime,
                event_timestamp: new Date().toISOString()
            });
        
        res.status(500).json({
            success: false,
            error: 'Webhook processing failed',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            agencyId,
            requestId,
            timestamp: new Date().toISOString()
        });
    }
}

// Export for testing
export const _internal = {
    validateWebhookSignature,
    normalizeLeadData,
    assignLeadToAgent
};

// API route configuration
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '2mb',
        },
    },
};