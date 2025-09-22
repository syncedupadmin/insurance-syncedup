// Test the simplified login API
const testSimpleLogin = async () => {
  const baseUrl = 'https://insurance-syncedup-kxjhr004u-nicks-projects-f40381ea.vercel.app';
  
  try {
    console.log('Testing simplified login API...');
    
    const response = await fetch(`${baseUrl}/api/auth/test-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'admin@syncedupsolutions.com', 
        password: 'TestPassword123!' 
      })
    });

    console.log('Status:', response.status);
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ Simple test login works! Now let\'s fix the main login API.');
    } else {
      console.log('❌ Even simple test failed');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

testSimpleLogin();