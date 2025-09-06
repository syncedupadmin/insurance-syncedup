const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testLogin() {
  try {
    const response = await fetch('https://insurance-syncedup-3la2c8k7r-nicks-projects-f40381ea.vercel.app/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@syncedupsolutions.com',
        password: 'TestPassword123!'
      })
    });

    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.text();
    console.log('Response body:', data);

  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();