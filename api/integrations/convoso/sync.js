import { createClient } from '@supabase/supabase-js';
import { decrypt } from '../../utils/encryption.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Rate limiting configuration
const RATE_LIMITS = {
    requests_per_minute: 30,
    requests_per_hour: 1000,
    max_concurrent_requests: 5,
    backoff_base_ms: 1000,
    max_backoff_ms: 30000,
    max_retries: 3
};

// In-memory rate limiting storage (in production, use Redis)
const rateLimitStore = new Map();

/**
 * Rate limiter implementation
 * @param {string} key - Rate limit key (usually agencyId)
 * @returns {object} Rate limit status
 */
function checkRateLimit(key) {
    const now = Date.now();
    const minuteWindow = Math.floor(now / 60000);
    const hourWindow = Math.floor(now / 3600000);
    
    if (!rateLimitStore.has(key)) {
        rateLimitStore.set(key, {
            minute: { window: minuteWindow, requests: 0 },
            hour: { window: hourWindow, requests: 0 },
            concurrent: 0,
            lastRequest: 0
        });
    }
    
    const limits = rateLimitStore.get(key);
    
    // Reset minute window if needed
    if (limits.minute.window !== minuteWindow) {
        limits.minute = { window: minuteWindow, requests: 0 };
    }
    
    // Reset hour window if needed
    if (limits.hour.window !== hourWindow) {
        limits.hour = { window: hourWindow, requests: 0 };
    }
    
    const allowed = 
        limits.minute.requests < RATE_LIMITS.requests_per_minute &&
        limits.hour.requests < RATE_LIMITS.requests_per_hour &&
        limits.concurrent < RATE_LIMITS.max_concurrent_requests;
    
    if (allowed) {
        limits.minute.requests++;
        limits.hour.requests++;
        limits.concurrent++;
        limits.lastRequest = now;
    }
    
    return {
        allowed,
        remaining: {
            minute: RATE_LIMITS.requests_per_minute - limits.minute.requests,
            hour: RATE_LIMITS.requests_per_hour - limits.hour.requests,
            concurrent: RATE_LIMITS.max_concurrent_requests - limits.concurrent
        },
        resetTime: {
            minute: (minuteWindow + 1) * 60000,
            hour: (hourWindow + 1) * 3600000
        }
    };
}

/**
 * Release concurrent request slot
 * @param {string} key - Rate limit key
 */
function releaseRateLimit(key) {
    const limits = rateLimitStore.get(key);
    if (limits && limits.concurrent > 0) {
        limits.concurrent--;
    }
}

/**
 * Exponential backoff delay
 * @param {number} attempt - Retry attempt number
 * @returns {number} Delay in milliseconds
 */
function calculateBackoff(attempt) {
    const delay = RATE_LIMITS.backoff_base_ms * Math.pow(2, attempt);
    return Math.min(delay + Math.random() * 1000, RATE_LIMITS.max_backoff_ms);
}

/**
 * Fetch historical leads from Convoso API with pagination
 * @param {object} credentials - Decrypted Convoso credentials
 * @param {object} options - Sync options
 * @returns {object} Sync results
 */
