// Test the fixed portal access
const testPortalAccessFixed = async () => {
  const baseUrl = 'https://insurance-syncedup-llwt48vn1-nicks-projects-f40381ea.vercel.app';
  
  // Test login first
  console.log('🔐 Testing login...');
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

  console.log('✅ Login successful! Role:', loginData.user.role);

  // Test portal access by simulating browser behavior
  const portals = [
    { name: 'Admin Portal', url: '/admin/index.html' },
    { name: 'Manager Portal', url: '/manager/index.html' },
    { name: 'Agent Portal', url: '/agent/index.html' },
    { name: 'Customer Service Portal', url: '/customer-service/index.html' }
  ];

  console.log('\n🚪 Testing portal access...\n');

  for (const portal of portals) {
    try {
      const response = await fetch(`${baseUrl}${portal.url}`);
      
      if (response.ok) {
        const html = await response.text();
        
        // Check if it still has hardcoded production URLs
        const hasProductionURL = html.includes('https://insurance.syncedupsolutions.com/login.html');
        const hasRelativeURL = html.includes('"/login.html"') || html.includes("'/login.html'");
        
        console.log(`${portal.name}:`);
        console.log(`  📄 Page loads: ✅`);
        console.log(`  🔗 Uses relative login URL: ${hasRelativeURL ? '✅' : '❌'}`);
        console.log(`  ⚠️  Has hardcoded production URL: ${hasProductionURL ? '❌ (needs fix)' : '✅'}`);
        console.log(`  🔑 URL: ${baseUrl}${portal.url}`);
        console.log('');
        
      } else {
        console.log(`${portal.name}: ❌ Failed to load (${response.status})\n`);
      }
    } catch (error) {
      console.log(`${portal.name}: ❌ Error - ${error.message}\n`);
    }
  }

  console.log('🧪 MANUAL TEST INSTRUCTIONS:');
  console.log('1. Go to:', `${baseUrl}/login.html`);
  console.log('2. Login with: admin@syncedupsolutions.com / TestPassword123!');
  console.log('3. After login, manually visit these URLs to test:');
  portals.forEach(portal => {
    console.log(`   • ${portal.name}: ${baseUrl}${portal.url}`);
  });
  console.log('\n✨ Each portal should now load properly instead of redirecting to login!');
};

testPortalAccessFixed().catch(console.error);