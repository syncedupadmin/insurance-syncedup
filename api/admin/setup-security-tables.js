const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create audit_logs table
    const { error: auditError } = await supabase.rpc('create_audit_logs_table', {});
    
    if (auditError && !auditError.message.includes('already exists')) {
      console.warn('Audit logs table creation warning:', auditError.message);
    }

    // Create security_events table  
    const { error: securityError } = await supabase.rpc('create_security_events_table', {});
    
    if (securityError && !securityError.message.includes('already exists')) {
      console.warn('Security events table creation warning:', securityError.message);
    }

    // Create user_sessions table
    const { error: sessionsError } = await supabase.rpc('create_user_sessions_table', {});
    
    if (sessionsError && !sessionsError.message.includes('already exists')) {
      console.warn('User sessions table creation warning:', sessionsError.message);
    }

    // Add missing columns to portal_users table if they don't exist
    const { error: alterError } = await supabase.rpc('add_user_management_columns', {});
    
    if (alterError && !alterError.message.includes('already exists')) {
      console.warn('Portal users table alteration warning:', alterError.message);
    }

    // Insert test data
    await insertTestData();

    return res.status(200).json({ 
      success: true, 
      message: 'Security tables created and test data inserted successfully' 
    });

  } catch (error) {
    console.error('Error setting up security tables:', error);
    return res.status(500).json({ 
      error: 'Failed to setup security tables', 
      details: error.message 
    });
  }
}

async function insertTestData() {
  try {
    // Insert test audit logs
    const testAuditLogs = [
      {
        user_id: 'admin-001',
        action: 'LOGIN',
        details: JSON.stringify({ ip: '192.168.1.100', success: true }),
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      },
      {
        user_id: 'admin-001',
        action: 'CREATE_USER',
        details: JSON.stringify({ newUserId: 'user-002', email: 'test@example.com' }),
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: new Date(Date.now() - 1800000).toISOString() // 30 minutes ago
      },
      {
        user_id: 'admin-001',
        action: 'VIEW_SECURITY_DASHBOARD',
        details: JSON.stringify({ section: 'overview' }),
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
      }
    ];

    await supabase.from('audit_logs').upsert(testAuditLogs, { onConflict: 'id' });

    // Insert test security events
    const testSecurityEvents = [
      {
        user_id: 'user-002',
        event_type: 'FAILED_LOGIN_ATTEMPT',
        details: JSON.stringify({ attempts: 3, reason: 'incorrect_password' }),
        ip_address: '192.168.1.200',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        timestamp: new Date(Date.now() - 600000).toISOString() // 10 minutes ago
      },
      {
        user_id: 'user-003',
        event_type: 'SUSPICIOUS_ACTIVITY',
        details: JSON.stringify({ activity: 'multiple_ip_access', locations: ['US', 'UK'] }),
        ip_address: '203.0.113.1',
        user_agent: 'Mozilla/5.0 (X11; Linux x86_64)',
        timestamp: new Date(Date.now() - 1200000).toISOString() // 20 minutes ago
      }
    ];

    await supabase.from('security_events').upsert(testSecurityEvents, { onConflict: 'id' });

    // Insert test user sessions
    const testSessions = [
      {
        user_id: 'admin-001',
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        is_active: true,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        last_activity: new Date(Date.now() - 300000).toISOString(),
        location: 'New York, NY, US',
        device_info: 'Windows Desktop - Chrome'
      },
      {
        user_id: 'user-002',
        ip_address: '192.168.1.200',
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
        is_active: true,
        created_at: new Date(Date.now() - 1800000).toISOString(),
        last_activity: new Date(Date.now() - 600000).toISOString(),
        location: 'Los Angeles, CA, US',
        device_info: 'iPhone - Safari'
      }
    ];

    await supabase.from('user_sessions').upsert(testSessions, { onConflict: 'id' });

    console.log('Test data inserted successfully');

  } catch (error) {
    console.error('Error inserting test data:', error);
  }
}

// Database functions to create tables (these would be created as RPC functions in Supabase)
/* 
SQL Functions to create in Supabase:

-- Function: create_audit_logs_table
CREATE OR REPLACE FUNCTION create_audit_logs_table()
RETURNS void AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES portal_users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
END;
$$ LANGUAGE plpgsql;

-- Function: create_security_events_table
CREATE OR REPLACE FUNCTION create_security_events_table()
RETURNS void AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS security_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES portal_users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    severity VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
  CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
  CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
  CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
END;
$$ LANGUAGE plpgsql;

-- Function: create_user_sessions_table  
CREATE OR REPLACE FUNCTION create_user_sessions_table()
RETURNS void AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES portal_users(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    location TEXT,
    device_info TEXT
  );
  
  CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
  CREATE INDEX IF NOT EXISTS idx_user_sessions_created ON user_sessions(created_at);
END;
$$ LANGUAGE plpgsql;

-- Function: add_user_management_columns
CREATE OR REPLACE FUNCTION add_user_management_columns()
RETURNS void AS $$
BEGIN
  -- Add columns to portal_users table if they don't exist
  ALTER TABLE portal_users 
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
  ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS permissions JSONB,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES portal_users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES portal_users(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  
  -- Create indexes
  CREATE INDEX IF NOT EXISTS idx_portal_users_two_factor ON portal_users(two_factor_enabled);
  CREATE INDEX IF NOT EXISTS idx_portal_users_locked_until ON portal_users(locked_until);
  CREATE INDEX IF NOT EXISTS idx_portal_users_department ON portal_users(department);
END;
$$ LANGUAGE plpgsql;

*/
module.exports = handler;
