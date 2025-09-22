// Fix just the auth_user_id for admin@phsagency.com
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAuthUserId() {
  console.log('\n=== Fixing auth_user_id for admin@phsagency.com ===\n');

  // First check what agencies exist
  console.log('1. Checking available agencies...');
  const { data: agencies, error: agenciesError } = await supabase
    .from('agencies')
    .select('id, name')
    .limit(10);

  if (agenciesError) {
    console.log('Error checking agencies:', agenciesError.message);
  } else if (agencies && agencies.length > 0) {
    console.log('Available agencies:');
    agencies.forEach(a => console.log(`  - ${a.id}: ${a.name}`));
  }

  // Check if PHS001 exists or if we need to use the existing agency_id
  const currentAgencyId = 'a3333333-3333-3333-3333-333333333333';

  // The correct auth_user_id from Supabase Auth
  const authUserId = 'bbcb1fe8-441d-4748-b233-1f345eac4a23';

  // Update ONLY the auth_user_id, keeping the existing agency_id
  console.log('\n2. Updating auth_user_id in portal_users...');
  console.log('  Setting auth_user_id to:', authUserId);
  console.log('  Keeping agency_id as:', currentAgencyId);

  const { data: updateData, error: updateError } = await supabase
    .from('portal_users')
    .update({
      auth_user_id: authUserId,
      updated_at: new Date().toISOString()
    })
    .eq('email', 'admin@phsagency.com')
    .select();

  if (updateError) {
    console.error('❌ Update failed:', updateError.message);
    return;
  }

  console.log('✅ Update successful!');
  if (updateData && updateData[0]) {
    console.log('Updated record:');
    console.log('  Email:', updateData[0].email);
    console.log('  Auth User ID:', updateData[0].auth_user_id);
    console.log('  Agency ID:', updateData[0].agency_id);
    console.log('  Role:', updateData[0].role);
  }

  // Verify the fix
  console.log('\n3. Verifying the fix...');

  // Check by auth_user_id now
  const { data: verifyData, error: verifyError } = await supabase
    .from('portal_users')
    .select('id, email, role, agency_id, auth_user_id')
    .eq('auth_user_id', authUserId)
    .single();

  if (verifyError) {
    console.error('❌ Verification failed:', verifyError.message);
  } else if (verifyData) {
    console.log('✅ User now found by auth_user_id!');
    console.log('  Email:', verifyData.email);
    console.log('  Role:', verifyData.role);
    console.log('  Agency ID:', verifyData.agency_id);
    console.log('  Auth User ID:', verifyData.auth_user_id);
  }

  // Test the API endpoint
  console.log('\n4. Testing the API endpoint...');

  // First login to get a token
  const loginRes = await fetch('https://insurance.syncedupsolutions.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@phsagency.com',
      password: 'Admin123!'
    })
  });

  if (!loginRes.ok) {
    console.log('❌ Login failed');
    return;
  }

  const loginData = await loginRes.json();
  const authToken = loginRes.headers.get('set-cookie')?.match(/auth_token=([^;]+)/)?.[1];

  if (!authToken) {
    console.log('❌ No auth token received');
    return;
  }

  console.log('✅ Logged in successfully');

  // Test the /api/auth/me endpoint
  const meRes = await fetch('https://insurance.syncedupsolutions.com/api/auth/me', {
    headers: {
      'Cookie': `auth_token=${authToken}`
    }
  });

  console.log('/api/auth/me response status:', meRes.status);

  if (meRes.ok) {
    const meData = await meRes.json();
    console.log('✅ /api/auth/me working!');
    console.log('  Authenticated:', meData.authenticated);
    console.log('  User email:', meData.user?.email);
    console.log('  User role:', meData.user?.role);
  }

  // Now test the dashboard-metrics endpoint
  const metricsRes = await fetch('https://insurance.syncedupsolutions.com/api/manager/dashboard-metrics', {
    headers: {
      'Cookie': `auth_token=${authToken}`
    }
  });

  console.log('/api/manager/dashboard-metrics response status:', metricsRes.status);

  if (metricsRes.ok) {
    const metricsData = await metricsRes.json();
    console.log('✅ Dashboard metrics working!');
  } else {
    const error = await metricsRes.text();
    console.log('Dashboard metrics response:', error);
  }
}

fixAuthUserId().catch(console.error);