// COMPREHENSIVE LOGIN FLOW ANALYSIS FOR admin@phsagency.com
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fullLoginAnalysis() {
  console.log('\n' + '='.repeat(80));
  console.log('COMPREHENSIVE LOGIN ANALYSIS FOR admin@phsagency.com');
  console.log('='.repeat(80) + '\n');

  const email = 'admin@phsagency.com';
  const password = 'Admin123!';

  // STEP 1: Check Database State
  console.log('STEP 1: DATABASE STATE CHECK');
  console.log('-'.repeat(40));

  // Check Supabase Auth
  console.log('\n1.1 Supabase Auth Status:');
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers?.users.find(u => u.email === email);

  if (authUser) {
    console.log('✅ User exists in Supabase Auth');
    console.log('   ID:', authUser.id);
    console.log('   Email:', authUser.email);
    console.log('   Email Confirmed:', authUser.email_confirmed_at ? 'YES' : 'NO');
    console.log('   Created:', authUser.created_at);
    console.log('   Last Sign In:', authUser.last_sign_in_at);
    console.log('   Metadata:', JSON.stringify({
      app: authUser.app_metadata,
      user: authUser.user_metadata
    }, null, 2));
  } else {
    console.log('❌ User NOT in Supabase Auth!');
  }

  // Check portal_users
  console.log('\n1.2 Portal Users Table:');
  const { data: portalUser } = await supabase
    .from('portal_users')
    .select('*')
    .eq('email', email)
    .single();

  if (portalUser) {
    console.log('✅ User exists in portal_users');
    console.log('   ID:', portalUser.id);
    console.log('   Email:', portalUser.email);
    console.log('   Role:', portalUser.role);
    console.log('   Agency ID:', portalUser.agency_id);
    console.log('   Auth User ID:', portalUser.auth_user_id || 'NULL');
    console.log('   Active:', portalUser.is_active);
    console.log('   Must Change Password:', portalUser.must_change_password);
  } else {
    console.log('❌ User NOT in portal_users!');
  }

  // STEP 2: Test Login API
  console.log('\n\nSTEP 2: LOGIN API TEST');
  console.log('-'.repeat(40));

  console.log('\n2.1 Testing /api/auth/login...');
  const loginRes = await fetch('https://insurance.syncedupsolutions.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  console.log('Response Status:', loginRes.status);
  const loginData = await loginRes.json();

  if (loginData.success) {
    console.log('✅ Login API returned success');
    console.log('   Redirect Path:', loginData.redirect);
    console.log('   User Role:', loginData.user?.role);
    console.log('   User Email:', loginData.user?.email);
    console.log('   User ID:', loginData.user?.id);
    console.log('   Agency ID:', loginData.user?.agency_id);
  } else {
    console.log('❌ Login API failed');
    console.log('   Error:', loginData.error);
  }

  // Get the cookie
  const setCookieHeader = loginRes.headers.get('set-cookie');
  const authToken = setCookieHeader?.match(/auth_token=([^;]+)/)?.[1];

  if (authToken) {
    console.log('✅ Auth token cookie received');
    console.log('   Token (first 20 chars):', authToken.substring(0, 20) + '...');
  } else {
    console.log('❌ No auth token cookie!');
  }

  // STEP 3: Test Auth Verification
  console.log('\n\nSTEP 3: AUTHENTICATION VERIFICATION');
  console.log('-'.repeat(40));

  if (authToken) {
    console.log('\n3.1 Testing /api/auth/me...');
    const meRes = await fetch('https://insurance.syncedupsolutions.com/api/auth/me', {
      headers: { 'Cookie': `auth_token=${authToken}` }
    });

    console.log('Response Status:', meRes.status);

    if (meRes.ok) {
      const meData = await meRes.json();
      console.log('✅ Auth verification successful');
      console.log('   Authenticated:', meData.authenticated);
      console.log('   User:', meData.user?.email);
      console.log('   Role:', meData.user?.role);
    } else {
      const error = await meRes.text();
      console.log('❌ Auth verification failed:', error);
    }
  }

  // STEP 4: Test Portal Access
  console.log('\n\nSTEP 4: PORTAL ACCESS TEST');
  console.log('-'.repeat(40));

  if (authToken && loginData.redirect) {
    console.log('\n4.1 Testing portal page access...');
    console.log('Attempting to access:', loginData.redirect);

    const portalRes = await fetch(`https://insurance.syncedupsolutions.com${loginData.redirect}`, {
      headers: {
        'Cookie': `auth_token=${authToken}`,
        'Accept': 'text/html'
      },
      redirect: 'manual' // Don't follow redirects automatically
    });

    console.log('Response Status:', portalRes.status);
    console.log('Response Type:', portalRes.headers.get('content-type'));

    if (portalRes.status === 302 || portalRes.status === 301) {
      const redirectTo = portalRes.headers.get('location');
      console.log('❌ Portal is redirecting to:', redirectTo);

      if (redirectTo?.includes('login')) {
        console.log('   ⚠️ Being redirected back to login!');
        console.log('   This means authentication is failing at the portal level');
      }
    } else if (portalRes.status === 200) {
      console.log('✅ Portal page loaded successfully');
      const html = await portalRes.text();

      // Check if it's actually the admin dashboard
      if (html.includes('Admin Dashboard') || html.includes('admin-dashboard')) {
        console.log('   ✅ Confirmed: Admin dashboard HTML received');
      } else if (html.includes('login') || html.includes('Sign In')) {
        console.log('   ❌ Got login page instead of dashboard!');
      } else {
        console.log('   ⚠️ Got some HTML but unclear what page');
        console.log('   First 200 chars:', html.substring(0, 200));
      }
    } else {
      console.log('❌ Unexpected status:', portalRes.status);
    }
  }

  // STEP 5: Test Portal Guard
  console.log('\n\nSTEP 5: PORTAL GUARD TEST');
  console.log('-'.repeat(40));

  if (authToken) {
    console.log('\n5.1 Testing /api/portal-guard...');
    const guardRes = await fetch('https://insurance.syncedupsolutions.com/api/portal-guard', {
      headers: {
        'Cookie': `auth_token=${authToken}`,
        'X-Requested-Path': '/admin'
      }
    });

    console.log('Portal Guard Status:', guardRes.status);

    if (guardRes.status === 302) {
      const location = guardRes.headers.get('location');
      console.log('Portal Guard Redirect:', location);

      if (location?.includes('login')) {
        console.log('❌ Portal guard is denying access!');
      } else if (location?.includes('/_admin')) {
        console.log('✅ Portal guard allowing access to /_admin');
      }
    }
  }

  // STEP 6: Client-Side Issues
  console.log('\n\nSTEP 6: CLIENT-SIDE ANALYSIS');
  console.log('-'.repeat(40));

  console.log('\n6.1 What happens after redirect:');
  console.log('1. Browser receives redirect to /admin');
  console.log('2. /admin is rewritten to /_admin/index.html (per vercel.json)');
  console.log('3. Admin dashboard JavaScript runs');
  console.log('4. JavaScript calls /api/auth/me to verify auth');
  console.log('5. If auth fails, JavaScript redirects to /login');

  console.log('\n6.2 Possible client-side issues:');
  console.log('- Cookie not being sent properly by browser');
  console.log('- JavaScript auth check failing');
  console.log('- LocalStorage/SessionStorage conflicts');
  console.log('- Browser caching old auth state');

  // STEP 7: Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('ANALYSIS SUMMARY');
  console.log('='.repeat(80));

  console.log('\nAUTHENTICATION CHAIN STATUS:');
  console.log('1. Database: ' + (authUser && portalUser ? '✅ User exists' : '❌ User missing'));
  console.log('2. Login API: ' + (loginData.success ? '✅ Success' : '❌ Failed'));
  console.log('3. Auth Cookie: ' + (authToken ? '✅ Set' : '❌ Not set'));
  console.log('4. Auth Verification: Depends on cookie');
  console.log('5. Portal Access: Depends on auth verification');

  console.log('\nMOST LIKELY ISSUES:');
  if (!authUser) {
    console.log('❌ CRITICAL: User not in Supabase Auth!');
  }
  if (!portalUser) {
    console.log('❌ CRITICAL: User not in portal_users!');
  }
  if (portalUser && !portalUser.auth_user_id) {
    console.log('⚠️ WARNING: auth_user_id is NULL in portal_users');
  }
  if (portalUser && portalUser.auth_user_id !== authUser?.id) {
    console.log('❌ CRITICAL: auth_user_id mismatch!');
    console.log('   Portal:', portalUser.auth_user_id);
    console.log('   Auth:', authUser?.id);
  }

  console.log('\nRECOMMENDED BROWSER TROUBLESHOOTING:');
  console.log('1. Clear ALL cookies for the domain');
  console.log('2. Clear browser cache');
  console.log('3. Try in Incognito/Private mode');
  console.log('4. Check browser console for JavaScript errors');
  console.log('5. Check Network tab to see actual requests/responses');

  console.log('\n' + '='.repeat(80));
}

fullLoginAnalysis().catch(console.error);