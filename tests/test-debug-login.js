// Test the login API with debugging
const testDebugLogin = async () => {
  const baseUrl = 'https://insurance-syncedup-ixpwcjxii-nicks-projects-f40381ea.vercel.app';
  
  try {
    console.log('Testing debug login API...');
    
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'admin@syncedupsolutions.com', 
        password: 'TestPassword123!' 
      })
    });

    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response text:', responseText);
    
    try {
      const data = JSON.parse(responseText);
      console.log('Response JSON:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('Not JSON, raw response:', responseText.substring(0, 300));
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

testDebugLogin();