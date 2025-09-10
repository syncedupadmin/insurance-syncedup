# Complete Supabase Database Schema for Insurance.SyncedUp

## Database Tables

### 1. **profiles** (User Management)
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'manager', 'agent', 'customer_service', 'customer')),
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    hire_date DATE,
    department TEXT,
    supervisor_id UUID REFERENCES profiles(id),
    commission_rate DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    avatar_url TEXT,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. **customers** (Customer Information)
```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_number TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    alternate_phone TEXT,
    date_of_birth DATE,
    ssn_last_four TEXT,
    driver_license TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    occupation TEXT,
    employer TEXT,
    annual_income DECIMAL(12,2),
    credit_score INTEGER,
    preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'phone', 'text')),
    assigned_agent_id UUID REFERENCES profiles(id),
    customer_since DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);
```

### 3. **quotes** (Insurance Quotes)
```sql
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES profiles(id),
    quote_type TEXT NOT NULL CHECK (quote_type IN ('auto', 'home', 'life', 'health', 'business')),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'expired', 'converted')),
    
    -- Coverage Details
    coverage_amount DECIMAL(12,2),
    deductible DECIMAL(10,2),
    premium_monthly DECIMAL(10,2),
    premium_annual DECIMAL(10,2),
    
    -- Auto Insurance Specific
    vehicle_year INTEGER,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_vin TEXT,
    
    -- Home Insurance Specific
    property_value DECIMAL(12,2),
    property_type TEXT,
    square_footage INTEGER,
    year_built INTEGER,
    
    -- Life Insurance Specific
    beneficiary_name TEXT,
    beneficiary_relationship TEXT,
    term_length_years INTEGER,
    
    effective_date DATE,
    expiration_date DATE,
    quote_date DATE DEFAULT CURRENT_DATE,
    follow_up_date DATE,
    conversion_date DATE,
    
    discount_amount DECIMAL(10,2),
    discount_reason TEXT,
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. **policies** (Active Insurance Policies)
```sql
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_number TEXT UNIQUE NOT NULL,
    quote_id UUID REFERENCES quotes(id),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES profiles(id),
    policy_type TEXT NOT NULL CHECK (policy_type IN ('auto', 'home', 'life', 'health', 'business')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'expired', 'pending')),
    
    coverage_amount DECIMAL(12,2) NOT NULL,
    deductible DECIMAL(10,2),
    premium_monthly DECIMAL(10,2) NOT NULL,
    premium_annual DECIMAL(10,2) NOT NULL,
    
    effective_date DATE NOT NULL,
    renewal_date DATE NOT NULL,
    cancellation_date DATE,
    
    payment_frequency TEXT CHECK (payment_frequency IN ('monthly', 'quarterly', 'semi-annual', 'annual')),
    auto_renew BOOLEAN DEFAULT true,
    
    documents JSONB,
    terms_conditions TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. **claims** (Insurance Claims)
