import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zgkszwkxibpnxhvlenct.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpna3N6d2t4aWJwbnhodmxlbmN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMxOTc5MywiZXhwIjoyMDcxODk1NzkzfQ.Cy15WKK89KKa4SrwwD-0Wpkyu6PK_VMx0Wc-_xmsoCI' // Use service key for full access
);

async function auditDatabase() {
  console.log('=== SUPABASE COMPLETE AUDIT ===\n');
  
  // Get all tables
  const { data: tables } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');
  
  console.log('TABLES FOUND:', tables?.map(t => t.table_name).join(', '));
  
  // Check each critical table
  const criticalTables = [
    'portal_users',
    'agencies', 
    'teams',
    'sales',
    'commissions',
    'audit_logs'
  ];
  
  for (const table of criticalTables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: DOES NOT EXIST`);
      } else {
        console.log(`✅ ${table}: EXISTS (${count} rows)`);
        
        // Get sample row to see structure
        const { data: sample } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (sample?.[0]) {
          console.log(`   Columns: ${Object.keys(sample[0]).join(', ')}`);
        }
      }
    } catch (e) {
      console.log(`❌ ${table}: ERROR - ${e.message}`);
    }
  }
  
  // Check for multi-tenancy
  console.log('\n=== MULTI-TENANCY CHECK ===');
  
  const { data: users } = await supabase
    .from('portal_users')
    .select('*')
    .limit(1);
  
  if (users?.[0]) {
    console.log('User columns:', Object.keys(users[0]));
    console.log('Has agency_id?', 'agency_id' in users[0]);
    console.log('Has role?', 'role' in users[0]);
    console.log('Has primary_role?', 'primary_role' in users[0]);
  }
}

auditDatabase();