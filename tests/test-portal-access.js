// Test portal access with super-admin login
const testPortalAccess = async () => {
  const baseUrl = 'https://insurance-syncedup-ge654gjod-nicks-projects-f40381ea.vercel.app';
  
  // Step 1: Login as super-admin
  console.log('🔐 Step 1: Logging in as super-admin...');
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@syncedupsolutions.com',
      password: 'TestPassword123!'
    })
  });

  const loginData = await loginResponse.json();
  if (!loginResponse.ok) {
    console.error('❌ Login failed:', loginData.error);
    return;
  }

  console.log('✅ Login successful!');
  console.log('   User role:', loginData.user.role);
  console.log('   Token generated:', !!loginData.token);

  // Step 2: Check what's stored in localStorage format
  console.log('\n📦 Step 2: Checking storage format...');
  console.log('   Token key should be: syncedup_token');
  console.log('   User key should be: syncedup_user');
  console.log('   User data format:');
  console.log('   -', JSON.stringify(loginData.user, null, 2));

  // Step 3: Test portal page access by examining HTML
  const portals = [
    { name: 'Admin', path: '/admin/index.html', expectedRoles: ['manager', 'admin', 'super-admin'] },
    { name: 'Manager', path: '/manager/index.html', expectedRoles: ['manager', 'admin', 'super-admin'] },
    { name: 'Agent', path: '/agent/index.html', expectedRoles: ['agent', 'manager', 'admin', 'super-admin'] },
    { name: 'Customer Service', path: '/customer-service/index.html', expectedRoles: ['customer-service', 'manager', 'admin', 'super-admin'] }
  ];

  console.log('\n🔍 Step 3: Testing portal HTML authentication logic...');
  
  for (const portal of portals) {
    console.log(`\n--- ${portal.name} Portal ---`);
    
    try {
      const response = await fetch(`${baseUrl}${portal.path}`);
      if (response.ok) {
        const html = await response.text();
        
        // Check if the page uses syncedup_user key
        const usesSyncedUpUser = html.includes('syncedup_user');
        const usesGenericUser = html.includes("localStorage.getItem('user')");
        
        // Check role validation logic
        const hasIncludesCheck = html.includes('.includes(') && html.includes('role');
        const includesRoleChecks = html.match(/\[.*?\]\.includes\([^)]*role[^)]*\)/g);
        
        console.log(`   Uses syncedup_user: ${usesSyncedUpUser ? '✅' : '❌'}`);
        console.log(`   Uses generic 'user': ${usesGenericUser ? '⚠️' : '✅'}`);
        console.log(`   Has .includes() check: ${hasIncludesCheck ? '✅' : '❌'}`);
        
        if (includesRoleChecks) {
          includesRoleChecks.forEach((check, i) => {
            const includesSuperAdmin = check.includes('super-admin');
            console.log(`   Role check ${i+1}: ${includesSuperAdmin ? '✅' : '❌'} ${check}`);
          });
        }
        
        // Check if it redirects to the right login URL
        const loginRedirects = html.match(/window\.location\.href\s*=\s*['"][^'"]*login[^'"]*['"]/g);
        if (loginRedirects) {
          console.log(`   Login redirects:`, loginRedirects);
        }
        
      } else {
        console.log(`   ❌ Could not fetch page (${response.status})`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n🎯 DIAGNOSIS:');
  console.log('If you see ❌ for "Uses syncedup_user" or "super-admin in role check",');
  console.log('that explains why the portal redirects to login!');
};

testPortalAccess().catch(console.error);