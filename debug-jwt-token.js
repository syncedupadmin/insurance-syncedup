// Debug script to decode and check JWT tokens
// This will help identify what's in the user object causing the UUID error

const instructions = `
🔍 HOW TO DEBUG YOUR JWT TOKEN:

1. Open your browser DevTools (F12)
2. Go to Application/Storage > Cookies
3. Find the cookie named "auth_token" or "session"
4. Copy the value

5. Go to https://jwt.io
6. Paste your token in the "Encoded" section
7. Look at the "Payload" section (decoded data)

WHAT TO CHECK:
- Does "agency_id" exist?
- What is the value of "agency_id"?
- Is it a UUID like "a1111111-1111-1111-1111-111111111111"?
- Or is it a string like "test-agency-001"?

IF agency_id IS "test-agency-001":
  The problem is in the JWT creation - it's using a wrong agency_id
  Check: api/auth/login.js or wherever tokens are created

IF agency_id IS A VALID UUID:
  The problem might be in how we're reading the token
  Check: api/_middleware/authCheck.js

ALTERNATIVE - CHECK DIRECTLY IN CODE:
Run this in the browser console on your admin page:

  document.cookie.split('; ').find(c => c.startsWith('auth_token'))

Then paste the token value here and I'll decode it for you.

OR - Check what the server is receiving:
Look at the logs from requireAuth middleware - it should show the decoded user object.
`;

console.log(instructions);

// If you paste a token here, we can decode it
const token = process.argv[2];

if (token) {
  console.log('\n' + '='.repeat(80));
  console.log('DECODING TOKEN:\n');

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('❌ Invalid JWT format - should have 3 parts separated by dots');
      process.exit(1);
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    console.log('✅ Decoded Payload:');
    console.log(JSON.stringify(payload, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('CHECKING AGENCY_ID:\n');

    if (payload.agency_id) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.agency_id);
      console.log('agency_id:', payload.agency_id);
      console.log('Type:', typeof payload.agency_id);
      console.log('Is UUID:', isUUID ? '✅ YES' : '❌ NO - THIS IS THE PROBLEM!');

      if (!isUUID) {
        console.log('\n⚠️  PROBLEM IDENTIFIED:');
        console.log('   The JWT token has a non-UUID agency_id');
        console.log('   This needs to be fixed in the login/token creation code');
      }
    } else {
      console.log('⚠️  No agency_id found in token payload');
    }

  } catch (error) {
    console.error('❌ Error decoding token:', error.message);
  }
} else {
  console.log('\n💡 To decode a specific token, run:');
  console.log('   node debug-jwt-token.js "your-token-here"');
}