```sql
CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_number TEXT UNIQUE NOT NULL,
    policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    assigned_adjuster_id UUID REFERENCES profiles(id),
    
    claim_type TEXT NOT NULL,
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'denied', 'paid', 'closed', 'appealed')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    incident_date DATE NOT NULL,
    incident_location TEXT,
    incident_description TEXT NOT NULL,
    police_report_number TEXT,
    
    claim_amount DECIMAL(12,2) NOT NULL,
    approved_amount DECIMAL(12,2),
    deductible_amount DECIMAL(10,2),
    paid_amount DECIMAL(12,2),
    
    adjuster_notes TEXT,
    investigation_notes TEXT,
    
    submitted_date DATE DEFAULT CURRENT_DATE,
    review_date DATE,
    approval_date DATE,
    payment_date DATE,
    closed_date DATE,
    
    supporting_documents JSONB,
    photos JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 6. **payments** (Payment Records)
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number TEXT UNIQUE NOT NULL,
    policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('credit_card', 'debit_card', 'ach', 'check', 'cash', 'wire')),
    payment_type TEXT CHECK (payment_type IN ('premium', 'deductible', 'claim', 'refund', 'adjustment')),
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    
    transaction_id TEXT,
    reference_number TEXT,
    
    payment_date DATE DEFAULT CURRENT_DATE,
    processed_date DATE,
    
    billing_period_start DATE,
    billing_period_end DATE,
    
    late_fee DECIMAL(8,2),
    processing_fee DECIMAL(8,2),
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 7. **commissions** (Agent Commissions)
```sql
CREATE TABLE commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    policy_id UUID REFERENCES policies(id),
    quote_id UUID REFERENCES quotes(id),
    
    commission_type TEXT CHECK (commission_type IN ('new_sale', 'renewal', 'referral', 'bonus')),
    amount DECIMAL(10,2) NOT NULL,
    rate DECIMAL(5,2),
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    
    earned_date DATE DEFAULT CURRENT_DATE,
    approved_date DATE,
    paid_date DATE,
    
    approved_by UUID REFERENCES profiles(id),
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 8. **activities** (Activity Logging)
```sql
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    description TEXT NOT NULL,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 9. **notifications** (System Notifications)
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    action_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 10. **messages** (Internal Messaging)
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    parent_message_id UUID REFERENCES messages(id),
    attachments JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 11. **documents** (Document Management)
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT CHECK (category IN ('policy', 'claim', 'quote', 'identification', 'proof', 'other')),
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    policy_id UUID REFERENCES policies(id),
    claim_id UUID REFERENCES claims(id),
    quote_id UUID REFERENCES quotes(id),
    
    uploaded_by UUID REFERENCES profiles(id),
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES profiles(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    
    expiration_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 12. **tasks** (Task Management)
```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES profiles(id),
    assigned_by UUID REFERENCES profiles(id),
    
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    
    category TEXT,
    related_entity_type TEXT,
    related_entity_id UUID,
    
    due_date DATE,
    completed_date DATE,
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 13. **reports** (Generated Reports)
```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    parameters JSONB,
    generated_by UUID REFERENCES profiles(id),
    file_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 14. **settings** (System Settings)
```sql
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category, key)
);
```

### 15. **audit_logs** (Audit Trail)
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES profiles(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);
```

## Row Level Security (RLS) Policies

### Enable RLS on all tables
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
```

### Example RLS Policies

#### Profiles Table
```sql
-- Super admins can see all profiles
CREATE POLICY "Super admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

-- Managers can view their team
CREATE POLICY "Managers can view team profiles" ON profiles
    FOR SELECT USING (
        supervisor_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('manager', 'admin')
        )
    );
```

#### Customers Table
```sql
-- Agents can view their assigned customers
CREATE POLICY "Agents view assigned customers" ON customers
    FOR SELECT USING (
        assigned_agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'customer_service')
        )
    );

-- Agents can create customers
CREATE POLICY "Agents create customers" ON customers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('agent', 'admin', 'super_admin', 'manager')
        )
    );
```

#### Quotes Table
```sql
-- Agents can manage their own quotes
CREATE POLICY "Agents manage own quotes" ON quotes
    FOR ALL USING (
        agent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager')
        )
    );
```

## Indexes for Performance

```sql
-- Profiles
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_supervisor_id ON profiles(supervisor_id);
CREATE INDEX idx_profiles_email ON profiles(email);

-- Customers
CREATE INDEX idx_customers_assigned_agent ON customers(assigned_agent_id);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_email ON customers(email);

