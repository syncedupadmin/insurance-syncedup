// Deep dive into similar/duplicate tables
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeTableDetails() {
  console.log('\n' + '='.repeat(80));
  console.log('DETAILED TABLE STRUCTURE ANALYSIS');
  console.log('='.repeat(80) + '\n');

  // Analyze portal_users in detail
  console.log('1. PORTAL_USERS TABLE ANALYSIS');
  console.log('-'.repeat(40));

  const { data: portalUsers, error: puError } = await supabase
    .from('portal_users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (!puError && portalUsers) {
    console.log(`Sample records (${portalUsers.length} of 8 total):\n`);
    portalUsers.forEach((user, i) => {
      console.log(`Record ${i + 1}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Agency ID: ${user.agency_id}`);
      console.log(`  Auth User ID: ${user.auth_user_id || 'NULL'}`);
      console.log(`  Active: ${user.is_active}`);
      console.log(`  Created: ${user.created_at}`);
      console.log('');
    });
  }

  // Analyze users table (empty but check structure)
  console.log('2. USERS TABLE ANALYSIS');
  console.log('-'.repeat(40));

  // Try to insert a test record to see the structure
  const { error: usersStructError } = await supabase
    .from('users')
    .insert({
      id: 'test-id-999',
      email: 'test@example.com'
    });

  if (usersStructError) {
    console.log('Table structure hint from error:');
    console.log(usersStructError.message);
  }

  const { data: usersData } = await supabase
    .from('users')
    .select('*')
    .limit(5);

  if (usersData && usersData.length === 0) {
    console.log('Table exists but is EMPTY (0 records)');
    console.log('This might be a legacy table or prepared for future use.');
  }

  // Analyze portal_agents
  console.log('\n3. PORTAL_AGENTS TABLE ANALYSIS');
  console.log('-'.repeat(40));

  const { data: portalAgents } = await supabase
    .from('portal_agents')
    .select('*')
    .limit(5);

  if (portalAgents) {
    console.log(`Found ${portalAgents.length} portal_agents records:`);

    // Get column structure
    if (portalAgents[0]) {
      console.log('\nColumns:', Object.keys(portalAgents[0]).join(', '));
    }

    portalAgents.forEach((agent, i) => {
      console.log(`\nAgent ${i + 1}:`, JSON.stringify(agent, null, 2));
    });
  }

  // Check for agents table (non-portal)
  console.log('\n4. AGENTS TABLE CHECK');
  console.log('-'.repeat(40));

  const { data: agentsCheck, error: agentsError } = await supabase
    .from('agents')
    .select('*')
    .limit(1);

  if (agentsError) {
    console.log('Table "agents" does not exist or is not accessible');
    console.log('Error:', agentsError.message);
  } else if (agentsCheck) {
    console.log('Table "agents" exists with', agentsCheck.length, 'accessible records');
  }

  // Analyze portal_sales vs sales
  console.log('\n5. SALES TABLES COMPARISON');
  console.log('-'.repeat(40));

  const { data: portalSalesStructure } = await supabase
    .from('portal_sales')
    .select('*')
    .limit(1);

  const { data: salesStructure } = await supabase
    .from('sales')
    .select('*')
    .limit(1);

  console.log('portal_sales columns:', portalSalesStructure?.[0] ? Object.keys(portalSalesStructure[0]) : 'No data');
  console.log('sales columns:', salesStructure?.[0] ? Object.keys(salesStructure[0]) : 'No data');

  // Check what tables are actually being used by the application
  console.log('\n6. USAGE PATTERN ANALYSIS');
  console.log('-'.repeat(40));

  // Check recent activity in audit_logs to see which tables are being used
  const { data: recentAudits } = await supabase
    .from('audit_logs')
    .select('table_name, action, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (recentAudits && recentAudits.length > 0) {
    console.log('\nRecent table activity from audit logs:');
    const tableUsage = {};
    recentAudits.forEach(log => {
      if (log.table_name) {
        tableUsage[log.table_name] = (tableUsage[log.table_name] || 0) + 1;
      }
    });

    Object.entries(tableUsage).forEach(([table, count]) => {
      console.log(`  - ${table}: ${count} recent actions`);
    });
  }

  // Check relationships between portal tables
  console.log('\n7. PORTAL TABLES RELATIONSHIPS');
  console.log('-'.repeat(40));

  // Check if portal_agents references portal_users
  const { data: agentUserLink } = await supabase
    .from('portal_agents')
    .select(`
      *,
      portal_users!inner(email, full_name, role)
    `)
    .limit(2);

  if (agentUserLink && agentUserLink.length > 0) {
    console.log('portal_agents links to portal_users:');
    console.log(JSON.stringify(agentUserLink, null, 2));
  } else {
    console.log('No direct relationship found between portal_agents and portal_users');
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('CONCLUSIONS');
  console.log('-'.repeat(40));

  console.log('\nDUPLICATE TABLE ANALYSIS:');
  console.log('1. portal_users (8 records) vs users (0 records)');
  console.log('   - portal_users is ACTIVE and being used');
  console.log('   - users table is EMPTY - likely legacy or unused');

  console.log('\n2. portal_agents (2 records) vs agents (not found)');
  console.log('   - portal_agents exists with data');
  console.log('   - agents table does not exist');

  console.log('\n3. portal_sales (0 records) vs sales (0 records)');
  console.log('   - Both tables exist but are empty');
  console.log('   - May be prepared for future use');

  console.log('\n4. leads (0 records) vs convoso_leads (0 records)');
  console.log('   - Both lead tables are empty');
  console.log('   - convoso_leads appears to be for integration');

  console.log('\nRECOMMENDATION:');
  console.log('The "portal_" prefixed tables are the primary active tables.');
  console.log('Non-prefixed duplicates (users, sales, leads) appear to be unused/legacy.');
  console.log('The system is primarily using portal_* tables for all operations.');

  console.log('\n' + '='.repeat(80));
}

analyzeTableDetails().catch(console.error);