async function syncHistoricalLeads(credentials, options = {}) {
    const {
        agencyId,
        startDate = null,
        endDate = null,
        campaignId = null,
        limit = 100,
        offset = 0
    } = options;
    
    try {
        // Fetch historical leads from Convoso API
        const apiUrl = new URL('https://api.convoso.com/v1/leads');
        apiUrl.searchParams.append('limit', limit);
        apiUrl.searchParams.append('offset', offset);
        
        if (startDate) apiUrl.searchParams.append('start_date', startDate);
        if (endDate) apiUrl.searchParams.append('end_date', endDate);
        if (campaignId) apiUrl.searchParams.append('campaign_id', campaignId);
        
        const response = await fetch(apiUrl.toString(), {
            headers: {
                'Authorization': `Bearer ${credentials.apiKey}`,
                'Content-Type': 'application/json',
                'X-Account-ID': credentials.accountId
            }
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return {
            leads: data.leads || [],
            totalCount: data.total_count || 0,
            hasMore: data.has_more || false,
            nextOffset: data.next_offset || null
        };
        
    } catch (error) {
        console.error('Error syncing historical leads:', error);
        throw error;
    }
}

/**
 * Store synced leads in database
 * @param {string} agencyId - Agency identifier
 * @param {array} leads - Array of lead data
 * @returns {object} Storage results
 */
async function storeLeads(agencyId, leads) {
    const results = {
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: []
    };
    
    try {
        for (const leadData of leads) {
            try {
                // Check if lead already exists
                const { data: existingLead } = await supabase
                    .from('convoso_leads')
                    .select('id')
                    .eq('agency_id', agencyId)
                    .eq('lead_id', leadData.lead_id)
                    .single();
                
                if (existingLead) {
                    // Update existing lead
                    const { error: updateError } = await supabase
                        .from('convoso_leads')
                        .update({
                            ...leadData,
                            agency_id: agencyId,
                            updated_at: new Date().toISOString()
                        })
                        .eq('agency_id', agencyId)
                        .eq('lead_id', leadData.lead_id);
                    
                    if (updateError) {
                        results.errors.push(`Update error for ${leadData.lead_id}: ${updateError.message}`);
                    } else {
                        results.updated++;
                    }
                } else {
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
                        results.errors.push(`Insert error for ${leadData.lead_id}: ${insertError.message}`);
                    } else {
                        results.inserted++;
                    }
                }
                
            } catch (leadError) {
                results.errors.push(`Processing error for ${leadData.lead_id}: ${leadError.message}`);
            }
        }
        
        return results;
        
    } catch (error) {
        console.error('Error storing leads:', error);
        throw error;
    }
}

/**
 * Log sync activity
 * @param {string} agencyId - Agency identifier
 * @param {object} syncData - Sync operation data
 */
async function logSyncActivity(agencyId, syncData) {
    try {
        await supabase
            .from('convoso_audit_trail')
            .insert({
                agency_id: agencyId,
                event_type: 'historical_sync',
                event_category: 'integration',
                event_description: 'Historical leads sync operation',
                success: syncData.success,
                metadata: {
                    sync_type: 'historical',
                    leads_processed: syncData.leadsProcessed,
                    results: syncData.results,
                    duration_ms: syncData.durationMs,
                    rate_limited: syncData.rateLimited || false
                },
                processing_time_ms: syncData.durationMs,
                event_timestamp: new Date().toISOString()
            });
    } catch (error) {
        console.error('Error logging sync activity:', error);
        // Don't throw - logging errors shouldn't break the sync
    }
}

/**
 * Main sync endpoint handler
 */
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use POST to start sync.' 
        });
    }
    
    const startTime = Date.now();
    let rateLimitKey = null;
    
    try {
        const {
            agencyId,
            syncType = 'incremental', // incremental, full, date_range
            startDate = null,
            endDate = null,
            campaignId = null,
            batchSize = 100
        } = req.body;
        
        if (!agencyId) {
            return res.status(400).json({
                success: false,
                error: 'Agency ID is required'
            });
        }
        
        rateLimitKey = `sync_${agencyId}`;
        
        console.log(`Starting ${syncType} sync for agency: ${agencyId}`);
        
        // Check rate limits
        const rateCheck = checkRateLimit(rateLimitKey);
        if (!rateCheck.allowed) {
            return res.status(429).json({
                success: false,
                error: 'Rate limit exceeded',
                rateLimit: rateCheck,
                retryAfter: Math.ceil((rateCheck.resetTime.minute - Date.now()) / 1000)
            });
        }
        
        // Get agency integration
        const { data: integration, error: integrationError } = await supabase
            .from('agency_integrations')
            .select('*')
            .eq('agency_id', agencyId)
            .eq('integration_type', 'convoso')
            .eq('is_active', true)
            .single();
        
        if (integrationError || !integration) {
            releaseRateLimit(rateLimitKey);
            return res.status(404).json({
                success: false,
                error: 'No active Convoso integration found'
            });
        }
        
        // Decrypt credentials
        const credentials = {
            apiKey: decrypt(integration.encrypted_api_key, agencyId),
            accountId: integration.encrypted_account_id ? 
                      decrypt(integration.encrypted_account_id, agencyId) : null
        };
        
        // Sync with retries and rate limiting
        let totalProcessed = 0;
        let totalInserted = 0;
        let totalUpdated = 0;
        let totalErrors = 0;
        let offset = 0;
        let hasMore = true;
        let retryCount = 0;
        
        const syncResults = {
            batches: [],
            summary: {
                total_processed: 0,
                total_inserted: 0,
                total_updated: 0,
                total_errors: 0,
                batches_processed: 0
            }
        };
        
        while (hasMore && retryCount <= RATE_LIMITS.max_retries) {
            try {
                // Fetch batch of leads
                const batchResult = await syncHistoricalLeads(credentials, {
                    agencyId,
                    startDate,
                    endDate,
                    campaignId,
                    limit: batchSize,
                    offset
                });
                
                if (batchResult.leads.length === 0) {
                    break;
                }
                
                // Store leads
                const storeResults = await storeLeads(agencyId, batchResult.leads);
                
                // Update counters
                totalProcessed += batchResult.leads.length;
                totalInserted += storeResults.inserted;
                totalUpdated += storeResults.updated;
                totalErrors += storeResults.errors.length;
                
                syncResults.batches.push({
                    offset,
                    leads_count: batchResult.leads.length,
                    inserted: storeResults.inserted,
                    updated: storeResults.updated,
                    errors: storeResults.errors.length
                });
                
                // Update pagination
                offset = batchResult.nextOffset || offset + batchSize;
                hasMore = batchResult.hasMore;
                
                // Reset retry counter on success
                retryCount = 0;
                
                console.log(`Processed batch: ${batchResult.leads.length} leads (offset: ${offset})`);
                
                // Brief pause to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (batchError) {
                retryCount++;
                
                if (retryCount <= RATE_LIMITS.max_retries) {
                    const delay = calculateBackoff(retryCount - 1);
                    console.log(`Batch failed, retrying in ${delay}ms (attempt ${retryCount})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error('Max retries exceeded for batch:', batchError);
                    totalErrors++;
                    break;
                }
            }
        }
        
        // Update summary
        syncResults.summary = {
            total_processed: totalProcessed,
            total_inserted: totalInserted,
            total_updated: totalUpdated,
            total_errors: totalErrors,
            batches_processed: syncResults.batches.length
        };
        
        const durationMs = Date.now() - startTime;
        
        // Log sync activity
        await logSyncActivity(agencyId, {
            success: totalErrors === 0,
            leadsProcessed: totalProcessed,
            results: syncResults.summary,
            durationMs,
            rateLimited: !rateCheck.allowed
        });
        
        console.log(`Sync completed for agency ${agencyId}: ${totalProcessed} leads processed in ${durationMs}ms`);
        
        res.status(200).json({
            success: true,
            agencyId,
            syncType,
            results: syncResults,
            performance: {
                duration_ms: durationMs,
                leads_per_second: durationMs > 0 ? Math.round((totalProcessed / durationMs) * 1000) : 0,
                rate_limit_remaining: rateCheck.remaining
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Sync endpoint error:', error);
        
        const durationMs = Date.now() - startTime;
        
        // Log failed sync
        if (rateLimitKey) {
            await logSyncActivity(rateLimitKey.replace('sync_', ''), {
                success: false,
                leadsProcessed: 0,
                results: { error: error.message },
                durationMs
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Sync operation failed',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString()
        });
        
    } finally {
        // Release rate limit
        if (rateLimitKey) {
            releaseRateLimit(rateLimitKey);
        }
    }
}

// Export for testing
export const _internal = {
    syncHistoricalLeads,
    storeLeads,
    checkRateLimit,
    releaseRateLimit
};