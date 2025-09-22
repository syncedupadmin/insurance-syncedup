const { chromium } = require('playwright');

async function testLoginRouting() {
    const browser = await chromium.launch({ 
        headless: false, // Show browser for visual confirmation
        slowMo: 500 // Slow down actions to see what's happening
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const baseUrl = 'https://insurance.syncedupsolutions.com';
    
    // Test users
    const users = [
        { email: 'admin@phsagency.com', role: 'admin', expectedUrl: '/admin' },
        { email: 'manager@phsagency.com', role: 'manager', expectedUrl: '/manager' },
        { email: 'agent1@phsagency.com', role: 'agent', expectedUrl: '/agent' }
    ];
    
    console.log('🧪 Testing Login Routing for All User Types\n');
    console.log('='.'repeat(60));
    
    for (const user of users) {
        console.log(`\n📍 Testing: ${user.email} (${user.role})`);
        
        try {
            // Navigate to login
            await page.goto(`${baseUrl}/login`);
            console.log('   ✓ Loaded login page');
            
            // Clear any existing session
            await page.evaluate(() => {
                document.cookie.split(";").forEach(c => {
                    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });
            });
            
            // Fill login form
            await page.fill('input[type="email"]', user.email);
            await page.fill('input[type="password"]', 'password123'); // Use actual password
            console.log('   ✓ Filled login form');
            
            // Submit form
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle' }),
                page.click('button[type="submit"]')
            ]);
            console.log('   ✓ Submitted form');
            
            // Check final URL
            const finalUrl = page.url();
            const urlPath = new URL(finalUrl).pathname;
            
            console.log(`   📍 Redirected to: ${urlPath}`);
            
            // Verify correct redirect
            if (urlPath === user.expectedUrl || urlPath === `${user.expectedUrl}/`) {
                console.log(`   ✅ PASS: Correctly redirected to ${user.expectedUrl}`);
            } else {
                console.log(`   ❌ FAIL: Expected ${user.expectedUrl}, got ${urlPath}`);
            }
            
            // Check for CSS loading
            const cssErrors = await page.$$eval('link[rel="stylesheet"]', links => {
                return links.map(link => {
                    const href = link.getAttribute('href');
                    // Check if CSS loaded (simplified check)
                    return { href, loaded: !!link.sheet };
                }).filter(css => !css.loaded);
            });
            
            if (cssErrors.length > 0) {
                console.log(`   ⚠️ CSS Loading Issues:`, cssErrors);
            } else {
                console.log(`   ✓ All CSS loaded successfully`);
            }
            
            // Check for console errors
            const consoleErrors = [];
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    consoleErrors.push(msg.text());
                }
            });
            
            await page.waitForTimeout(2000); // Wait for any async errors
            
            if (consoleErrors.length > 0) {
                console.log(`   ⚠️ Console Errors:`, consoleErrors);
            } else {
                console.log(`   ✓ No console errors`);
            }
            
            // Logout for next test
            await page.goto(`${baseUrl}/api/auth/logout`, { method: 'POST' });
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Testing Complete\n');
    
    await browser.close();
}

// Run the test
testLoginRouting().catch(console.error);