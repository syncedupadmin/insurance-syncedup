import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.NODE_ENV === 'production' 
    ? 'https://insurance.syncedupsolutions.com' 
    : 'http://localhost:3000',
  testUser: {
    email: 'test-admin@phsagency.com',
    password: 'TestAdmin123!',
    name: 'Test Admin User',
    role: 'super_admin'
  }
};

let testResults = [];
let authToken = null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    testResults = [];
    console.log('🧪 Starting Security System Validation Tests...\n');

    // Run all tests
    await testDatabaseConnection();
    await testTableCreation();
    await testUserAuthentication();
    await testUserManagementAPI();
    await testSecurityAPI();
    await testAuditLogging();
    await testDataValidation();

    // Generate test report
    const report = generateTestReport();
    
    return res.status(200).json({
      success: true,
      message: 'Security system validation completed',
      report,
      results: testResults
    });

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Test execution failed',
      details: error.message,
      results: testResults
    });
  }
}

async function testDatabaseConnection() {
  const testName = 'Database Connection';
  console.log(`🔍 Testing: ${testName}`);
  
  try {
    const { data, error } = await supabase
      .from('portal_users')
      .select('count')
      .limit(1);

    if (error) throw error;

    addTestResult(testName, true, 'Database connection successful');
  } catch (error) {
    addTestResult(testName, false, `Database connection failed: ${error.message}`);
  }
}

async function testTableCreation() {
  const testName = 'Security Tables Existence';
  console.log(`🔍 Testing: ${testName}`);
  
  try {
    const tables = ['audit_logs', 'security_events', 'user_sessions'];
    const tableChecks = [];

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        tableChecks.push({ table, exists: !error });
      } catch (err) {
        tableChecks.push({ table, exists: false, error: err.message });
      }
    }

    const allTablesExist = tableChecks.every(check => check.exists);
    
    if (allTablesExist) {
      addTestResult(testName, true, `All security tables exist: ${tables.join(', ')}`);
    } else {
      const missing = tableChecks.filter(check => !check.exists).map(check => check.table);
      addTestResult(testName, false, `Missing tables: ${missing.join(', ')}`);
    }
  } catch (error) {
    addTestResult(testName, false, `Table check failed: ${error.message}`);
  }
}

async function testUserAuthentication() {
  const testName = 'User Authentication';
  console.log(`🔍 Testing: ${testName}`);
  
  try {
    // First, ensure test user exists
    const { data: existingUser } = await supabase
      .from('portal_users')
      .select('id, email, role')
      .eq('email', TEST_CONFIG.testUser.email)
      .single();

    if (!existingUser) {
      // Create test user
      const { data: newUser, error: createError } = await supabase
        .from('portal_users')
        .insert({
          email: TEST_CONFIG.testUser.email,
          name: TEST_CONFIG.testUser.name,
          role: TEST_CONFIG.testUser.role,
          is_active: true,
          password_hash: await hashPassword(TEST_CONFIG.testUser.password)
        })
        .select()
        .single();

      if (createError) throw createError;
      console.log('✅ Test user created');
    }

    // Test authentication endpoint
    const authResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_CONFIG.testUser.email,
        password: TEST_CONFIG.testUser.password
      })
    });

    if (authResponse.ok) {
      const authData = await authResponse.json();
      authToken = authData.token;
      addTestResult(testName, true, 'User authentication successful');
    } else {
      addTestResult(testName, false, `Authentication failed: ${authResponse.status}`);
    }

  } catch (error) {
    addTestResult(testName, false, `Authentication test failed: ${error.message}`);
  }
}