-- Quotes
CREATE INDEX idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX idx_quotes_agent_id ON quotes(agent_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_quote_type ON quotes(quote_type);

-- Policies
CREATE INDEX idx_policies_customer_id ON policies(customer_id);
CREATE INDEX idx_policies_agent_id ON policies(agent_id);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_renewal_date ON policies(renewal_date);

-- Claims
CREATE INDEX idx_claims_policy_id ON claims(policy_id);
CREATE INDEX idx_claims_customer_id ON claims(customer_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_assigned_adjuster ON claims(assigned_adjuster_id);

-- Payments
CREATE INDEX idx_payments_policy_id ON payments(policy_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);

-- Commissions
CREATE INDEX idx_commissions_agent_id ON commissions(agent_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_commissions_earned_date ON commissions(earned_date);

-- Activities
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_created_at ON activities(created_at);
CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Messages
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_is_read ON messages(is_read);

-- Tasks
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
```

## Database Functions

### Auto-update updated_at timestamp
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
-- Repeat for all tables with updated_at column
```

### Generate unique numbers
```sql
-- Generate customer number
CREATE OR REPLACE FUNCTION generate_customer_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'CUST-' || LPAD(nextval('customer_number_seq')::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate quote number
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'QT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('quote_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate policy number
CREATE OR REPLACE FUNCTION generate_policy_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'POL-' || LPAD(nextval('policy_number_seq')::TEXT, 10, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate claim number
CREATE OR REPLACE FUNCTION generate_claim_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'CLM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('claim_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
```

### Audit trigger function
```sql
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), auth.uid());
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_trigger_policies
    AFTER INSERT OR UPDATE OR DELETE ON policies
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_trigger_claims
    AFTER INSERT OR UPDATE OR DELETE ON claims
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_trigger_payments
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

## Sequences

```sql
CREATE SEQUENCE customer_number_seq START 10000;
CREATE SEQUENCE quote_number_seq START 1000;
CREATE SEQUENCE policy_number_seq START 100000;
CREATE SEQUENCE claim_number_seq START 1000;
CREATE SEQUENCE payment_number_seq START 1000;
```

## Views for Common Queries

### Active Policies View
```sql
CREATE VIEW active_policies_view AS
SELECT 
    p.*,
    c.first_name || ' ' || c.last_name as customer_name,
    c.email as customer_email,
    pr.full_name as agent_name
FROM policies p
JOIN customers c ON p.customer_id = c.id
LEFT JOIN profiles pr ON p.agent_id = pr.id
WHERE p.status = 'active';
```

### Agent Performance View
```sql
CREATE VIEW agent_performance_view AS
SELECT 
    p.id as agent_id,
    p.full_name as agent_name,
    COUNT(DISTINCT q.id) as total_quotes,
    COUNT(DISTINCT pol.id) as total_policies,
    SUM(c.amount) as total_commissions,
    AVG(cust.credit_score) as avg_customer_credit_score
FROM profiles p
LEFT JOIN quotes q ON q.agent_id = p.id
LEFT JOIN policies pol ON pol.agent_id = p.id
LEFT JOIN commissions c ON c.agent_id = p.id
LEFT JOIN customers cust ON cust.assigned_agent_id = p.id
WHERE p.role = 'agent'
GROUP BY p.id, p.full_name;
```

### Claims Summary View
```sql
CREATE VIEW claims_summary_view AS
SELECT 
    cl.*,
    c.first_name || ' ' || c.last_name as customer_name,
    p.policy_number,
    p.policy_type,
    pr.full_name as adjuster_name
FROM claims cl
JOIN customers c ON cl.customer_id = c.id
JOIN policies p ON cl.policy_id = p.id
LEFT JOIN profiles pr ON cl.assigned_adjuster_id = pr.id;
```

## Storage Buckets

```sql
-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES 
    ('documents', 'documents', false),
    ('avatars', 'avatars', true),
    ('claim-photos', 'claim-photos', false),
    ('reports', 'reports', false);

-- Storage policies
CREATE POLICY "Users can upload own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authorized users can upload documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'documents' AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('agent', 'admin', 'super_admin', 'manager', 'customer_service')
        )
    );
```

## Realtime Subscriptions

Enable realtime for specific tables:
```sql
-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE activities;
```

## Initial Data Seeds

```sql
-- Insert default settings
INSERT INTO settings (category, key, value, description, is_public) VALUES
    ('system', 'company_name', '"SyncedUp Insurance"', 'Company name', true),
    ('system', 'support_email', '"support@syncedup.com"', 'Support email', true),
    ('system', 'business_hours', '{"monday": "9-5", "tuesday": "9-5", "wednesday": "9-5", "thursday": "9-5", "friday": "9-5"}', 'Business hours', true),
    ('commission', 'default_rate', '0.10', 'Default commission rate', false),
    ('policy', 'auto_renew_default', 'true', 'Default auto-renewal setting', false);

-- Insert super admin user (update auth.users first via Supabase dashboard)
-- INSERT INTO profiles (id, email, full_name, role) VALUES
--     ('your-auth-user-id', 'admin@syncedup.com', 'Super Admin', 'super_admin');
```

## Backup and Maintenance

### Regular Maintenance Tasks
1. **Daily**: Backup database
2. **Weekly**: Analyze table statistics
3. **Monthly**: Review and optimize slow queries
4. **Quarterly**: Review and update RLS policies

### Backup Strategy
```sql
-- Use Supabase's built-in backup features
-- Additionally, create manual backups:
pg_dump -h [host] -U [user] -d [database] > backup_$(date +%Y%m%d).sql
```

---
*Last Updated: 2025-09-09*
*This schema provides a complete insurance management system with proper relationships, security, and performance optimizations.*