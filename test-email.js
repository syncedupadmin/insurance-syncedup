// Test script - run with: node test-email.js
const testEmail = async () => {
  const response = await fetch('http://localhost:3000/api/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'welcome',
      to: 'your-email@example.com', // Change this to your email
      data: {
        name: 'Test User',
        temp_password: 'TestPass123!'
      }
    })
  });
  
  const result = await response.json();
  console.log('Email result:', result);
};

testEmail();
