// Test forgot password functionality
const testForgotPassword = async () => {
  const testEmail = 'admin@syncedupsolutions.com';
  const apiUrl = 'https://insurance-syncedup-9a1rkch1l-nicks-projects-f40381ea.vercel.app/api/auth/request-reset';

  try {
    console.log('Testing forgot password API...');
    console.log('Email:', testEmail);
    console.log('API URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: testEmail })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('Response data:', data);

    if (response.ok) {
      console.log('✅ SUCCESS: Forgot password request sent successfully!');
      console.log('Message:', data.message || 'Password reset email sent');
    } else {
      console.log('❌ FAILED: Forgot password request failed');
      console.log('Error:', data.error || 'Unknown error');
    }

  } catch (error) {
    console.error('❌ ERROR: Exception occurred:', error.message);
  }
};

// Test with non-existent email
const testWithInvalidEmail = async () => {
  const testEmail = 'nonexistent@example.com';
  const apiUrl = 'https://insurance-syncedup-9a1rkch1l-nicks-projects-f40381ea.vercel.app/api/auth/request-reset';

  try {
    console.log('\n\nTesting forgot password with invalid email...');
    console.log('Email:', testEmail);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: testEmail })
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);

    if (response.status === 404) {
      console.log('✅ SUCCESS: Correctly returned 404 for non-existent email');
    } else {
      console.log('❌ UNEXPECTED: Expected 404 but got', response.status);
    }

  } catch (error) {
    console.error('❌ ERROR: Exception occurred:', error.message);
  }
};

// Run tests
(async () => {
  await testForgotPassword();
  await testWithInvalidEmail();
})();