async function testUserManagementAPI() {
  const testName = 'User Management API';
  console.log(`🔍 Testing: ${testName}`);
  
  if (!authToken) {
    addTestResult(testName, false, 'No auth token available');
    return;
  }

  try {
    // Test GET users
    const getUsersResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/admin/users?page=1&limit=10`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!getUsersResponse.ok) {
      addTestResult(testName, false, `GET users failed: ${getUsersResponse.status}`);
      return;
    }

    const usersData = await getUsersResponse.json();
    
    if (usersData.users && Array.isArray(usersData.users)) {
      addTestResult(testName, true, `User Management API working. Found ${usersData.users.length} users`);
    } else {
      addTestResult(testName, false, 'Invalid users response format');
    }

  } catch (error) {
    addTestResult(testName, false, `User Management API test failed: ${error.message}`);
  }
}

async function testSecurityAPI() {
  const testName = 'Security Monitoring API';
  console.log(`🔍 Testing: ${testName}`);
  
  if (!authToken) {
    addTestResult(testName, false, 'No auth token available');
    return;
  }

  try {
    const endpoints = [
      '/api/admin/security/alerts',
      '/api/admin/security/sessions', 
      '/api/admin/security/metrics'
    ];

    let successCount = 0;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${TEST_CONFIG.baseUrl}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
          successCount++;
        }
      } catch (err) {
        console.warn(`Security endpoint ${endpoint} failed:`, err.message);
      }
    }

    if (successCount === endpoints.length) {
      addTestResult(testName, true, `All ${endpoints.length} security endpoints working`);
    } else {
      addTestResult(testName, false, `Only ${successCount}/${endpoints.length} security endpoints working`);
    }

  } catch (error) {
    addTestResult(testName, false, `Security API test failed: ${error.message}`);
  }
}

async function testAuditLogging() {
  const testName = 'Audit Logging System';
  console.log(`🔍 Testing: ${testName}`);
  
  try {
    // Test audit log insertion
    const testLog = {
      user_id: 'test-user-id',
      action: 'TEST_ACTION',
      details: JSON.stringify({ test: true }),
      ip_address: '192.168.1.1',
      user_agent: 'Test Agent',
      timestamp: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('audit_logs')
      .insert(testLog)
      .select()
      .single();

    if (error) throw error;

    // Verify log was inserted
    const { data: retrievedLog, error: retrieveError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('id', data.id)
      .single();

    if (retrieveError) throw retrieveError;

    if (retrievedLog && retrievedLog.action === 'TEST_ACTION') {
      addTestResult(testName, true, 'Audit logging system working correctly');
      
      // Clean up test log
      await supabase.from('audit_logs').delete().eq('id', data.id);
    } else {
      addTestResult(testName, false, 'Audit log retrieval failed');
    }

  } catch (error) {
    addTestResult(testName, false, `Audit logging test failed: ${error.message}`);
  }
}

async function testDataValidation() {
  const testName = 'Data Validation';
  console.log(`🔍 Testing: ${testName}`);
  
  try {
    const validationTests = [];

    // Test email validation
    try {
      const { error } = await supabase
        .from('portal_users')
        .insert({
          email: 'invalid-email',
          name: 'Test User',
          role: 'agent'
        });
      
      validationTests.push({ 
        test: 'email_validation', 
        passed: error && error.message.includes('email')
      });
    } catch (err) {
      validationTests.push({ test: 'email_validation', passed: false });
    }

    // Test required fields
    try {
      const { error } = await supabase
        .from('portal_users')
        .insert({
          email: 'test@example.com'
          // Missing required fields
        });
      
      validationTests.push({ 
        test: 'required_fields', 
        passed: error && (error.message.includes('null') || error.message.includes('not-null'))
      });
    } catch (err) {
      validationTests.push({ test: 'required_fields', passed: true });
    }

    const passedTests = validationTests.filter(t => t.passed).length;
    const totalTests = validationTests.length;

    if (passedTests === totalTests) {
      addTestResult(testName, true, `All ${totalTests} validation tests passed`);
    } else {
      addTestResult(testName, false, `${passedTests}/${totalTests} validation tests passed`);
    }

  } catch (error) {
    addTestResult(testName, false, `Data validation test failed: ${error.message}`);
  }
}

function addTestResult(testName, passed, message) {
  const result = { testName, passed, message, timestamp: new Date().toISOString() };
  testResults.push(result);
  
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${testName} - ${message}`);
}

function generateTestReport() {
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  const report = {
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: `${successRate}%`
    },
    status: successRate >= 80 ? 'HEALTHY' : successRate >= 60 ? 'WARNING' : 'CRITICAL',
    timestamp: new Date().toISOString(),
    recommendations: []
  };

  // Add recommendations based on failed tests
  if (failedTests > 0) {
    const failedTestNames = testResults.filter(r => !r.passed).map(r => r.testName);
    
    if (failedTestNames.includes('Database Connection')) {
      report.recommendations.push('Check database connection and credentials');
    }
    if (failedTestNames.includes('Security Tables Existence')) {
      report.recommendations.push('Run setup-security-tables.js to create missing tables');
    }
    if (failedTestNames.includes('User Authentication')) {
      report.recommendations.push('Verify authentication system and user credentials');
    }
  }

  console.log('\n📊 Test Report Summary:');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success Rate: ${successRate}%`);
  console.log(`Status: ${report.status}\n`);

  return report;
}

// Utility function for password hashing (simplified for testing)
async function hashPassword(password) {
  // In production, use bcrypt
  return `hashed_${password}`;
}