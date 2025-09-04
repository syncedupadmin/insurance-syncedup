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
        
        // Mock campaign data for development
        const mockCampaigns = [
            {
                id: 'CAMP_AUTO_001',
                name: 'Auto Insurance - Q1 2025',
                type: 'auto_insurance',
                status: 'active',
                description: 'High-intent auto insurance leads',
                target_audience: 'Adults 25-65 with vehicles',
                daily_lead_capacity: 100,
                cost_per_lead: 25.00,
                quality_score: 85,
                conversion_rate: 12.5,
                created_date: '2024-12-01T00:00:00Z',
                updated_date: '2025-01-15T10:30:00Z',
                settings: {
                    geo_targeting: ['CA', 'TX', 'FL', 'NY'],
                    age_range: [25, 65],
                    income_minimum: 40000,
                    lead_delivery_method: 'webhook',
                    lead_fields: ['first_name', 'last_name', 'phone', 'email', 'vehicle_year', 'vehicle_make']
                },
                stats: {
                    total_leads_delivered: 2847,
                    avg_monthly_volume: 950,
                    top_converting_states: ['TX', 'FL', 'CA']
                }
            },
            {
                id: 'CAMP_HOME_002',
                name: 'Home Insurance - Premium',
                type: 'home_insurance', 
                status: 'active',
                description: 'Homeowners seeking competitive rates',
                target_audience: 'Homeowners with $200k+ property value',
                daily_lead_capacity: 50,
                cost_per_lead: 35.00,
                quality_score: 92,
                conversion_rate: 15.8,
                created_date: '2024-11-15T00:00:00Z',
                updated_date: '2025-01-10T14:20:00Z',
                settings: {
                    geo_targeting: ['CA', 'TX', 'FL', 'NY', 'IL'],
                    age_range: [30, 70],
                    property_value_minimum: 200000,
                    lead_delivery_method: 'webhook',
                    lead_fields: ['first_name', 'last_name', 'phone', 'email', 'property_value', 'current_carrier', 'coverage_type']
                },
                stats: {
                    total_leads_delivered: 1456,
                    avg_monthly_volume: 485,
                    top_converting_states: ['CA', 'TX', 'NY']
                }
            },
            {
                id: 'CAMP_LIFE_003',
                name: 'Life Insurance - Family Protection',
                type: 'life_insurance',
                status: 'active',
                description: 'Family-focused life insurance prospects',
                target_audience: 'Adults 25-55 with dependents',
                daily_lead_capacity: 30,
                cost_per_lead: 45.00,
                quality_score: 88,
                conversion_rate: 8.2,
                created_date: '2024-10-01T00:00:00Z',
                updated_date: '2025-01-08T09:15:00Z',
                settings: {
                    geo_targeting: ['CA', 'TX', 'FL', 'NY', 'IL', 'PA'],
                    age_range: [25, 55],
                    income_minimum: 50000,
                    lead_delivery_method: 'webhook',
                    lead_fields: ['first_name', 'last_name', 'phone', 'email', 'annual_income', 'dependents', 'coverage_amount']
                },
                stats: {
                    total_leads_delivered: 892,
                    avg_monthly_volume: 297,
                    top_converting_states: ['FL', 'TX', 'CA']
                }
            },
            {
                id: 'CAMP_HEALTH_004',
                name: 'Health Insurance - ACA Plans',
                type: 'health_insurance',
                status: 'paused',
                description: 'Affordable Care Act marketplace leads',
                target_audience: 'Individuals and families seeking health coverage',
                daily_lead_capacity: 75,
                cost_per_lead: 30.00,
                quality_score: 76,
                conversion_rate: 9.8,
                created_date: '2024-09-01T00:00:00Z',
                updated_date: '2024-12-20T16:45:00Z',
                settings: {
                    geo_targeting: ['TX', 'FL', 'GA', 'NC', 'AZ'],
                    age_range: [18, 64],
                    income_maximum: 75000,
                    lead_delivery_method: 'webhook',
                    lead_fields: ['first_name', 'last_name', 'phone', 'email', 'household_size', 'annual_income', 'current_coverage']
                },
                stats: {
                    total_leads_delivered: 2134,
                    avg_monthly_volume: 710,
                    top_converting_states: ['TX', 'FL', 'GA']
                }
            },
            {
                id: 'CAMP_COMMERCIAL_005',
                name: 'Commercial Insurance - Small Business',
                type: 'commercial_insurance',
                status: 'active',
                description: 'Small business insurance needs',
                target_audience: 'Small business owners with 1-50 employees',
                daily_lead_capacity: 20,
                cost_per_lead: 65.00,
                quality_score: 94,
                conversion_rate: 18.5,
                created_date: '2024-08-15T00:00:00Z',
                updated_date: '2025-01-12T11:00:00Z',
                settings: {
                    geo_targeting: ['CA', 'TX', 'FL', 'NY', 'IL', 'PA', 'OH'],
                    business_revenue_minimum: 100000,
                    employee_count_max: 50,
                    lead_delivery_method: 'webhook',
                    lead_fields: ['first_name', 'last_name', 'phone', 'email', 'business_name', 'industry', 'employee_count', 'annual_revenue']
                },
                stats: {
                    total_leads_delivered: 567,
                    avg_monthly_volume: 189,
                    top_converting_states: ['CA', 'TX', 'FL']
                }
            }
        ];
        
        // Filter active campaigns
        return mockCampaigns.filter(campaign => campaign.status === 'active');
        
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