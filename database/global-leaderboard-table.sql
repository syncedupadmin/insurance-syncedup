-- Global Leaderboard Table
-- Stores anonymized performance data for global competition

CREATE TABLE IF NOT EXISTS global_leaderboard (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    
    -- Display information (respects privacy settings)
    display_name TEXT,
    real_name TEXT,
    show_real_name BOOLEAN DEFAULT false,
    agency_name TEXT,
    show_agency_name BOOLEAN DEFAULT false,
    
    -- Performance metrics
    total_sales DECIMAL(12,2) DEFAULT 0,
    policies_count INTEGER DEFAULT 0,
    customer_satisfaction DECIMAL(3,2), -- Rating out of 5.00
    
    -- Rankings (calculated)
    rank_sales INTEGER,
    rank_policies INTEGER,
    rank_satisfaction INTEGER,
    
    -- Time period tracking
    period TEXT NOT NULL, -- 'weekly', 'monthly', 'quarterly', 'yearly'
    period_filter TEXT NOT NULL, -- '2024-01', '2024-Q1', '2024', etc.
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_global_leaderboard_period ON global_leaderboard(period, period_filter);
CREATE INDEX IF NOT EXISTS idx_global_leaderboard_sales_rank ON global_leaderboard(rank_sales);
CREATE INDEX IF NOT EXISTS idx_global_leaderboard_policies_rank ON global_leaderboard(rank_policies);
CREATE INDEX IF NOT EXISTS idx_global_leaderboard_agent ON global_leaderboard(agent_id);
CREATE INDEX IF NOT EXISTS idx_global_leaderboard_agency ON global_leaderboard(agency_id);
CREATE INDEX IF NOT EXISTS idx_global_leaderboard_updated ON global_leaderboard(updated_at DESC);

-- Composite index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_global_leaderboard_period_rank ON global_leaderboard(period, period_filter, rank_sales);

-- Enable RLS (Row Level Security)
ALTER TABLE global_leaderboard ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read the leaderboard (public API)
CREATE POLICY "Global leaderboard is publicly readable" ON global_leaderboard
    FOR SELECT
    USING (true);

-- Policy: Only system/admin can insert/update leaderboard data
CREATE POLICY "Only system can modify leaderboard" ON global_leaderboard
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('super_admin', 'system')
            AND users.is_active = true
        )
    );

-- Leaderboard Settings Table
CREATE TABLE IF NOT EXISTS leaderboard_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE UNIQUE,
    
    -- Participation settings
    enabled BOOLEAN DEFAULT false,
    anonymize_names BOOLEAN DEFAULT true,
    anonymize_agency BOOLEAN DEFAULT true,
    
    -- Category participation
    participate_sales BOOLEAN DEFAULT true,
    participate_policies BOOLEAN DEFAULT true,
    participate_satisfaction BOOLEAN DEFAULT false,
    
    -- Display preferences
    show_in_public BOOLEAN DEFAULT true,
    show_performance_tier BOOLEAN DEFAULT true,
    
    -- Update frequency
    update_frequency TEXT DEFAULT 'daily', -- 'hourly', 'daily', 'weekly'
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for leaderboard settings
CREATE INDEX IF NOT EXISTS idx_leaderboard_settings_agency ON leaderboard_settings(agency_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_settings_enabled ON leaderboard_settings(enabled);

-- Enable RLS for leaderboard settings
ALTER TABLE leaderboard_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Agencies can manage their own leaderboard settings
CREATE POLICY "Agencies manage own leaderboard settings" ON leaderboard_settings
    FOR ALL
    USING (
        agency_id IN (
            SELECT agency_id FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
            AND users.is_active = true
        )
    );

-- Policy: Super admins can view all settings
CREATE POLICY "Super admins view all leaderboard settings" ON leaderboard_settings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
            AND users.is_active = true
        )
    );

