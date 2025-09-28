# 🔐 Convoso API Setup Guide

## Quick Setup (3 Methods)

### Method 1: Interactive Script (EASIEST)

```bash
node add-convoso-credentials.js
```

Follow the prompts to:
1. Select your agency
2. Enter API credentials
3. Confirm and save

---

### Method 2: Supabase Dashboard (VISUAL)

1. Go to **Supabase Dashboard** → https://supabase.com
2. Select your project
3. Click **Table Editor** (left sidebar)
4. Select **agencies** table
5. Find your agency row
6. Click the **api_credentials** cell
7. Paste this JSON (replace with your actual credentials):

```json
{
  "convoso": {
    "api_key": "your-actual-api-key-here",
    "api_secret": "your-actual-secret-here",
    "account_id": "your-account-id",
    "base_url": "https://api.convoso.com",
    "enabled": true
  }
}
```

8. Click **Save**

---

### Method 3: SQL Query (ADVANCED)

1. Go to **SQL Editor** in Supabase Dashboard
2. Run this query (replace placeholders):

```sql
-- Find your agency ID first
SELECT id, name, code FROM agencies WHERE is_active = true;

-- Then update with your actual values
UPDATE agencies
SET api_credentials = jsonb_set(
  COALESCE(api_credentials, '{}'::jsonb),
  '{convoso}',
  '{
    "api_key": "YOUR_ACTUAL_API_KEY",
    "api_secret": "YOUR_ACTUAL_SECRET",
    "account_id": "YOUR_ACCOUNT_ID",
    "base_url": "https://api.convoso.com",
    "enabled": true
  }'::jsonb
)
WHERE id = 'YOUR-AGENCY-UUID-HERE';

-- Verify it saved
SELECT name, api_credentials->'convoso' as convoso_config
FROM agencies
WHERE id = 'YOUR-AGENCY-UUID-HERE';
```

---

## Testing Your Setup

### Test 1: Check if credentials are saved

```bash
node check-agencies-structure.js
```

Look for your agency's `api_credentials` → should show your Convoso config.

### Test 2: Test API connection

Create `test-convoso-connection.js`:

```javascript
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConnection() {
  // Get your agency
  const { data: agencies } = await supabase
    .from('agencies')
    .select('id, name, api_credentials')
    .eq('code', 'YOUR-AGENCY-CODE') // Change this
    .single();

  if (!agencies?.api_credentials?.convoso) {
    console.log('❌ No Convoso credentials found');
    return;
  }

  const { api_key, base_url } = agencies.api_credentials.convoso;

  console.log('🔍 Testing Convoso API Connection...');
  console.log(`Base URL: ${base_url}`);
  console.log(`API Key: ${api_key.substring(0, 10)}...`);

  // Test API call (adjust endpoint based on Convoso docs)
  const testUrl = `${base_url}/v1/ping`; // Or whatever their test endpoint is

  // Make test request here
  console.log('✅ Connection test would go here');
  console.log('Check Convoso API docs for correct test endpoint');
}

testConnection();
```

---

## Convoso API Integration Points

### Where Credentials Are Used:

1. **`/api/admin/convoso-config`** - Get/update Convoso settings
2. **`/api/admin/convoso-monitor`** - Monitor Convoso integration
3. **`/api/admin/convoso-leads-search`** - Search Convoso leads
4. **`/api/integrations/convoso/validate`** - Validate credentials
5. **`/api/integrations/convoso/campaigns`** - Get campaigns

### Frontend Pages:

- **`/admin/convoso-monitor.html`** - Main Convoso dashboard
- **`/admin/convoso-leads.html`** - Lead management

---

## Common Issues

### Issue 1: "Cannot find Convoso credentials"

**Solution:** Make sure `api_credentials` column has the correct structure:

```json
{
  "convoso": {
    "api_key": "...",
    "enabled": true
  }
}
```

### Issue 2: "API connection failed"

**Check:**
1. Is the API key correct?
2. Is `base_url` correct? (usually `https://api.convoso.com`)
3. Does your Convoso account have API access enabled?
4. Are there IP restrictions on your Convoso account?

### Issue 3: "Settings table not found"

The error `portal_settings does not exist` is normal - the system falls back to demo data.

To create the table:

```sql
CREATE TABLE IF NOT EXISTS portal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT,
  value_type TEXT DEFAULT 'string',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, category, setting_key)
);
```

---

## Quick Commands Cheat Sheet

```bash
# Check current setup
node check-agencies-structure.js

# Add credentials interactively
node add-convoso-credentials.js

# Verify fix worked
node verify-fix.js

# Run diagnostics
node ultra-diagnostic.js
```

---

## Support

If you're still having issues:

1. Check Convoso API documentation for latest endpoints
2. Verify your API key hasn't expired
3. Test with Postman/curl first to isolate the issue
4. Check Vercel logs for detailed error messages

---

## Example: Complete Setup Flow

```bash
# Step 1: Add credentials
node add-convoso-credentials.js
# Select agency: 1
# API Key: abc123...
# API Secret: xyz789...
# Account ID: 12345
# Base URL: (press enter for default)
# Save? y

# Step 2: Verify
node check-agencies-structure.js
# Should show Convoso in api_credentials

# Step 3: Test in browser
# Go to: https://insurance.syncedupsolutions.com/admin/convoso-monitor.html
# Should see Convoso dashboard (might show connection error if API key is test)

# Step 4: Deploy if needed
git add .
git commit -m "Add Convoso API credentials"
git push origin main
```

---

**That's it! Your Convoso integration should now be configured.** 🎉