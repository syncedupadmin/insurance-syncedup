const { createClient } = require('@supabase/supabase-js');
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Sample test data
const SAMPLE_USERS = [
  {
    email: 'john.agent@phsagency.com',
    name: 'John Agent',
    role: 'agent',
    department: 'Sales',
    agent_code: 'JA001',
    is_active: true
  },
  {
    email: 'sarah.manager@phsagency.com', 
    name: 'Sarah Manager',
    role: 'manager',
    department: 'Sales',
    is_active: true
  },
  {
    email: 'mike.support@phsagency.com',
    name: 'Mike Support',
    role: 'customer_service',
    department: 'Customer Service', 
    is_active: true
  },
  {
    email: 'inactive.user@phsagency.com',
    name: 'Inactive User',
    role: 'agent',
    department: 'Sales',
    agent_code: 'IU001',
    is_active: false
  }
];

const SAMPLE_SECURITY_ALERTS = [
  {
    title: 'Brute Force Attack Detected',
    description: 'Multiple failed login attempts detected from IP 203.0.113.10 targeting user accounts',
    severity: 'HIGH',
    status: 'active',
    source: 'Intrusion Detection System',
    timestamp: new Date(Date.now() - 1200000).toISOString() // 20 minutes ago
  },
  {
    title: 'Unusual Login Location',
    description: 'User logged in from a new geographic location (Russia) not seen before',
    severity: 'MEDIUM',
    status: 'active',
    source: 'Geo-Location Monitor',
    timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
  },
  {
    title: 'Malware Upload Blocked',
    description: 'Attempted upload of suspicious file blocked by antivirus scanner',
    severity: 'CRITICAL',
    status: 'resolved',
    source: 'File Scanner',
    timestamp: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
  },
  {
    title: 'Password Policy Violation',
    description: 'User attempted to set weak password not meeting policy requirements',
    severity: 'LOW',
    status: 'resolved',
    source: 'Password Policy Engine',
    timestamp: new Date(Date.now() - 10800000).toISOString() // 3 hours ago
  }
];

const SAMPLE_AUDIT_EVENTS = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED', 
  'PASSWORD_CHANGED',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DELETED',
  'PERMISSION_GRANTED',
  'PERMISSION_REVOKED',
  'DATA_EXPORT',
  'SETTINGS_CHANGED'
];

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No authorization token' });
  }

  try {
    // Verify super admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: currentUser } = await supabase
      .from('portal_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUser || currentUser.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }

    console.log('🌱 Starting test data seeding...');

    // Seed users
    await seedUsers();

    // Seed security data  
    await seedSecurityData();

    // Seed audit logs
    await seedAuditLogs();

    // Seed user sessions
    await seedUserSessions();

    return res.status(200).json({
      success: true,
      message: 'Test data seeded successfully',
      summary: {
        users: SAMPLE_USERS.length,
        securityAlerts: SAMPLE_SECURITY_ALERTS.length,
        auditEvents: 50, // Generated randomly
        userSessions: 10 // Generated randomly
      }
    });

  } catch (error) {
    console.error('Error seeding test data:', error);
    return res.status(500).json({
      error: 'Failed to seed test data',
      details: error.message
    });
  }
}

async function seedUsers() {
  console.log('👥 Seeding sample users...');
  
  for (const userData of SAMPLE_USERS) {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('portal_users')
        .select('id')
        .eq('email', userData.email)
        .single();

      if (!existingUser) {
        // Generate random password
        const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        const { error } = await supabase
          .from('portal_users')
          .insert({
            ...userData,
            password_hash: passwordHash,
            must_change_password: true,
            created_at: new Date().toISOString(),
            two_factor_enabled: Math.random() > 0.7, // 30% have 2FA enabled
            login_attempts: 0
          });

        if (error) {
          console.warn(`Failed to create user ${userData.email}:`, error.message);
        } else {
          console.log(`✅ Created user: ${userData.email} (password: ${tempPassword})`);
        }
      }
    } catch (error) {
      console.warn(`Error processing user ${userData.email}:`, error.message);
    }
  }
}

