# Edge Function CORS Fix Needed

The admin-gateway Edge Function is still throwing CORS errors when called from https://insurance.syncedupsolutions.com

Error:
```
Access to fetch at 'https://zgkszwkxibpnxhvlenct.supabase.co/functions/v1/admin-gateway/reset-password'
from origin 'https://insurance.syncedupsolutions.com' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

Please update the admin-gateway Edge Function to include proper CORS headers for ALL endpoints:
- /users
- /reset-password
- /tables

The CORS headers should:
1. Allow origin: https://insurance.syncedupsolutions.com
2. Allow methods: GET, POST, OPTIONS
3. Allow headers: Authorization, Content-Type
4. Handle preflight OPTIONS requests

This is critical for the super admin dashboard to work properly. The CORS middleware needs to be applied to ALL routes in the Edge Function.