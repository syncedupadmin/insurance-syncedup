-- Commission Settings Table
-- Stores commission structure configurations for the insurance platform

CREATE TABLE IF NOT EXISTS commission_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    structures JSONB NOT NULL DEFAULT '{}'::jsonb,
    active_structure TEXT DEFAULT 'flat_percentage',
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_commission_settings_updated_at ON commission_settings(updated_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE commission_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read commission settings
CREATE POLICY "Admins can read commission settings" ON commission_settings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
            AND users.is_active = true
        )
    );

-- Policy: Only admins can insert/update commission settings
CREATE POLICY "Admins can modify commission settings" ON commission_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
            AND users.is_active = true
        )
    );

-- Commission History Table (tracks changes to commission structures)
CREATE TABLE IF NOT EXISTS commission_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_id UUID REFERENCES commission_settings(id),
    structure_type TEXT NOT NULL,
    old_config JSONB,
    new_config JSONB,
    changed_by UUID REFERENCES users(id),
    change_type TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'ACTIVATE'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for commission history
CREATE INDEX IF NOT EXISTS idx_commission_history_created_at ON commission_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commission_history_setting_id ON commission_history(setting_id);

-- Enable RLS for commission history
ALTER TABLE commission_history ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read commission history
CREATE POLICY "Admins can read commission history" ON commission_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
            AND users.is_active = true
        )
    );

-- Policy: Only system can insert commission history (via API)
CREATE POLICY "System can insert commission history" ON commission_history
    FOR INSERT
    WITH CHECK (true);

-- Insert default commission structures
INSERT INTO commission_settings (structures, active_structure) 
VALUES (
    '{
        "flat_percentage": {
            "type": "percentage",
            "name": "Flat Percentage",
            "description": "Fixed percentage commission for all sales",
            "rate": 80,
            "active": true
        },
        "tiered": {
            "type": "tiered", 
            "name": "Tiered Commission",
            "description": "Commission rate increases with sales volume",
            "tiers": [
                {"min": 0, "max": 10000, "rate": 70, "description": "$0 - $10,000"},
                {"min": 10001, "max": 25000, "rate": 75, "description": "$10,001 - $25,000"},
                {"min": 25001, "max": null, "rate": 80, "description": "$25,001+"}
            ],
            "active": false
        },
        "product_based": {
            "type": "product",
            "name": "Product-Based Commission", 
            "description": "Different commission rates by insurance product",
            "rates": {
                "auto": 75,
                "home": 80,
                "life": 85,
                "business": 70,
                "health": 75,
                "dental": 70,
                "vision": 65
            },
            "active": false
        },
        "hybrid": {
            "type": "hybrid",
            "name": "Hybrid Commission",
            "description": "Base rate with bonus for high performers", 
            "base_rate": 60,
            "bonus_threshold": 20000,
            "bonus_rate": 85,
            "active": false
        }
    }'::jsonb,
    'flat_percentage'
) ON CONFLICT DO NOTHING;