async function seedSecurityData() {
  console.log('🔒 Seeding security alerts...');

  // Clear existing test security events first
  await supabase
    .from('security_events')
    .delete()
    .like('event_type', 'TEST_%');

  // Insert security alerts as security events
  for (const alert of SAMPLE_SECURITY_ALERTS) {
    try {
      const { error } = await supabase
        .from('security_events')
        .insert({
          event_type: 'SECURITY_ALERT',
          details: JSON.stringify({
            title: alert.title,
            description: alert.description,
            source: alert.source
          }),
          severity: alert.severity.toLowerCase(),
          status: alert.status,
          timestamp: alert.timestamp,
          ip_address: generateRandomIP(),
          user_agent: 'Security System'
        });

      if (error) {
        console.warn('Failed to insert security alert:', error.message);
      }
    } catch (error) {
      console.warn('Error creating security alert:', error.message);
    }
  }

  console.log(`✅ Created ${SAMPLE_SECURITY_ALERTS.length} security alerts`);
}

async function seedAuditLogs() {
  console.log('📋 Seeding audit logs...');

  // Get existing users for audit log references
  const { data: users } = await supabase
    .from('portal_users')
    .select('id')
    .limit(10);

  if (!users || users.length === 0) {
    console.warn('No users found for audit log seeding');
    return;
  }

  // Generate 50 random audit log entries
  const auditLogs = [];
  for (let i = 0; i < 50; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomAction = SAMPLE_AUDIT_EVENTS[Math.floor(Math.random() * SAMPLE_AUDIT_EVENTS.length)];
    const randomTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days

    auditLogs.push({
      user_id: randomUser.id,
      action: randomAction,
      details: JSON.stringify({
        success: Math.random() > 0.1, // 90% success rate
        ip: generateRandomIP(),
        timestamp: randomTime.toISOString()
      }),
      ip_address: generateRandomIP(),
      user_agent: generateRandomUserAgent(),
      timestamp: randomTime.toISOString()
    });
  }

  const { error } = await supabase
    .from('audit_logs')
    .insert(auditLogs);

  if (error) {
    console.warn('Failed to insert audit logs:', error.message);
  } else {
    console.log(`✅ Created ${auditLogs.length} audit log entries`);
  }
}

async function seedUserSessions() {
  console.log('🔗 Seeding user sessions...');

  // Get active users
  const { data: users } = await supabase
    .from('portal_users')
    .select('id, name, role')
    .eq('is_active', true)
    .limit(10);

  if (!users || users.length === 0) {
    console.warn('No active users found for session seeding');
    return;
  }

  // Create sessions for random users
  const sessions = [];
  const sessionCount = Math.min(users.length, 8); // Max 8 sessions

  for (let i = 0; i < sessionCount; i++) {
    const user = users[i];
    const isActive = Math.random() > 0.2; // 80% active sessions
    const createdTime = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000); // Last 24 hours
    const lastActivity = isActive 
      ? new Date(Date.now() - Math.random() * 60 * 60 * 1000) // Last hour
      : new Date(createdTime.getTime() + Math.random() * 60 * 60 * 1000); // Some time after creation

    sessions.push({
      user_id: user.id,
      ip_address: generateRandomIP(),
      user_agent: generateRandomUserAgent(),
      is_active: isActive,
      created_at: createdTime.toISOString(),
      last_activity: lastActivity.toISOString(),
      ended_at: isActive ? null : lastActivity.toISOString(),
      location: generateRandomLocation(),
      device_info: generateRandomDevice()
    });
  }

  const { error } = await supabase
    .from('user_sessions')
    .insert(sessions);

  if (error) {
    console.warn('Failed to insert user sessions:', error.message);
  } else {
    console.log(`✅ Created ${sessions.length} user sessions`);
  }
}

// Utility functions for generating random test data
function generateRandomIP() {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function generateRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function generateRandomLocation() {
  const locations = [
    'New York, NY, US',
    'Los Angeles, CA, US', 
    'Chicago, IL, US',
    'Houston, TX, US',
    'Phoenix, AZ, US',
    'Philadelphia, PA, US',
    'San Antonio, TX, US',
    'San Diego, CA, US',
    'Dallas, TX, US',
    'San Jose, CA, US'
  ];
  return locations[Math.floor(Math.random() * locations.length)];
}

function generateRandomDevice() {
  const devices = [
    'Windows Desktop - Chrome',
    'macOS Desktop - Safari', 
    'iPhone - Safari',
    'Android Phone - Chrome',
    'iPad - Safari',
    'Linux Desktop - Firefox',
    'Windows Desktop - Edge',
    'macOS Desktop - Chrome'
  ];
  return devices[Math.floor(Math.random() * devices.length)];
}
module.exports = handler;
