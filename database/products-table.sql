-- Products Table for FirstEnroll Integration
-- Stores insurance products and plans available for agents to quote and sell

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    carrier TEXT NOT NULL,
    product_type TEXT NOT NULL, -- 'health', 'auto', 'home', 'life', 'dental', 'vision', 'business'
    
    -- Coverage details
    states TEXT[] DEFAULT '{}', -- Array of state abbreviations where product is available
    premium DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL, -- Percentage (e.g., 30.00 for 30%)
    
    -- Health insurance specific fields
    deductible DECIMAL(10,2),
    max_out_of_pocket DECIMAL(10,2),
    copay_primary DECIMAL(6,2),
    copay_specialist DECIMAL(6,2),
    copay_emergency DECIMAL(6,2),
    
    -- Coverage features
    prescription_coverage BOOLEAN DEFAULT false,
    dental_included BOOLEAN DEFAULT false,
    vision_included BOOLEAN DEFAULT false,
    mental_health_coverage BOOLEAN DEFAULT true,
    
    -- Product details
    description TEXT,
    network_type TEXT, -- 'PPO', 'HMO', 'EPO', 'POS'
    metallic_tier TEXT, -- 'Bronze', 'Silver', 'Gold', 'Platinum', 'Catastrophic'
    
    -- Eligibility and requirements
    min_age INTEGER DEFAULT 18,
    max_age INTEGER DEFAULT 99,
    requires_medical_exam BOOLEAN DEFAULT false,
    waiting_period_days INTEGER DEFAULT 0,
    
    -- Pricing modifiers
    age_bands JSONB DEFAULT '{}', -- Age-based pricing multipliers
    state_modifiers JSONB DEFAULT '{}', -- State-specific pricing adjustments
    
    -- Status and availability
    is_active BOOLEAN DEFAULT true,
    effective_date DATE,
    termination_date DATE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_carrier ON products(carrier);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_states ON products USING GIN(states);
CREATE INDEX IF NOT EXISTS idx_products_premium ON products(premium);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_products_active_carrier ON products(is_active, carrier);
CREATE INDEX IF NOT EXISTS idx_products_type_active ON products(product_type, is_active);

-- Enable RLS (Row Level Security)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read active products
CREATE POLICY "Anyone can read active products" ON products
    FOR SELECT
    USING (is_active = true);

-- Policy: Only admins can insert/update/delete products
CREATE POLICY "Only admins can modify products" ON products
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
            AND users.is_active = true
        )
    );

-- Product Categories Table (optional, for better organization)
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key for product categories (optional)
-- ALTER TABLE products ADD COLUMN category_id UUID REFERENCES product_categories(id);

-- Product Pricing History Table (tracks price changes)
CREATE TABLE IF NOT EXISTS product_pricing_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    old_premium DECIMAL(10,2),
    new_premium DECIMAL(10,2),
    old_commission_rate DECIMAL(5,2),
    new_commission_rate DECIMAL(5,2),
    effective_date DATE NOT NULL,
    reason TEXT,
    changed_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_pricing_history_product ON product_pricing_history(product_id);
CREATE INDEX IF NOT EXISTS idx_product_pricing_history_date ON product_pricing_history(effective_date DESC);

