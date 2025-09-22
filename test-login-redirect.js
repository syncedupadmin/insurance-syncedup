// Test login redirect path
require('dotenv').config();

async function testLogin() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@phsagency.com',
        password: 'Admin123!'
      })
    });

    const data = await res.json();

    if (data.success) {
      console.log('✅ Login successful');
      console.log('📍 Redirect to:', data.redirect);
      console.log('👤 User role:', data.user.role);

      if (data.redirect === '/admin') {
        console.log('✅ Redirect path is correct! Clean URL without underscore or .html');
      } else {
        console.log('❌ Wrong redirect path. Expected /admin but got:', data.redirect);
      }
    } else {
      console.log('❌ Login failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testLogin();