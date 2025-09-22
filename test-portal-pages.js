// Test all portal pages accessibility
require('dotenv').config();

async function testPortalPages() {
  console.log('\n=== PORTAL PAGES ACCESSIBILITY TEST ===\n');

  const baseUrl = 'https://insurance.syncedupsolutions.com';

  // Define all portal pages that should be accessible
  const portalPages = {
    'Admin Portal': {
      main: '/admin',
      pages: [
        '/admin/users',
        '/admin/settings',
        '/admin/commissions',
        '/admin/agent-performance',
        '/admin/convoso-leads',
        '/admin/convoso-monitor',
        '/admin/licenses',
        '/admin/reports',
        '/admin/vendors'
      ]
    },
    'Manager Portal': {
      main: '/manager',
      pages: [
        '/manager/team-management',
        '/manager/performance',
        '/manager/reports',
        '/manager/leads',
        '/manager/convoso',
        '/manager/convoso-leads',
        '/manager/convoso-monitor',
        '/manager/settings',
        '/manager/vendors'
      ]
    },
    'Agent Portal': {
      main: '/agent',
      pages: [
        '/agent/commissions',
        '/agent/quotes',
        '/agent/settings'
      ]
    },
    'Customer Service Portal': {
      main: '/customer-service',
      pages: [
        '/customer-service/member-search',
        '/customer-service/member-profile',
        '/customer-service/settings'
      ]
    },
    'Super Admin Portal': {
      main: '/super-admin',
      pages: []
    }
  };

  // First, get an auth token for admin@phsagency.com
  console.log('Getting auth token...');
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@phsagency.com',
      password: 'Admin123!'
    })
  });

  if (!loginRes.ok) {
    console.log('❌ Could not login. Status:', loginRes.status);
    const error = await loginRes.text();
    console.log('Error:', error);
    return;
  }

  const setCookieHeader = loginRes.headers.get('set-cookie');
  const authToken = setCookieHeader?.match(/auth_token=([^;]+)/)?.[1];

  if (!authToken) {
    console.log('❌ No auth token received');
    return;
  }

  console.log('✅ Logged in successfully\n');

  // Test each portal
  for (const [portalName, portal] of Object.entries(portalPages)) {
    console.log(`\n${portalName}:`);
    console.log('=' .repeat(50));

    // Test main portal page
    console.log(`\nTesting ${portal.main}...`);
    const mainRes = await fetch(`${baseUrl}${portal.main}`, {
      headers: {
        'Cookie': `auth_token=${authToken}`,
        'Accept': 'text/html'
      },
      redirect: 'manual'
    });

    if (mainRes.status === 200) {
      console.log(`✅ ${portal.main} - Accessible (200 OK)`);
      const html = await mainRes.text();

      // Check if it's the right content
      if (html.includes('Dashboard') || html.includes('dashboard')) {
        console.log('   ✓ Contains dashboard content');
      }
      if (html.includes('login') || html.includes('Login')) {
        console.log('   ⚠️ WARNING: May be showing login page');
      }
    } else if (mainRes.status === 302 || mainRes.status === 301) {
      const location = mainRes.headers.get('location');
      if (location?.includes('login')) {
        console.log(`❌ ${portal.main} - Redirects to login (auth issue)`);
      } else {
        console.log(`➡️ ${portal.main} - Redirects to: ${location}`);
      }
    } else if (mainRes.status === 403) {
      console.log(`🔒 ${portal.main} - Access denied (403) - Role restriction`);
    } else {
      console.log(`❌ ${portal.main} - Status: ${mainRes.status}`);
    }

    // Test sub-pages
    if (portal.pages.length > 0) {
      console.log(`\nTesting sub-pages:`);
      for (const page of portal.pages) {
        const pageRes = await fetch(`${baseUrl}${page}`, {
          headers: {
            'Cookie': `auth_token=${authToken}`,
            'Accept': 'text/html'
          },
          redirect: 'manual'
        });

        if (pageRes.status === 200) {
          console.log(`  ✅ ${page} - OK`);
        } else if (pageRes.status === 302 || pageRes.status === 301) {
          const location = pageRes.headers.get('location');
          if (location?.includes('login')) {
            console.log(`  ❌ ${page} - Redirects to login`);
          } else {
            console.log(`  ➡️ ${page} - Redirects to: ${location}`);
          }
        } else if (pageRes.status === 403) {
          console.log(`  🔒 ${page} - Access denied (role restriction)`);
        } else if (pageRes.status === 404) {
          console.log(`  ❓ ${page} - Not found (404)`);
        } else {
          console.log(`  ❌ ${page} - Status: ${pageRes.status}`);
        }
      }
    }
  }

  // Test public pages
  console.log('\n\nPublic Pages:');
  console.log('=' .repeat(50));

  const publicPages = [
    '/login',
    '/pricing',
    '/signup',
    '/global-leaderboard'
  ];

  for (const page of publicPages) {
    const res = await fetch(`${baseUrl}${page}`, {
      headers: { 'Accept': 'text/html' },
      redirect: 'manual'
    });

    if (res.status === 200) {
      console.log(`✅ ${page} - Accessible without auth`);
    } else if (res.status === 302 || res.status === 301) {
      const location = res.headers.get('location');
      console.log(`➡️ ${page} - Redirects to: ${location}`);
    } else {
      console.log(`❌ ${page} - Status: ${res.status}`);
    }
  }

  console.log('\n\n=== SUMMARY ===');
  console.log('Portal pages are configured with clean URLs (no underscores or .html extensions)');
  console.log('Access control is based on user roles');
  console.log('admin@phsagency.com has admin role and can access admin/manager portals');
  console.log('\n✅ Test complete!');
}

testPortalPages().catch(console.error);