-- Insert FirstEnroll demo products
INSERT INTO products (
    id, name, carrier, product_type, states, premium, commission_rate,
    deductible, max_out_of_pocket, copay_primary, copay_specialist,
    prescription_coverage, dental_included, vision_included,
    description, network_type, metallic_tier, is_active
) VALUES 
    (
        'fe-ppo-500',
        'PPO Plan 500',
        'FirstEnroll',
        'health',
        ARRAY['TX', 'FL', 'CA', 'NY', 'IL'],
        149.99,
        30.0,
        500,
        3000,
        25,
        45,
        true,
        false,
        false,
        'Comprehensive PPO health plan with low deductible and nationwide network access',
        'PPO',
        'Gold',
        true
    ),
    (
        'fe-hmo-1000',
        'HMO Plan 1000',
        'FirstEnroll',
        'health',
        ARRAY['TX', 'FL', 'CA'],
        119.99,
        28.0,
        1000,
        4000,
        20,
        40,
        true,
        false,
        false,
        'Affordable HMO plan with network restrictions but comprehensive care coordination',
        'HMO',
        'Silver',
        true
    ),
    (
        'fe-hdhp-2500',
        'High Deductible Health Plan',
        'FirstEnroll',
        'health',
        ARRAY['TX', 'FL', 'CA', 'NY'],
        89.99,
        35.0,
        2500,
        6000,
        0,
        0,
        true,
        true,
        true,
        'HSA-compatible high deductible plan with comprehensive coverage after deductible is met',
        'PPO',
        'Bronze',
        true
    ),
    (
        'fe-bronze-plus',
        'Bronze Plus Plan',
        'FirstEnroll',
        'health',
        ARRAY['TX', 'FL', 'CA', 'NY', 'IL', 'OH'],
        199.99,
        25.0,
        750,
        3500,
        30,
        50,
        true,
        true,
        false,
        'Enhanced bronze plan with added dental benefits and moderate deductible',
        'PPO',
        'Bronze',
        true
    ),
    (
        'fe-platinum-premium',
        'Platinum Premium Plan',
        'FirstEnroll',
        'health',
        ARRAY['CA', 'NY', 'IL'],
        299.99,
        20.0,
        250,
        2000,
        15,
        25,
        true,
        true,
        true,
        'Premium platinum plan with the lowest deductible and comprehensive benefits',
        'PPO',
        'Platinum',
        true
    ),
    (
        'fe-catastrophic-young',
        'Catastrophic Plan (Under 30)',
        'FirstEnroll',
        'health',
        ARRAY['TX', 'FL', 'CA', 'NY', 'IL', 'OH'],
        79.99,
        40.0,
        8550,
        8550,
        0,
        0,
        false,
        false,
        false,
        'Catastrophic coverage for those under 30 or with hardship exemptions',
        'PPO',
        'Catastrophic',
        true
    )
ON CONFLICT (id) DO UPDATE SET
    premium = EXCLUDED.premium,
    commission_rate = EXCLUDED.commission_rate,
    updated_at = NOW();

-- Insert sample product categories
INSERT INTO product_categories (name, description, display_order) VALUES
    ('Health Insurance', 'Individual and family health insurance plans', 1),
    ('Dental Insurance', 'Dental coverage plans', 2),
    ('Vision Insurance', 'Vision and eye care coverage', 3),
    ('Life Insurance', 'Term and whole life insurance products', 4),
    ('Auto Insurance', 'Vehicle insurance coverage', 5),
    ('Home Insurance', 'Homeowners and renters insurance', 6),
    ('Business Insurance', 'Commercial and business insurance products', 7)
ON CONFLICT (name) DO NOTHING;

-- Function to update product pricing with history tracking
CREATE OR REPLACE FUNCTION update_product_pricing(
    product_id_param TEXT,
    new_premium_param DECIMAL(10,2),
    new_commission_rate_param DECIMAL(5,2),
    reason_param TEXT DEFAULT NULL,
    effective_date_param DATE DEFAULT CURRENT_DATE
)
RETURNS BOOLEAN AS $$
DECLARE
    old_premium DECIMAL(10,2);
    old_commission_rate DECIMAL(5,2);
    current_user_id UUID;
BEGIN
    -- Get current values
    SELECT premium, commission_rate INTO old_premium, old_commission_rate
    FROM products WHERE id = product_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found: %', product_id_param;
    END IF;
    
    -- Get current user (if available)
    BEGIN
        current_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;
    
    -- Insert pricing history record
    INSERT INTO product_pricing_history (
        product_id,
        old_premium,
        new_premium,
        old_commission_rate,
        new_commission_rate,
        effective_date,
        reason,
        changed_by
    ) VALUES (
        product_id_param,
        old_premium,
        new_premium_param,
        old_commission_rate,
        new_commission_rate_param,
        effective_date_param,
        reason_param,
        current_user_id
    );
    
    -- Update product pricing
    UPDATE products 
    SET 
        premium = new_premium_param,
        commission_rate = new_commission_rate_param,
        updated_at = NOW(),
        updated_by = current_user_id
    WHERE id = product_id_param;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_products_updated_at();

-- Function to get products by state
CREATE OR REPLACE FUNCTION get_products_by_state(state_code TEXT)
RETURNS SETOF products AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM products 
    WHERE is_active = true 
    AND (states IS NULL OR state_code = ANY(states))
    ORDER BY carrier, premium;
END;
$$ LANGUAGE plpgsql;

-- Function to get FirstEnroll products specifically
CREATE OR REPLACE FUNCTION get_firstenroll_products(state_code TEXT DEFAULT NULL)
RETURNS SETOF products AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM products 
    WHERE is_active = true 
    AND UPPER(carrier) = 'FIRSTENROLL'
    AND (state_code IS NULL OR state_code = ANY(states))
    ORDER BY premium;
END;
$$ LANGUAGE plpgsql;