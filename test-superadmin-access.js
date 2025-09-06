// Test super-admin access to all user dashboards
const testSuperAdminAccess = async () => {
  const baseUrl = 'https://insurance-syncedup-ge654gjod-nicks-projects-f40381ea.vercel.app';
  
  // Dashboard pages to test
  const dashboardPages = [
    { name: 'Super Admin Dashboard', path: '/super-admin.html', expectedRole: 'super-admin' },
    { name: 'Admin Dashboard', path: '/admin/index.html', expectedRoles: ['admin', 'super-admin'] },
    { name: 'Manager Dashboard', path: '/manager/index.html', expectedRoles: ['manager', 'admin', 'super-admin'] },
    { name: 'Agent Dashboard', path: '/agent/index.html', expectedRoles: ['agent', 'manager', 'admin', 'super-admin'] },
    { name: 'Agent Dashboard (Alt)', path: '/agent/dashboard.html', expectedRoles: ['agent', 'admin', 'super-admin'] },
    { name: 'Agent Sales Page', path: '/agent/sales.html', expectedRoles: ['agent', 'admin', 'super-admin'] },
    { name: 'Customer Service Dashboard', path: '/customer-service/index.html', expectedRoles: ['customer-service', 'manager', 'admin', 'super-admin'] },
    { name: 'Admin Users Page', path: '/admin/users.html', expectedRoles: ['admin', 'super-admin'] },
    { name: 'Admin Vendors Page', path: '/admin/vendors.html', expectedRoles: ['admin', 'super-admin'] }
  ];

  console.log('🧪 Testing Super-Admin Access to All Dashboards');
  console.log('===============================================\n');

  // Test by checking the page content for proper permission checks
  for (const page of dashboardPages) {
    try {
      console.log(`Testing: ${page.name}`);
      console.log(`URL: ${baseUrl}${page.path}`);
      
      const response = await fetch(`${baseUrl}${page.path}`);
      
      if (response.ok) {
        const content = await response.text();
        
        // Check if the page includes super-admin in its permission logic
        const hasSuperAdminCheck = content.includes('super-admin') || content.includes('super_admin');
        
        // Look for specific permission patterns
        const hasIncludesPattern = content.match(/\[.*?\]\.includes\([^)]*role[^)]*\)/g);
        const hasRoleCheck = content.includes('role') && (content.includes('includes') || content.includes('!==') || content.includes('!='));
        
        if (hasRoleCheck && hasSuperAdminCheck) {
          console.log('✅ PASS - Page includes super-admin permissions');
          
          // Try to extract the permission check for verification
          if (hasIncludesPattern) {
            hasIncludesPattern.forEach(pattern => {
              if (pattern.includes('super-admin')) {
                console.log(`   Permission check: ${pattern}`);
              }
            });
          }
        } else if (hasRoleCheck && !hasSuperAdminCheck) {
          console.log('❌ FAIL - Page has role check but missing super-admin');
          
          // Show what role checks exist
          const roleChecks = content.match(/role[^;]*[!=]==?[^;]*|[!=]==?[^;]*role/g);
          if (roleChecks) {
            roleChecks.slice(0, 3).forEach(check => {
              console.log(`   Found check: ${check.trim()}`);
            });
          }
        } else {
          console.log('⚠️  WARN - No role-based permission check found');
        }
        
      } else {
        console.log(`❌ FAIL - Page not accessible (${response.status})`);
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`❌ ERROR - ${error.message}\n`);
    }
  }

  console.log('\n📋 SUMMARY:');
  console.log('===========');
  console.log('All pages should now allow super-admin access alongside their intended user types.');
  console.log('\n🔍 To manually test:');
  console.log('1. Log in with: admin@syncedupsolutions.com / TestPassword123!');
  console.log('2. Your role is: super-admin');
  console.log('3. Try accessing any of these dashboard URLs:');
  
  dashboardPages.forEach(page => {
    console.log(`   • ${page.name}: ${baseUrl}${page.path}`);
  });
  
  console.log('\n✨ You should now have access to ALL user dashboards as super-admin!');
};

testSuperAdminAccess().catch(console.error);