// Debug server error
const debugError = async () => {
  const testEmail = 'admin@syncedupsolutions.com';
  const testPassword = 'TestPassword123!';
  const baseUrl = 'https://insurance-syncedup-j2icwpncu-nicks-projects-f40381ea.vercel.app';

  try {
    console.log('Debugging server error...');

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });

    console.log('Response status:', loginResponse.status);
    console.log('Response headers:', Object.fromEntries(loginResponse.headers.entries()));
    
    const responseText = await loginResponse.text();
    console.log('Response text:', responseText);
    
    // Try to parse as JSON
    try {
      const jsonData = JSON.parse(responseText);
      console.log('JSON data:', jsonData);
    } catch (e) {
      console.log('Not valid JSON, raw response:', responseText.substring(0, 200));
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
};

debugError();