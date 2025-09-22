// Fix admin@phsagency.com in portal_users table
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixUser() {
  console.log('\n=== Fixing admin@phsagency.com in portal_users ===\n');

  // The correct auth_user_id from Supabase Auth
  const authUserId = 'bbcb1fe8-441d-4748-b233-1f345eac4a23';
  const correctAgencyId = 'PHS001';

  // Update the portal_users record
  console.log('Updating portal_users record...');
  console.log('  Setting auth_user_id to:', authUserId);
  console.log('  Setting agency_id to:', correctAgencyId);

  const { data: updateData, error: updateError } = await supabase
    .from('portal_users')
    .update({
      auth_user_id: authUserId,
      agency_id: correctAgencyId,
      updated_at: new Date().toISOString()
    })
    .eq('email', 'admin@phsagency.com')
    .select();

  if (updateError) {
    console.error('❌ Update failed:', updateError.message);
    return;
  }

  console.log('✅ Update successful!');
  console.log('Updated record:', JSON.stringify(updateData[0], null, 2));

  // Verify the fix
  console.log('\n=== Verifying the fix ===\n');

  // Check by auth_user_id now
  const { data: verifyData, error: verifyError } = await supabase
    .from('portal_users')
    .select('*')
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

  // Test the problematic API endpoint
  console.log('\n=== Testing dashboard-metrics API ===\n');

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

  // Now test the dashboard-metrics endpoint
  const metricsRes = await fetch('https://insurance.syncedupsolutions.com/api/manager/dashboard-metrics', {
    headers: {
      'Cookie': `auth_token=${authToken}`
    }
  });

  console.log('Dashboard-metrics response status:', metricsRes.status);

  if (metricsRes.ok) {
    const metricsData = await metricsRes.json();
    console.log('✅ Dashboard metrics working!');
    console.log('  Success:', metricsData.success);
  } else {
    const error = await metricsRes.text();
    console.log('❌ Dashboard metrics still failing:', error);
  }
}

fixUser().catch(console.error);