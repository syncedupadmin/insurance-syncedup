require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔥🔥🔥 ULTRA-DIAGNOSTIC MODE 🔥🔥🔥\n');
console.log('Running EVERY possible test to find the problem...\n');
console.log('═'.repeat(80) + '\n');

async function runAllTests() {
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  // TEST 1: Check Supabase Auth Users (the actual auth.users table)
  console.log('TEST 1: Checking Supabase Auth Users (auth.users)');
  console.log('─'.repeat(80));
  try {
    const { data: authUsers, error } = await supabase.auth.admin.listUsers();

    if (error) {
      results.failed.push('TEST 1: Could not list auth users - ' + error.message);
      console.log('❌ FAILED:', error.message);
    } else {
      console.log(`✅ Found ${authUsers.users.length} users in auth.users\n`);

      authUsers.users.forEach((user, i) => {
        console.log(`User ${i + 1}:`);
        console.log(`  Email: ${user.email}`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Metadata:`, JSON.stringify(user.user_metadata, null, 4));
        console.log(`  App Metadata:`, JSON.stringify(user.app_metadata, null, 4));

        // CHECK FOR test-agency-001 in metadata
        const metadataStr = JSON.stringify(user.user_metadata) + JSON.stringify(user.app_metadata);
        if (metadataStr.includes('test-agency-001')) {
          results.warnings.push(`⚠️  User ${user.email} has "test-agency-001" in metadata!`);
          console.log(`  ⚠️⚠️⚠️  FOUND "test-agency-001" IN THIS USER'S METADATA! ⚠️⚠️⚠️`);
        }
        console.log('');
      });

      results.passed.push('TEST 1: Auth users checked');
    }
  } catch (e) {
    results.failed.push('TEST 1: Exception - ' + e.message);
    console.log('❌ EXCEPTION:', e.message);
  }
  console.log('═'.repeat(80) + '\n');

  // TEST 2: Check portal_users for ANY non-UUID agency_ids
  console.log('TEST 2: Checking portal_users for non-UUID agency_ids');
  console.log('─'.repeat(80));
  try {
    const { data: portalUsers, error } = await supabase
      .from('portal_users')
      .select('*');

    if (error) {
      results.failed.push('TEST 2: Could not query portal_users - ' + error.message);
      console.log('❌ FAILED:', error.message);
    } else {
      console.log(`✅ Found ${portalUsers.length} users in portal_users\n`);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let foundBad = false;

      portalUsers.forEach(user => {
        if (user.agency_id && !uuidRegex.test(user.agency_id)) {
          foundBad = true;
          results.warnings.push(`⚠️  portal_users: ${user.email} has invalid agency_id: ${user.agency_id}`);
          console.log(`⚠️⚠️⚠️  FOUND BAD AGENCY_ID:`);
          console.log(`  Email: ${user.email}`);
          console.log(`  agency_id: ${user.agency_id}`);
          console.log(`  Role: ${user.role}`);
          console.log('');
        }

        // Also check if it's exactly "test-agency-001"
        if (user.agency_id === 'test-agency-001') {
          results.warnings.push(`🔴 portal_users: ${user.email} has agency_id = "test-agency-001"!`);
          console.log(`🔴🔴🔴 FOUND THE CULPRIT! 🔴🔴🔴`);
          console.log(`  Email: ${user.email}`);
          console.log(`  This user needs to be updated!`);
          console.log('');
        }
      });

      if (!foundBad) {
        console.log('✅ All agency_ids are valid UUIDs');
        results.passed.push('TEST 2: All portal_users have valid agency_ids');
      } else {
        results.failed.push('TEST 2: Found invalid agency_ids in portal_users');
      }
    }
  } catch (e) {
    results.failed.push('TEST 2: Exception - ' + e.message);
    console.log('❌ EXCEPTION:', e.message);
  }
  console.log('═'.repeat(80) + '\n');

  // TEST 3: Check agencies table for string IDs
  console.log('TEST 3: Checking agencies table for non-UUID IDs');
  console.log('─'.repeat(80));
  try {
    const { data: agencies, error } = await supabase
      .from('agencies')
      .select('*');

    if (error) {
      results.failed.push('TEST 3: Could not query agencies - ' + error.message);
      console.log('❌ FAILED:', error.message);
    } else {
      console.log(`✅ Found ${agencies.length} agencies\n`);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let foundBad = false;

      agencies.forEach(agency => {
        console.log(`Agency: ${agency.name}`);
        console.log(`  ID: ${agency.id}`);
        console.log(`  Code: ${agency.code}`);

        if (!uuidRegex.test(agency.id)) {
          foundBad = true;
          results.warnings.push(`⚠️  Agency ${agency.name} has non-UUID ID: ${agency.id}`);
          console.log(`  ⚠️  Non-UUID ID detected!`);
        }
        console.log('');
      });

      if (!foundBad) {
        results.passed.push('TEST 3: All agencies have valid UUID IDs');
      } else {
        results.failed.push('TEST 3: Found non-UUID agency IDs');
      }
    }
  } catch (e) {
    results.failed.push('TEST 3: Exception - ' + e.message);
    console.log('❌ EXCEPTION:', e.message);
  }
  console.log('═'.repeat(80) + '\n');

  // TEST 4: Try to query with "test-agency-001" to see exact error
  console.log('TEST 4: Simulating the actual query that fails');
  console.log('─'.repeat(80));
  try {
    console.log('Attempting: supabase.from("leads").select("*").eq("agency_id", "test-agency-001")');

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('agency_id', 'test-agency-001');

    if (error) {
      console.log('❌ ERROR (expected):');
      console.log(`  Code: ${error.code}`);
      console.log(`  Message: ${error.message}`);
      console.log(`  Details: ${error.details}`);
      console.log(`  Hint: ${error.hint}`);
      results.passed.push('TEST 4: Confirmed UUID error reproduced');
    } else {
      console.log(`⚠️  Query succeeded unexpectedly, found ${data.length} leads`);
      results.warnings.push('TEST 4: Query with "test-agency-001" should have failed but succeeded');
    }
  } catch (e) {
    results.failed.push('TEST 4: Exception - ' + e.message);
    console.log('❌ EXCEPTION:', e.message);
  }
  console.log('═'.repeat(80) + '\n');

  // TEST 5: Check leads table for any bad agency_ids
  console.log('TEST 5: Checking leads table for non-UUID agency_ids');
  console.log('─'.repeat(80));
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, name, email, agency_id')
      .limit(100);

    if (error) {
      if (error.message?.includes('does not exist')) {
        console.log('⚠️  Leads table does not exist yet');
        results.passed.push('TEST 5: Leads table does not exist (not an error)');
      } else {
        results.failed.push('TEST 5: Could not query leads - ' + error.message);
        console.log('❌ FAILED:', error.message);
      }
    } else {
      console.log(`✅ Found ${leads.length} leads\n`);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let foundBad = false;

      leads.forEach(lead => {
        if (lead.agency_id && !uuidRegex.test(lead.agency_id)) {
          foundBad = true;
          results.warnings.push(`⚠️  Lead "${lead.name}" has invalid agency_id: ${lead.agency_id}`);
          console.log(`⚠️  Lead: ${lead.name || lead.email}`);
          console.log(`  agency_id: ${lead.agency_id}`);
          console.log('');
        }
      });

      if (!foundBad) {
        results.passed.push('TEST 5: All leads have valid agency_ids');
      } else {
        results.failed.push('TEST 5: Found invalid agency_ids in leads');
      }
    }
  } catch (e) {
    results.failed.push('TEST 5: Exception - ' + e.message);
    console.log('❌ EXCEPTION:', e.message);
  }
  console.log('═'.repeat(80) + '\n');

  // TEST 6: Check for "test-agency" in ALL string columns
  console.log('TEST 6: Searching for "test-agency" in ALL tables');
  console.log('─'.repeat(80));
  try {
    const tables = ['portal_users', 'agencies', 'leads', 'sales', 'commissions'];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1000);

      if (error) {
        if (!error.message?.includes('does not exist')) {
          console.log(`⚠️  Could not check ${table}: ${error.message}`);
        }
        continue;
      }

      if (!data || data.length === 0) continue;

      // Convert all data to string and search
      data.forEach((row, idx) => {
        const rowStr = JSON.stringify(row).toLowerCase();
        if (rowStr.includes('test-agency')) {
          console.log(`🔍 Found "test-agency" in ${table}:`);
          console.log(`  Row ${idx}:`, JSON.stringify(row, null, 2));
          results.warnings.push(`Found "test-agency" in ${table}`);
        }
      });
    }

    results.passed.push('TEST 6: Searched all tables for "test-agency"');
  } catch (e) {
    results.failed.push('TEST 6: Exception - ' + e.message);
    console.log('❌ EXCEPTION:', e.message);
  }
  console.log('═'.repeat(80) + '\n');

  // TEST 7: Check environment variables
  console.log('TEST 7: Checking environment variables');
  console.log('─'.repeat(80));
  const envVars = Object.keys(process.env).filter(key =>
    key.includes('AGENCY') ||
    key.includes('TEST') ||
    key.includes('DEMO') ||
    key.includes('DEFAULT')
  );

  if (envVars.length > 0) {
    console.log('Found related environment variables:');
    envVars.forEach(key => {
      const value = process.env[key];
      console.log(`  ${key}: ${value}`);
      if (value && value.includes('test-agency')) {
        results.warnings.push(`⚠️  Environment variable ${key} contains "test-agency"`);
        console.log(`    ⚠️  Contains "test-agency"!`);
      }
    });
  } else {
    console.log('No suspicious environment variables found');
  }
  results.passed.push('TEST 7: Environment variables checked');
  console.log('═'.repeat(80) + '\n');

  // TEST 8: Check for hardcoded values in code
  console.log('TEST 8: Checking codebase for hardcoded "test-agency-001"');
  console.log('─'.repeat(80));
  try {
    const fs = require('fs');
    const path = require('path');

    function searchFiles(dir, results = []) {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('archives')) {
            searchFiles(filePath, results);
          }
        } else if (file.endsWith('.js') || file.endsWith('.ts')) {
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.includes('test-agency-001')) {
            results.push(filePath);
          }
        }
      }

      return results;
    }

    const filesWithTestAgency = searchFiles('./api');

    if (filesWithTestAgency.length > 0) {
      console.log(`⚠️  Found "test-agency-001" in ${filesWithTestAgency.length} API files:`);
      filesWithTestAgency.forEach(f => {
        console.log(`  - ${f}`);
        results.warnings.push(`Found "test-agency-001" in ${f}`);
      });
    } else {
      console.log('✅ No hardcoded "test-agency-001" found in /api directory');
      results.passed.push('TEST 8: No hardcoded test values in API');
    }
  } catch (e) {
    results.failed.push('TEST 8: Exception - ' + e.message);
    console.log('❌ EXCEPTION:', e.message);
  }
  console.log('═'.repeat(80) + '\n');

  // FINAL REPORT
  console.log('🎯 FINAL DIAGNOSTIC REPORT');
  console.log('═'.repeat(80));
  console.log(`\n✅ PASSED TESTS (${results.passed.length}):`);
  results.passed.forEach(p => console.log(`  ${p}`));

  console.log(`\n⚠️  WARNINGS (${results.warnings.length}):`);
  if (results.warnings.length === 0) {
    console.log('  None');
  } else {
    results.warnings.forEach(w => console.log(`  ${w}`));
  }

  console.log(`\n❌ FAILED TESTS (${results.failed.length}):`);
  if (results.failed.length === 0) {
    console.log('  None');
  } else {
    results.failed.forEach(f => console.log(`  ${f}`));
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n🔥 ULTRA-DIAGNOSTIC COMPLETE 🔥\n');

  // RECOMMENDATIONS
  console.log('💡 RECOMMENDATIONS:');
  console.log('─'.repeat(80));

  if (results.warnings.some(w => w.includes('metadata'))) {
    console.log('🎯 ACTION REQUIRED: Update auth user metadata to remove test-agency-001');
    console.log('   Run: node fix-auth-metadata.js');
  }

  if (results.warnings.some(w => w.includes('portal_users'))) {
    console.log('🎯 ACTION REQUIRED: Update portal_users table to fix agency_ids');
    console.log('   Run: node fix-portal-users-agency-ids.js');
  }

  if (results.warnings.length === 0 && results.failed.length === 0) {
    console.log('🎯 Database looks clean. The issue is likely in browser cookies.');
    console.log('   Solution: Clear cookies and re-login');
  }

  console.log('═'.repeat(80) + '\n');
}

runAllTests().catch(err => {
  console.error('💥 CATASTROPHIC FAILURE:', err);
  process.exit(1);
});