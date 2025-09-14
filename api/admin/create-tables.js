import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        // Create the basic agency_integrations table structure
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS agency_integrations (
                id SERIAL PRIMARY KEY,
                agency_id VARCHAR(50) NOT NULL UNIQUE,
                agency_name VARCHAR(255) NOT NULL,
                integration_type VARCHAR(50) NOT NULL DEFAULT 'convoso',
                is_active BOOLEAN DEFAULT TRUE,
                encrypted_api_key TEXT NOT NULL,
                encrypted_webhook_secret TEXT,
                encrypted_account_id TEXT,
                encryption_key_id VARCHAR(100) NOT NULL,
                webhook_url TEXT NOT NULL,
                webhook_events TEXT[] DEFAULT ARRAY['lead_created', 'lead_updated'],
                rate_limit_per_minute INTEGER DEFAULT 60,
                rate_limit_per_hour INTEGER DEFAULT 3600,
                max_retries INTEGER DEFAULT 3,
                timeout_seconds INTEGER DEFAULT 30,
                onboarding_status VARCHAR(50) DEFAULT 'pending',
                last_validation_at TIMESTAMP,
                validation_error TEXT,
                integration_settings JSONB DEFAULT '{}',
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        
        // Note: Supabase doesn't allow direct SQL execution via API in most cases
        // Instead, we'll use the REST API to create tables
        
        console.log('Creating agency_integrations table...');
        
        // Try to insert a test record to see if table exists
        const { data, error } = await supabase
            .from('agency_integrations')
            .select('id')
            .limit(1);
            
        if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
            return res.status(500).json({
                success: false,
                error: 'Database tables do not exist. Please create them manually in Supabase dashboard.',
                sql: createTableSQL,
                instructions: [
                    '1. Go to Supabase dashboard',
                    '2. Navigate to SQL editor',
                    '3. Execute the SQL provided in the response',
                    '4. Ensure all tables from convoso-multi-tenant-schema.sql are created'
                ]
            });
        }
        
        return res.status(200).json({
            success: true,
            message: 'Tables exist and are accessible',
            tableExists: true
        });
        
    } catch (error) {
        console.error('Table creation error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}