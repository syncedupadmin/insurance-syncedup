import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zgkszwkxibpnxhvlenct.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpna3N6d2t4aWJwbnhodmxlbmN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMxOTc5MywiZXhwIjoyMDcxODk1NzkzfQ.Cy15WKK89KKa4SrwwD-0Wpkyu6PK_VMx0Wc-_xmsoCI'
);

async function fullDataAnalysis() {
  console.log('=== COMPLETE SUPABASE DATA EXTRACTION ===\n');

  // 1. PORTAL USERS - Complete data
  console.log('🔵 PORTAL USERS (All Records):');
  console.log('=' .repeat(50));
  const { data: users } = await supabase
    .from('portal_users')
    .select('*')
    .order('created_at', { ascending: false });
  
  users?.forEach((user, i) => {
    console.log(`User ${i + 1}:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Agency ID: ${user.agency_id}`);
    console.log(`  Agent ID: ${user.agent_id || 'NULL'}`);
    console.log(`  Agent Code: ${user.agent_code || 'NULL'}`);
    console.log(`  Name: ${user.full_name || user.name || 'NULL'}`);
    console.log(`  Active: ${user.is_active}`);
    console.log(`  Classic Mode: ${user.classic_mode || 'NULL'}`);
    console.log(`  Last Login: ${user.last_login || 'Never'}`);
    console.log(`  Created: ${user.created_at}`);
    console.log('  ---');
  });

  // 2. AGENCIES - Complete data
  console.log('\n🟢 AGENCIES (All Records):');
  console.log('=' .repeat(50));
  const { data: agencies } = await supabase
    .from('agencies')
    .select('*')
    .order('created_at', { ascending: false });
  
  agencies?.forEach((agency, i) => {
    console.log(`Agency ${i + 1}:`);
    console.log(`  ID: ${agency.id}`);
    console.log(`  Name: ${agency.name}`);
    console.log(`  Code: ${agency.code}`);
    console.log(`  Admin Email: ${agency.admin_email}`);
    console.log(`  Commission Split: ${agency.commission_split || 'NULL'}`);
    console.log(`  Features: ${JSON.stringify(agency.features || {})}`);
    console.log(`  Global Leaderboard: ${agency.participate_global_leaderboard}`);
    console.log(`  Commission Structure: ${JSON.stringify(agency.commission_structure || {})}`);
    console.log(`  Pay Period: ${agency.pay_period || 'NULL'}`);
    console.log(`  Pay Day: ${agency.pay_day || 'NULL'}`);
    console.log(`  Is Demo: ${agency.is_demo}`);
    console.log(`  Stripe Customer: ${agency.stripe_customer_id || 'NULL'}`);
    console.log(`  Active: ${agency.is_active}`);
    console.log(`  Created: ${agency.created_at}`);
    console.log('  ---');
  });

  // 3. SALES - Complete data
  console.log('\n🟡 SALES (All Records):');
  console.log('=' .repeat(50));
  const { data: sales } = await supabase
    .from('sales')
    .select('*')
    .order('created_at', { ascending: false });
  
  sales?.forEach((sale, i) => {
    console.log(`Sale ${i + 1}:`);
    console.log(`  ID: ${sale.id}`);
    console.log(`  Customer: ${sale.customer_name}`);
    console.log(`  Agent ID: ${sale.agent_id}`);
    console.log(`  Agency ID: ${sale.agency_id}`);
    console.log(`  Product ID: ${sale.product_id || 'NULL'}`);
    console.log(`  Premium: $${sale.premium}`);
    console.log(`  Monthly Recurring: $${sale.monthly_recurring || '0'}`);
    console.log(`  Enrollment Fee: $${sale.enrollment_fee || '0'}`);
    console.log(`  First Month Total: $${sale.first_month_total || '0'}`);
    console.log(`  Commission Amount: $${sale.commission_amount || '0'}`);
    console.log(`  Status: ${sale.status}`);
    console.log(`  Client Age: ${sale.client_age || 'NULL'}`);
    console.log(`  Client Income: ${sale.client_income || 'NULL'}`);
    console.log(`  Last Contact: ${sale.last_contact || 'NULL'}`);
    console.log(`  Payment Issues: ${sale.payment_issues || 'NULL'}`);
    console.log(`  Cancelled: ${sale.cancelled_at || 'NULL'}`);
    console.log(`  Created: ${sale.created_at}`);
    console.log('  ---');
  });

  // 4. COMMISSIONS - Complete data
  console.log('\n🟠 COMMISSIONS (All Records):');
  console.log('=' .repeat(50));
  const { data: commissions } = await supabase
    .from('commissions')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (commissions?.length > 0) {
    commissions.forEach((commission, i) => {
      console.log(`Commission ${i + 1}:`);
      console.log(`  ID: ${commission.id}`);
      console.log(`  Amount: $${commission.amount || '0'}`);
      console.log(`  Agent ID: ${commission.agent_id}`);
      console.log(`  Sale ID: ${commission.sale_id}`);
      console.log(`  Status: ${commission.status}`);
      console.log(`  Created: ${commission.created_at}`);
      console.log('  ---');
    });
  } else {
    console.log('❌ NO COMMISSION RECORDS FOUND');
  }

  // 5. TEAMS - Complete data
  console.log('\n🔴 TEAMS (All Records):');
  console.log('=' .repeat(50));
  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (teams?.length > 0) {
    teams.forEach((team, i) => {
      console.log(`Team ${i + 1}:`);
      console.log(`  ID: ${team.id}`);
      console.log(`  Name: ${team.name}`);
      console.log(`  Agency ID: ${team.agency_id}`);
      console.log(`  Manager ID: ${team.manager_id || 'NULL'}`);
      console.log(`  Created: ${team.created_at}`);
      console.log('  ---');
    });
  } else {
    console.log('❌ NO TEAM RECORDS FOUND');
  }

  // 6. AUDIT LOGS - Complete data
  console.log('\n🟣 AUDIT LOGS (All Records):');
  console.log('=' .repeat(50));
  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false });
  
  logs?.forEach((log, i) => {
    console.log(`Audit Log ${i + 1}:`);
    console.log(`  ID: ${log.id}`);
    console.log(`  Agency ID: ${log.agency_id}`);
    console.log(`  User ID: ${log.user_id}`);
    console.log(`  Action: ${log.action}`);
    console.log(`  Resource: ${log.resource_type} (ID: ${log.resource_id})`);
    console.log(`  Changes: ${JSON.stringify(log.changes || {})}`);
    console.log(`  IP: ${log.ip_address || 'NULL'}`);
    console.log(`  User Agent: ${log.user_agent || 'NULL'}`);
    console.log(`  Created: ${log.created_at}`);
    console.log('  ---');
  });

  // 7. DATA RELATIONSHIP ANALYSIS
  console.log('\n📊 DATA RELATIONSHIP ANALYSIS:');
  console.log('=' .repeat(60));

  // User-Agency relationships
  const userAgencyMap = {};
  users?.forEach(user => {
    if (!userAgencyMap[user.agency_id]) {
      userAgencyMap[user.agency_id] = [];
    }
    userAgencyMap[user.agency_id].push({
      id: user.id,
      email: user.email,
      role: user.role,
      agent_id: user.agent_id
    });
  });

  console.log('\n🔗 USER-AGENCY RELATIONSHIPS:');
  Object.keys(userAgencyMap).forEach(agencyId => {
    const agency = agencies?.find(a => a.id === agencyId);
    console.log(`\nAgency: ${agency?.name || 'UNKNOWN'} (ID: ${agencyId})`);
    userAgencyMap[agencyId].forEach(user => {
      console.log(`  └─ ${user.role}: ${user.email} (User ID: ${user.id}, Agent ID: ${user.agent_id || 'NULL'})`);
    });
  });

  // Sales-Agent relationships
  console.log('\n🔗 SALES-AGENT RELATIONSHIPS:');
  const salesByAgent = {};
  sales?.forEach(sale => {
    if (!salesByAgent[sale.agent_id]) {
      salesByAgent[sale.agent_id] = [];
    }
    salesByAgent[sale.agent_id].push(sale);
  });

  Object.keys(salesByAgent).forEach(agentId => {
    const agent = users?.find(u => u.agent_id === agentId);
    const agentSales = salesByAgent[agentId];
    const totalPremium = agentSales.reduce((sum, sale) => sum + (sale.premium || 0), 0);
    const totalCommission = agentSales.reduce((sum, sale) => sum + (sale.commission_amount || 0), 0);
    
    console.log(`\nAgent: ${agent?.full_name || agent?.name || 'UNKNOWN'} (Agent ID: ${agentId})`);
    console.log(`  Email: ${agent?.email || 'UNKNOWN'}`);
    console.log(`  Sales Count: ${agentSales.length}`);
    console.log(`  Total Premium: $${totalPremium}`);
    console.log(`  Total Commission: $${totalCommission}`);
    
    agentSales.forEach(sale => {
      console.log(`  └─ Sale: ${sale.customer_name} - $${sale.premium} (${sale.status})`);
    });
  });

  // 8. DISCREPANCY ANALYSIS
  console.log('\n⚠️  DISCREPANCY ANALYSIS:');
  console.log('=' .repeat(60));

  // Check for orphaned records
  console.log('\n🔍 ORPHANED RECORDS CHECK:');
  
  // Users without valid agencies
  const orphanedUsers = users?.filter(user => 
    !agencies?.some(agency => agency.id === user.agency_id)
  ) || [];
  
  if (orphanedUsers.length > 0) {
    console.log(`❌ ${orphanedUsers.length} Users with invalid agency_id:`);
    orphanedUsers.forEach(user => {
      console.log(`  └─ ${user.email} (agency_id: ${user.agency_id})`);
    });
  } else {
    console.log('✅ All users have valid agency references');
  }

  // Sales without valid agents
  const orphanedSales = sales?.filter(sale => 
    !users?.some(user => user.agent_id === sale.agent_id)
  ) || [];
  
  if (orphanedSales.length > 0) {
    console.log(`❌ ${orphanedSales.length} Sales with invalid agent_id:`);
    orphanedSales.forEach(sale => {
      console.log(`  └─ ${sale.customer_name} (agent_id: ${sale.agent_id})`);
    });
  } else {
    console.log('✅ All sales have valid agent references');
  }

  // Sales without valid agencies
  const salesWithoutAgency = sales?.filter(sale => 
    !agencies?.some(agency => agency.id === sale.agency_id)
  ) || [];
  
  if (salesWithoutAgency.length > 0) {
    console.log(`❌ ${salesWithoutAgency.length} Sales with invalid agency_id:`);
    salesWithoutAgency.forEach(sale => {
      console.log(`  └─ ${sale.customer_name} (agency_id: ${sale.agency_id})`);
    });
  } else {
    console.log('✅ All sales have valid agency references');
  }

  // Missing commission records
  const salesWithoutCommissions = sales?.filter(sale => 
    !commissions?.some(commission => commission.sale_id === sale.id)
  ) || [];
  
  console.log(`\n💰 COMMISSION ANALYSIS:`);
  console.log(`Sales with commission records: ${(sales?.length || 0) - salesWithoutCommissions.length}`);
  console.log(`Sales missing commissions: ${salesWithoutCommissions.length}`);
  
  if (salesWithoutCommissions.length > 0) {
    console.log('❌ Sales missing commission records:');
    salesWithoutCommissions.forEach(sale => {
      console.log(`  └─ ${sale.customer_name} - $${sale.premium} (Sale ID: ${sale.id})`);
    });
  }

  console.log('\n✅ DATA ANALYSIS COMPLETE');
}

fullDataAnalysis().catch(console.error);