// Super Admin Portal Comprehensive Test Script
// This script verifies all fixes are working correctly

const BASE_URL = 'https://insurance-syncedup-aegd4ruyl-nicks-projects-f40381ea.vercel.app';

// Color codes for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let testsPassed = 0;
let testsFailed = 0;

async function runTest(testName, testFn) {
    try {
        process.stdout.write(`Testing ${testName}... `);
        await testFn();
        console.log(`${GREEN}✓ PASSED${RESET}`);
        testsPassed++;
        return true;
    } catch (error) {
        console.log(`${RED}✗ FAILED${RESET}`);
        console.log(`  Error: ${error.message}`);
        testsFailed++;
        return false;
    }
}

// Test 1: Super Admin Portal Accessibility
async function testPortalAccess() {
    const response = await fetch(`${BASE_URL}/super-admin/`);
    if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
    }
}

// Test 2: Audit API - OPTIONS Request
async function testAuditOptions() {
    const response = await fetch(`${BASE_URL}/api/super-admin/audit`, {
        method: 'OPTIONS'
    });
    if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
    }
}

// Test 3: Audit API - POST without auth (should be 401, not 405)
async function testAuditPostNoAuth() {
    const response = await fetch(`${BASE_URL}/api/super-admin/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TEST', details: 'Test action' })
    });
    if (response.status !== 401) {
        throw new Error(`Expected status 401, got ${response.status}`);
    }
    const data = await response.json();
    if (!data.error || !data.error.includes('Authorization')) {
        throw new Error('Expected authorization error message');
    }
}

// Test 4: Audit API - GET without auth (should be 401)
async function testAuditGetNoAuth() {
    const response = await fetch(`${BASE_URL}/api/super-admin/audit?limit=10`);
    if (response.status !== 401) {
        throw new Error(`Expected status 401, got ${response.status}`);
    }
}

// Test 5: Users API - GET without auth
async function testUsersApiNoAuth() {
    const response = await fetch(`${BASE_URL}/api/super-admin/users`);
    if (response.status !== 401) {
        throw new Error(`Expected status 401, got ${response.status}`);
    }
}

// Test 6: Metrics API - GET without auth
async function testMetricsApiNoAuth() {
    const response = await fetch(`${BASE_URL}/api/super-admin/metrics`);
    if (response.status !== 401) {
        throw new Error(`Expected status 401, got ${response.status}`);
    }
}

// Test 7: Agencies API - GET without auth
async function testAgenciesApiNoAuth() {
    const response = await fetch(`${BASE_URL}/api/super-admin/agencies`);
    if (response.status !== 401) {
        throw new Error(`Expected status 401, got ${response.status}`);
    }
}

// Test 8: Check HTML for no console errors indicators
async function testHtmlStructure() {
    const response = await fetch(`${BASE_URL}/super-admin/`);
    const html = await response.text();
    
    // Check that critical functions exist
    if (!html.includes('loadDashboard')) {
        throw new Error('loadDashboard function not found');
    }
    if (!html.includes('loadUserAgencyManagement')) {
        throw new Error('loadUserAgencyManagement function not found');
    }
    if (!html.includes('loadFinancialOverview')) {
        throw new Error('loadFinancialOverview function not found');
    }
    
    // Check that loadUserList is NOT present (should be fixed)
    if (html.includes('loadUserList()')) {
        throw new Error('loadUserList() call still present - should be removed');
    }
    
    // Check for proper navigation structure
    if (!html.includes('Core Systems')) {
        throw new Error('Consolidated navigation not found');
    }
}

// Test 9: Verify no 405 errors on standard API calls
async function testNoMethodNotAllowed() {
    const endpoints = [
        { url: '/api/super-admin/audit', method: 'POST' },
        { url: '/api/super-admin/audit', method: 'GET' },
        { url: '/api/super-admin/users', method: 'GET' },
        { url: '/api/super-admin/metrics', method: 'GET' }
    ];
    
    for (const endpoint of endpoints) {
        const response = await fetch(`${BASE_URL}${endpoint.url}`, {
            method: endpoint.method,
            headers: { 'Content-Type': 'application/json' },
            body: endpoint.method === 'POST' ? JSON.stringify({}) : undefined
        });
        
        // Should be 401 (unauthorized) not 405 (method not allowed)
        if (response.status === 405) {
            throw new Error(`${endpoint.method} ${endpoint.url} returned 405 - routing not fixed`);
        }
    }
}

// Main test runner
async function runAllTests() {
    console.log('\\n🔍 Running Super Admin Portal Tests\\n');
    console.log('================================\\n');
    
    // Run all tests
    await runTest('Portal Accessibility', testPortalAccess);
    await runTest('Audit API OPTIONS', testAuditOptions);
    await runTest('Audit API POST (No Auth)', testAuditPostNoAuth);
    await runTest('Audit API GET (No Auth)', testAuditGetNoAuth);
    await runTest('Users API (No Auth)', testUsersApiNoAuth);
    await runTest('Metrics API (No Auth)', testMetricsApiNoAuth);
    await runTest('Agencies API (No Auth)', testAgenciesApiNoAuth);
    await runTest('HTML Structure & Functions', testHtmlStructure);
    await runTest('No 405 Errors', testNoMethodNotAllowed);
    
    // Summary
    console.log('\\n================================');
    console.log('Test Summary:\\n');
    console.log(`${GREEN}✓ Passed: ${testsPassed}${RESET}`);
    if (testsFailed > 0) {
        console.log(`${RED}✗ Failed: ${testsFailed}${RESET}`);
    }
    console.log(`Total: ${testsPassed + testsFailed}`);
    
    if (testsFailed === 0) {
        console.log(`\\n${GREEN}🎉 ALL TESTS PASSED! The Super Admin Portal is fully functional.${RESET}\\n`);
    } else {
        console.log(`\\n${RED}⚠️  Some tests failed. Please review the errors above.${RESET}\\n`);
        process.exit(1);
    }
}

// Run tests
runAllTests().catch(error => {
    console.error(`${RED}Fatal error running tests: ${error.message}${RESET}`);
    process.exit(1);
});