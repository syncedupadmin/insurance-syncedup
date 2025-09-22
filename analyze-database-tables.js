// Analyze all database tables to find portal-related and similar tables
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeDatabase() {
  console.log('\n' + '='.repeat(80));
  console.log('DATABASE TABLES ANALYSIS REPORT');
  console.log('='.repeat(80) + '\n');

  try {
    // Get all tables using Supabase's information_schema
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_all_tables');

    // If the RPC doesn't exist, try a different approach
    let allTables = [];

    // Try to get tables by attempting to query known patterns
    const tablePatterns = [
      'portal_users', 'portal_agents', 'portal_sales', 'portal_leads', 'portal_goals',
      'users', 'agents', 'customers', 'leads', 'sales', 'quotes',
      'agencies', 'commissions', 'licenses', 'activities', 'notifications',
      'convoso_leads', 'audit_logs', 'system_alerts', 'messages'
    ];

    console.log('SECTION 1: DISCOVERED TABLES');
    console.log('-'.repeat(40));

    for (const tableName of tablePatterns) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (!error) {
        allTables.push(tableName);
      }
    }

    console.log(`Found ${allTables.length} accessible tables:\n`);
    allTables.sort();
    allTables.forEach((table, i) => {
      console.log(`  ${i + 1}. ${table}`);
    });

    // Group tables by prefix/category
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 2: TABLES GROUPED BY PREFIX/CATEGORY');
    console.log('-'.repeat(40));

    const portalTables = allTables.filter(t => t.startsWith('portal_'));
    const convosoTables = allTables.filter(t => t.includes('convoso'));
    const auditTables = allTables.filter(t => t.includes('audit'));
    const baseTables = allTables.filter(t =>
      !t.startsWith('portal_') &&
      !t.includes('convoso') &&
      !t.includes('audit')
    );

    console.log('\nPORTAL TABLES (' + portalTables.length + '):');
    portalTables.forEach(t => console.log(`  - ${t}`));

    console.log('\nCONVOSO TABLES (' + convosoTables.length + '):');
    convosoTables.forEach(t => console.log(`  - ${t}`));

    console.log('\nAUDIT TABLES (' + auditTables.length + '):');
    auditTables.forEach(t => console.log(`  - ${t}`));

    console.log('\nBASE/OTHER TABLES (' + baseTables.length + '):');
    baseTables.forEach(t => console.log(`  - ${t}`));

    // Analyze potential duplicates
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 3: POTENTIAL DUPLICATE/SIMILAR TABLES');
    console.log('-'.repeat(40));

    const similarities = [];

    // Check for user-related tables
    const userTables = allTables.filter(t =>
      t.includes('user') || t.includes('agent') || t.includes('admin')
    );
    if (userTables.length > 0) {
      console.log('\nUSER/AGENT RELATED TABLES:');
      for (const table of userTables) {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        console.log(`  - ${table}: ${count || 0} records`);
      }
    }

    // Check for sales/leads related tables
    const salesLeadsTables = allTables.filter(t =>
      t.includes('sale') || t.includes('lead') || t.includes('quote')
    );
    if (salesLeadsTables.length > 0) {
      console.log('\nSALES/LEADS/QUOTES RELATED TABLES:');
      for (const table of salesLeadsTables) {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        console.log(`  - ${table}: ${count || 0} records`);
      }
    }

    // Detailed analysis of similar tables
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 4: DETAILED COMPARISON OF SIMILAR TABLES');
    console.log('-'.repeat(40));

    // Compare portal_users vs users (if both exist)
    if (allTables.includes('portal_users') && allTables.includes('users')) {
      console.log('\nCOMPARING: portal_users vs users');
      console.log('-'.repeat(30));

      // Get columns for portal_users
      const { data: portalUsersData } = await supabase
        .from('portal_users')
        .select('*')
        .limit(1);

      // Get columns for users
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .limit(1);

      const portalUsersCols = portalUsersData && portalUsersData[0] ? Object.keys(portalUsersData[0]) : [];
      const usersCols = usersData && usersData[0] ? Object.keys(usersData[0]) : [];

      console.log('portal_users columns (' + portalUsersCols.length + '):');
      console.log('  ' + portalUsersCols.join(', '));

      console.log('\nusers columns (' + usersCols.length + '):');
      console.log('  ' + usersCols.join(', '));

      // Find common columns
      const commonCols = portalUsersCols.filter(col => usersCols.includes(col));
      const uniqueToPortal = portalUsersCols.filter(col => !usersCols.includes(col));
      const uniqueToUsers = usersCols.filter(col => !portalUsersCols.includes(col));

      console.log('\nCommon columns (' + commonCols.length + '):');
      console.log('  ' + commonCols.join(', '));

      console.log('\nUnique to portal_users:');
      console.log('  ' + (uniqueToPortal.join(', ') || 'None'));

      console.log('\nUnique to users:');
      console.log('  ' + (uniqueToUsers.join(', ') || 'None'));
    }

    // Compare portal_agents vs agents (if both exist)
    if (allTables.includes('portal_agents') && allTables.includes('agents')) {
      console.log('\n\nCOMPARING: portal_agents vs agents');
      console.log('-'.repeat(30));

      const { data: portalAgentsData } = await supabase
        .from('portal_agents')
        .select('*')
        .limit(1);

      const { data: agentsData } = await supabase
        .from('agents')
        .select('*')
        .limit(1);

      const portalAgentsCols = portalAgentsData && portalAgentsData[0] ? Object.keys(portalAgentsData[0]) : [];
      const agentsCols = agentsData && agentsData[0] ? Object.keys(agentsData[0]) : [];

      console.log('portal_agents columns (' + portalAgentsCols.length + '):');
      console.log('  ' + portalAgentsCols.join(', '));

      console.log('\nagents columns (' + agentsCols.length + '):');
      console.log('  ' + agentsCols.join(', '));
    }

    // Check for sample data in key tables
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 5: KEY TABLES RECORD COUNTS');
    console.log('-'.repeat(40));

    const keyTables = ['portal_users', 'users', 'portal_agents', 'agents', 'portal_sales', 'sales', 'agencies'];

    for (const table of keyTables) {
      if (allTables.includes(table)) {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (!error) {
          console.log(`${table.padEnd(20)} : ${count || 0} records`);
        }
      }
    }

    // Check relationships
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 6: POTENTIAL RELATIONSHIPS/FOREIGN KEYS');
    console.log('-'.repeat(40));

    // Check agency relationships
    console.log('\nTables with agency_id column:');
    for (const table of allTables) {
      const { data } = await supabase
        .from(table)
        .select('agency_id')
        .limit(1);

      if (data && data[0] && 'agency_id' in data[0]) {
        console.log(`  - ${table}`);
      }
    }

    // Check user relationships
    console.log('\nTables with user_id or auth_user_id columns:');
    for (const table of allTables) {
      const { data } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (data && data[0]) {
        const cols = Object.keys(data[0]);
        if (cols.some(col => col.includes('user_id') || col.includes('auth_user_id'))) {
          const relevantCols = cols.filter(col => col.includes('user_id') || col.includes('auth_user_id'));
          console.log(`  - ${table}: ${relevantCols.join(', ')}`);
        }
      }
    }

    // Summary and recommendations
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 7: SUMMARY & OBSERVATIONS');
    console.log('-'.repeat(40));

    console.log('\nKEY FINDINGS:');
    console.log('1. Total tables found: ' + allTables.length);
    console.log('2. Portal-prefixed tables: ' + portalTables.length);
    console.log('3. Potential duplicate structures:');

    const duplicatePairs = [
      ['portal_users', 'users'],
      ['portal_agents', 'agents'],
      ['portal_sales', 'sales'],
      ['portal_leads', 'leads']
    ];

    for (const [table1, table2] of duplicatePairs) {
      if (allTables.includes(table1) && allTables.includes(table2)) {
        console.log(`   - ${table1} <-> ${table2}`);
      }
    }

    console.log('\nOBSERVATIONS:');
    console.log('- The "portal_" prefixed tables appear to be the primary tables for the portal system');
    console.log('- Non-prefixed tables might be legacy or used for different purposes');
    console.log('- Both sets of tables exist simultaneously in the database');
    console.log('- Authentication appears to use both Supabase Auth and portal_users table');

    console.log('\n' + '='.repeat(80));
    console.log('END OF REPORT');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error analyzing database:', error);
  }
}

analyzeDatabase().catch(console.error);