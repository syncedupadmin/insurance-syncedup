-- Create Missing Tables for Insurance.SyncedUp
-- Run this in your Supabase SQL Editor

-- 1. Create commission_records table (Referenced in APIs but missing)
CREATE TABLE IF NOT EXISTS commission_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    policy_id UUID,
    quote_id UUID REFERENCES quotes(id),
    commission_type TEXT NOT NULL CHECK (commission_type IN ('new_sale', 'renewal', 'referral', 'bonus')),
    sale_amount DECIMAL(12,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(12,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    payment_date DATE,
    payment_method TEXT CHECK (payment_method IN ('direct_deposit', 'check', 'wire')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_by UUID REFERENCES profiles(id),
    approved_date TIMESTAMP WITH TIME ZONE
);

-- 2. Create agencies table (Referenced in super-admin APIs)
CREATE TABLE IF NOT EXISTS agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    primary_contact_name TEXT,
    primary_contact_phone TEXT,
    primary_contact_email TEXT,
    commission_split DECIMAL(5,2),
    monthly_fee DECIMAL(10,2),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    contract_start_date DATE,
    contract_end_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create policies table (For converted quotes)
CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_number TEXT UNIQUE NOT NULL,
    quote_id UUID REFERENCES quotes(id),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES profiles(id),
    policy_type TEXT NOT NULL CHECK (policy_type IN ('auto', 'home', 'life', 'health', 'business')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'suspended', 'pending')),
    premium_monthly DECIMAL(10,2),
    premium_annual DECIMAL(10,2),
    coverage_amount DECIMAL(12,2),
    deductible DECIMAL(10,2),
    effective_date DATE NOT NULL,
    expiration_date DATE NOT NULL,
    renewal_date DATE,
    cancellation_date DATE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create system_metrics table (For tracking real metrics)
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE DEFAULT CURRENT_DATE,
    total_users INTEGER,
    active_users INTEGER,
    new_users_today INTEGER,
    new_users_week INTEGER,
    new_users_month INTEGER,
    total_quotes INTEGER,
    quotes_pending INTEGER,
    quotes_approved INTEGER,
    quotes_converted INTEGER,
    total_policies INTEGER,
    policies_active INTEGER,
    total_claims INTEGER,
    claims_pending INTEGER,
    claims_approved INTEGER,
    revenue_daily DECIMAL(12,2),
    revenue_monthly DECIMAL(12,2),
    revenue_annual DECIMAL(12,2),
    commission_paid_monthly DECIMAL(12,2),
    average_quote_value DECIMAL(10,2),
    conversion_rate DECIMAL(5,2),
    customer_satisfaction DECIMAL(3,2),
    system_uptime DECIMAL(5,2),
    api_response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create audit_logs table (For system auditing)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Insert sample agencies
INSERT INTO agencies (name, code, email, phone, monthly_fee, status) VALUES
    ('Demo Agency', 'DEMO', 'demo@syncedup.com', '555-0100', 99.00, 'active'),
    ('PHS Insurance Agency', 'PHS', 'contact@phsinsurance.com', '555-0200', 299.00, 'active'),
    ('SyncedUp Solutions', 'SYNC', 'admin@syncedupsolutions.com', '555-0300', 999.00, 'active')
ON CONFLICT (name) DO NOTHING;

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_commission_records_agent_id ON commission_records(agent_id);
CREATE INDEX IF NOT EXISTS idx_commission_records_status ON commission_records(status);
CREATE INDEX IF NOT EXISTS idx_commission_records_payment_date ON commission_records(payment_date);
CREATE INDEX IF NOT EXISTS idx_policies_customer_id ON policies(customer_id);
CREATE INDEX IF NOT EXISTS idx_policies_agent_id ON policies(agent_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_metrics_metric_date ON system_metrics(metric_date);

-- 8. Create RLS policies for commission_records
ALTER TABLE commission_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own commissions" ON commission_records
    FOR SELECT USING (auth.uid() = agent_id);

CREATE POLICY "Managers can view all commissions" ON commission_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('manager', 'admin', 'super_admin')
        )
    );

CREATE POLICY "Only admins can modify commissions" ON commission_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- 9. Create RLS policies for agencies
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view agencies" ON agencies
    FOR SELECT USING (true);

CREATE POLICY "Only super admins can modify agencies" ON agencies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
    );

-- 10. Create RLS policies for system_metrics
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view metrics" ON system_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Only system can write metrics" ON system_metrics
    FOR INSERT USING (false);

-- Add some sample commission records for testing
INSERT INTO commission_records (
    agent_id, 
    commission_type, 
    sale_amount, 
    commission_rate, 
    commission_amount, 
    status,
    payment_date
) 
SELECT 
    p.id,
    'new_sale',
    1500.00 + (random() * 3000),
    15.00,
    (1500.00 + (random() * 3000)) * 0.15,
    CASE WHEN random() < 0.7 THEN 'paid' ELSE 'pending' END,
    CASE WHEN random() < 0.7 THEN CURRENT_DATE - INTERVAL '1 month' * (random() * 3)::int ELSE NULL END
FROM profiles p
WHERE p.role = 'agent'
LIMIT 10;

-- Add initial system metrics
INSERT INTO system_metrics (
    total_users,
    active_users,
    new_users_today,
    new_users_week,
    new_users_month,
    total_quotes,
    quotes_pending,
    quotes_approved,
    quotes_converted,
    total_policies,
    policies_active,
    total_claims,
    claims_pending,
    claims_approved,
    revenue_monthly,
    revenue_annual,
    system_uptime,
    conversion_rate
) VALUES (
    (SELECT COUNT(*) FROM profiles),
    (SELECT COUNT(*) FROM profiles WHERE last_login > NOW() - INTERVAL '7 days'),
    1,
    3,
    8,
    (SELECT COUNT(*) FROM quotes),
    (SELECT COUNT(*) FROM quotes WHERE status = 'pending'),
    (SELECT COUNT(*) FROM quotes WHERE status = 'approved'),
    (SELECT COUNT(*) FROM quotes WHERE status = 'converted'),
    (SELECT COUNT(*) FROM policies WHERE EXISTS (SELECT 1 FROM policies)),
    (SELECT COUNT(*) FROM policies WHERE status = 'active' AND EXISTS (SELECT 1 FROM policies)),
    (SELECT COUNT(*) FROM claims WHERE EXISTS (SELECT 1 FROM claims)),
    (SELECT COUNT(*) FROM claims WHERE status = 'pending' AND EXISTS (SELECT 1 FROM claims)),
    (SELECT COUNT(*) FROM claims WHERE status = 'approved' AND EXISTS (SELECT 1 FROM claims)),
    1397.00,
    16764.00,
    99.97,
    23.5
);

COMMIT;