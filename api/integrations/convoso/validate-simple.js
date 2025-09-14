import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { agencyId, credentials } = req.body;
        
        if (!agencyId || !credentials?.apiKey) {
            return res.status(400).json({
                error: 'Agency ID and API key are required'
            });
        }
        
        console.log(`Creating simple integration for agency: ${agencyId}`);
        
        // Simple validation (just format checks)
        const validation = {
            valid: credentials.apiKey.length >= 10,
            tests: {
                apiKeyFormat: credentials.apiKey.length >= 10,
                webhookSecretFormat: !credentials.webhookSecret || credentials.webhookSecret.length >= 8,
                accountIdFormat: !credentials.accountId || credentials.accountId.length >= 3
            }
        };
        
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: 'Credential validation failed',
                validation
            });
        }
        
        // Store without encryption for testing
        const webhookUrl = `https://insurance.syncedupsolutions.com/api/leads/convoso-webhook/${agencyId}`;
        
        const { data, error } = await supabase
            .from('agency_integrations')
            .upsert({
                agency_id: agencyId,
                agency_name: `Agency ${agencyId}`,
                integration_type: 'convoso',
                is_active: true,
                encrypted_api_key: `TEMP_${credentials.apiKey}`, // Temporary, not actually encrypted
                encrypted_webhook_secret: credentials.webhookSecret ? `TEMP_${credentials.webhookSecret}` : null,
                encrypted_account_id: credentials.accountId ? `TEMP_${credentials.accountId}` : null,
                encryption_key_id: 'temp_v1',
                webhook_url: webhookUrl,
                onboarding_status: 'validated',
                last_validation_at: new Date().toISOString(),
                integration_settings: {
                    test_mode: true,
                    setup_date: new Date().toISOString()
                },
                created_by: 1,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'agency_id'
            });
        
        if (error) {
            throw new Error(`Database error: ${error.message}`);
        }
        
        console.log(`Integration created successfully for agency: ${agencyId}`);
        
        res.status(200).json({
            success: true,
            agencyId,
            validation,
            integration: {
                status: 'validated',
                webhook_url: webhookUrl
            },
            note: 'This is a temporary implementation for testing. Production version uses AES-256 encryption.'
        });
        
    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}