-- Function to update leaderboard rankings
CREATE OR REPLACE FUNCTION update_leaderboard_rankings()
RETURNS void AS $$
BEGIN
    -- Update sales rankings
    WITH sales_ranks AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (PARTITION BY period, period_filter ORDER BY total_sales DESC) as new_rank
        FROM global_leaderboard
    )
    UPDATE global_leaderboard 
    SET rank_sales = sales_ranks.new_rank
    FROM sales_ranks 
    WHERE global_leaderboard.id = sales_ranks.id;
    
    -- Update policy count rankings
    WITH policy_ranks AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (PARTITION BY period, period_filter ORDER BY policies_count DESC) as new_rank
        FROM global_leaderboard
    )
    UPDATE global_leaderboard 
    SET rank_policies = policy_ranks.new_rank
    FROM policy_ranks 
    WHERE global_leaderboard.id = policy_ranks.id;
    
    -- Update satisfaction rankings
    WITH satisfaction_ranks AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (PARTITION BY period, period_filter ORDER BY customer_satisfaction DESC NULLS LAST) as new_rank
        FROM global_leaderboard
        WHERE customer_satisfaction IS NOT NULL
    )
    UPDATE global_leaderboard 
    SET rank_satisfaction = satisfaction_ranks.new_rank
    FROM satisfaction_ranks 
    WHERE global_leaderboard.id = satisfaction_ranks.id;
    
    -- Update timestamp
    UPDATE global_leaderboard SET updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update rankings when data changes
CREATE OR REPLACE FUNCTION trigger_update_rankings()
RETURNS trigger AS $$
BEGIN
    -- Schedule ranking update (could be done asynchronously)
    PERFORM update_leaderboard_rankings();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic ranking updates
DROP TRIGGER IF EXISTS auto_update_leaderboard_rankings ON global_leaderboard;
CREATE TRIGGER auto_update_leaderboard_rankings
    AFTER INSERT OR UPDATE OF total_sales, policies_count, customer_satisfaction
    ON global_leaderboard
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_update_rankings();

-- Sample data for testing (optional)
-- Note: This would normally be populated by a scheduled job that aggregates real sales data

INSERT INTO leaderboard_settings (agency_id, enabled, anonymize_names, participate_sales) 
SELECT id, true, true, true 
FROM agencies 
WHERE agencies.subscription_plan IN ('professional', 'enterprise')
ON CONFLICT (agency_id) DO NOTHING;

-- Function to generate sample leaderboard data (for testing)
CREATE OR REPLACE FUNCTION generate_sample_leaderboard_data()
RETURNS void AS $$
DECLARE
    current_month TEXT := to_char(NOW(), 'YYYY-MM');
    agent_record RECORD;
    rank_counter INTEGER := 1;
BEGIN
    -- Clear existing sample data for current month
    DELETE FROM global_leaderboard 
    WHERE period = 'monthly' 
    AND period_filter = current_month;
    
    -- Generate sample data for active agents whose agencies participate
    FOR agent_record IN 
        SELECT DISTINCT
            u.id as agent_id,
            u.name,
            a.id as agency_id,
            a.name as agency_name,
            ls.anonymize_names,
            ls.anonymize_agency
        FROM users u
        JOIN agencies a ON u.agency_id = a.id
        LEFT JOIN leaderboard_settings ls ON a.id = ls.agency_id
        WHERE u.role = 'agent' 
        AND u.is_active = true
        AND a.is_active = true
        AND (ls.enabled IS NULL OR ls.enabled = true)
        ORDER BY RANDOM()
        LIMIT 50
    LOOP
        INSERT INTO global_leaderboard (
            agent_id,
            agency_id,
            display_name,
            real_name,
            show_real_name,
            agency_name,
            show_agency_name,
            total_sales,
            policies_count,
            customer_satisfaction,
            period,
            period_filter,
            period_start,
            period_end
        ) VALUES (
            agent_record.agent_id,
            agent_record.agency_id,
            CASE WHEN agent_record.anonymize_names THEN NULL ELSE agent_record.name END,
            agent_record.name,
            NOT COALESCE(agent_record.anonymize_names, true),
            agent_record.agency_name,
            NOT COALESCE(agent_record.anonymize_agency, true),
            (random() * 150000)::DECIMAL(12,2), -- Random sales 0-150k
            (random() * 100 + 5)::INTEGER, -- Random policies 5-105
            (random() * 2 + 3)::DECIMAL(3,2), -- Random satisfaction 3.0-5.0
            'monthly',
            current_month,
            date_trunc('month', NOW()),
            date_trunc('month', NOW()) + interval '1 month' - interval '1 day'
        );
        
        rank_counter := rank_counter + 1;
    END LOOP;
    
    -- Update rankings
    PERFORM update_leaderboard_rankings();
END;
$$ LANGUAGE plpgsql;

-- Uncomment to generate sample data
-- SELECT generate_sample_leaderboard_data();