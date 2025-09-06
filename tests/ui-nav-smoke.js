// Basic smoke test for UI navigation
// Run with: node tests/ui-nav-smoke.js

const http = require('http');

function testEndpoint(path, expectedTitle) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const hasExpectedTitle = data.includes(expectedTitle);
          const hasNoHorizontalScroll = !data.includes('overflow-x: scroll');
          const hasMenuButton = data.includes('id="menuBtn"');
          const hasSidebar = data.includes('id="sidebar"');
          const hasResponsiveTable = data.includes('class="responsive"');
          
          console.log(`✅ ${path}: Status ${res.statusCode}`);
          console.log(`   Title check: ${hasExpectedTitle ? '✅' : '❌'}`);
          console.log(`   Menu button: ${hasMenuButton ? '✅' : '❌'}`);
          console.log(`   Sidebar: ${hasSidebar ? '✅' : '❌'}`);
          console.log(`   Responsive tables: ${hasResponsiveTable ? '✅' : '❌'}`);
          console.log(`   No horizontal scroll: ${hasNoHorizontalScroll ? '✅' : '❌'}`);
          
          resolve(hasExpectedTitle && hasMenuButton && hasSidebar && hasResponsiveTable);
        } else {
          console.log(`❌ ${path}: Status ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ ${path}: ${error.message}`);
      resolve(false);
    });

    req.setTimeout(5000, () => {
      console.log(`❌ ${path}: Timeout`);
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function runSmokeTests() {
  console.log('🧪 Running UI Navigation Smoke Tests...\n');
  
  const tests = [
    ['/manager', 'Manager Dashboard'],
    ['/css/ui-refresh.css', '--bg:#0F172A'],
    ['/js/ui-refresh.js', 'sidebar.classList.toggle']
  ];

  let passed = 0;
  for (const [path, expected] of tests) {
    const result = await testEndpoint(path, expected);
    if (result) passed++;
    console.log('');
  }

  console.log(`\n📊 Results: ${passed}/${tests.length} tests passed`);
  
  if (passed === tests.length) {
    console.log('🎉 All smoke tests passed!');
    console.log('\n🔗 Test the manager dashboard at: http://localhost:3001/manager');
    console.log('📱 Try mobile view (DevTools > Toggle Device Toolbar)');
    console.log('🖱️ Click the menu button (☰) to toggle sidebar');
    process.exit(0);
  } else {
    console.log('💥 Some tests failed. Check the dev server is running on port 3001');
    process.exit(1);
  }
}

runSmokeTests();