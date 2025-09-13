import { createClient } from '@supabase/supabase-js';
import { decrypt } from '../../utils/encryption.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Fetch campaigns from Convoso API
 * @param {object} credentials - Decrypted Convoso credentials
 * @returns {array} List of available campaigns
 */
async function fetchConvosoCampaigns(credentials) {
    const { apiKey, accountId } = credentials;
    
    try {
        // In a real implementation, this would make actual API calls to Convoso
        // For development, we'll return mock campaign data
        
        /*
        const response = await fetch('https://api.convoso.com/v1/campaigns', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'X-Account-ID': accountId
            }
        });
        
        if (!response.ok) {
            throw new Error(`Convoso API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.campaigns || [];
        */
        
        const response = await fetch('https://api.convoso.com/v1/campaigns', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'X-Account-ID': accountId
            }
        });
        
        if (!response.ok) {
            throw new Error(`Convoso API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.campaigns || [];
        
    } catch (error) {
        console.error('Error fetching Convoso campaigns:', error);
        throw new Error(`Failed to fetch campaigns: ${error.message}`);
    }
}

/**
 * Get campaign performance analytics
 * @param {string} agencyId - Agency identifier
 * @param {array} campaignIds - List of campaign IDs to analyze
 * @returns {object} Campaign performance data
 */
async function getCampaignAnalytics(agencyId, campaignIds = []) {
    try {
        // Build query for campaign performance
        let query = supabase
            .from('lead_analytics')
            .select(`
                campaign_id,
                campaign_name,
                date,
                total_leads,
                sold_leads,
                total_cost,
                total_revenue,
                conversion_rate,
                cost_per_lead,
                cost_per_sale,
                roi_percentage
            `)
            .eq('agency_id', agencyId)
            .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Last 30 days
        
        if (campaignIds.length > 0) {
            query = query.in('campaign_id', campaignIds);
        }
        
        const { data: analytics, error } = await query.order('date', { ascending: false });
        
        if (error) {
            throw new Error(`Analytics query error: ${error.message}`);
        }
        
        // Aggregate campaign performance
        const campaignStats = {};
        
        analytics?.forEach(record => {
            const campaignId = record.campaign_id;
            
            if (!campaignStats[campaignId]) {
                campaignStats[campaignId] = {
                    campaign_id: campaignId,
                    campaign_name: record.campaign_name,
                    total_leads: 0,
                    total_sold: 0,
                    total_cost: 0,
                    total_revenue: 0,
                    days_active: 0,
                    best_day: null,
                    worst_day: null,
                    avg_daily_leads: 0,
                    overall_conversion_rate: 0,
                    overall_roi: 0
                };
            }
            
            const stats = campaignStats[campaignId];
            stats.total_leads += record.total_leads || 0;
            stats.total_sold += record.sold_leads || 0;
            stats.total_cost += parseFloat(record.total_cost || 0);
            stats.total_revenue += parseFloat(record.total_revenue || 0);
            stats.days_active += 1;
            
            // Track best/worst performing days
            if (!stats.best_day || record.conversion_rate > stats.best_day.conversion_rate) {
                stats.best_day = {
                    date: record.date,
                    leads: record.total_leads,
                    conversion_rate: record.conversion_rate,
                    revenue: record.total_revenue
                };
            }
            
            if (!stats.worst_day || record.conversion_rate < stats.worst_day.conversion_rate) {
                stats.worst_day = {
                    date: record.date,
                    leads: record.total_leads,
                    conversion_rate: record.conversion_rate,
                    revenue: record.total_revenue
                };
            }
        });
        
        // Calculate derived metrics
        Object.values(campaignStats).forEach(stats => {
            stats.avg_daily_leads = stats.days_active > 0 ? stats.total_leads / stats.days_active : 0;
            stats.overall_conversion_rate = stats.total_leads > 0 ? (stats.total_sold / stats.total_leads) * 100 : 0;
            stats.overall_roi = stats.total_cost > 0 ? ((stats.total_revenue - stats.total_cost) / stats.total_cost) * 100 : 0;
        });
        
        return {
            summary: {
                total_campaigns: Object.keys(campaignStats).length,
                total_leads: Object.values(campaignStats).reduce((sum, stats) => sum + stats.total_leads, 0),
                total_revenue: Object.values(campaignStats).reduce((sum, stats) => sum + stats.total_revenue, 0),
                overall_roi: Object.values(campaignStats).reduce((sum, stats) => sum + stats.overall_roi, 0) / Math.max(Object.keys(campaignStats).length, 1)
            },
            campaigns: Object.values(campaignStats)
        };
        
    } catch (error) {
        console.error('Error getting campaign analytics:', error);
        throw error;
    }
}

/**
 * Main campaigns endpoint handler
 */
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use GET to fetch campaigns.' 
        });
    }
    
    try {
        const { agencyId, includeAnalytics = 'false' } = req.query;
        
        if (!agencyId) {
            return res.status(400).json({
                success: false,
                error: 'Agency ID is required as query parameter'
            });
        }
        
        console.log(`Fetching campaigns for agency: ${agencyId}`);
        
        // Get agency integration record
        const { data: integration, error: integrationError } = await supabase
            .from('agency_integrations')
            .select('*')
            .eq('agency_id', agencyId)
            .eq('integration_type', 'convoso')
            .eq('is_active', true)
            .single();
        
        if (integrationError || !integration) {
            return res.status(404).json({
                success: false,
                error: 'No active Convoso integration found for this agency',
                details: integrationError?.message
            });
        }
        
        if (integration.onboarding_status !== 'validated' && integration.onboarding_status !== 'active') {
            return res.status(400).json({
                success: false,
                error: 'Convoso integration is not properly configured',
                status: integration.onboarding_status
            });
        }
        
        // Decrypt credentials
        const credentials = {
            apiKey: decrypt(integration.encrypted_api_key, agencyId),
            accountId: integration.encrypted_account_id ? decrypt(integration.encrypted_account_id, agencyId) : null
        };
        
        // Fetch campaigns from Convoso API
        const campaigns = await fetchConvosoCampaigns(credentials);
        
        let analytics = null;
        if (includeAnalytics === 'true') {
            const campaignIds = campaigns.map(c => c.id);
            analytics = await getCampaignAnalytics(agencyId, campaignIds);
        }
        
        // Update last validation timestamp
        await supabase
            .from('agency_integrations')
            .update({ last_validation_at: new Date().toISOString() })
            .eq('agency_id', agencyId);
        
        console.log(`Successfully fetched ${campaigns.length} campaigns for agency: ${agencyId}`);
        
        res.status(200).json({
            success: true,
            agencyId,
            campaigns,
            analytics,
            integration: {
                status: integration.onboarding_status,
                webhook_url: integration.webhook_url,
                last_validation: integration.last_validation_at
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Campaigns endpoint error:', error);
        
        res.status(500).json({
            success: false,
            error: 'Failed to fetch campaigns',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString()
        });
    }
}

// Export for testing
export const _internal = {
    fetchConvosoCampaigns,
    getCampaignAnalytics
};