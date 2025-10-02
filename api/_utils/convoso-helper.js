const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';

function decryptApiKey(encryptedKey) {
  try {
    const parts = encryptedKey.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt API key');
  }
}

async function getConvosoToken(supabase, agencyId) {
  // First, try to get credentials from the new integration system (agencies.api_credentials)
  try {
    console.log('Checking for Convoso credentials in new integration system...');

    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('api_credentials')
      .eq('id', agencyId)
      .single();

    if (!agencyError && agency?.api_credentials?.convoso) {
      const convosoConfig = agency.api_credentials.convoso;

      // Check if integration is enabled
      if (convosoConfig.enabled !== false) {
        // Use api_key or auth_token (some configs might use different field names)
        const token = convosoConfig.api_key || convosoConfig.auth_token;

        if (token) {
          console.log('Found Convoso credentials in new integration system');
          return token;
        }
      }
    }
  } catch (error) {
    console.log('Error checking new integration system:', error);
  }

  // Fallback to old api_keys table
  console.log('Checking for Convoso credentials in old api_keys table...');

  const { data: keys, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('service', 'convoso')
    .eq('status', 'active')
    .limit(1);

  if (error) {
    if (error.message?.includes('does not exist') || error.code === 'PGRST116') {
      console.log('api_keys table does not exist yet');
      return null;
    }
    throw error;
  }

  if (!keys || keys.length === 0) {
    console.log('No Convoso credentials found in either system');
    return null;
  }

  const decryptedToken = decryptApiKey(keys[0].encrypted_key);

  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keys[0].id);

  console.log('Found Convoso credentials in old api_keys table');
  return decryptedToken;
}

async function getConvosoConfig(supabase, agencyId) {
  // Try to get full configuration from the new integration system
  try {
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('api_credentials')
      .eq('id', agencyId)
      .single();

    if (!agencyError && agency?.api_credentials?.convoso) {
      const convosoConfig = agency.api_credentials.convoso;

      // Check if integration is enabled
      if (convosoConfig.enabled !== false) {
        return {
          api_key: convosoConfig.api_key || convosoConfig.auth_token,
          base_url: convosoConfig.base_url || 'https://api.convoso.com',
          account_id: convosoConfig.account_id,
          api_secret: convosoConfig.api_secret
        };
      }
    }
  } catch (error) {
    console.log('Error getting Convoso config:', error);
  }

  return null;
}

async function makeConvosoRequest(authToken, endpoint, params = {}, baseUrl = null) {
  // Use provided baseUrl or default to Convoso API
  const apiBaseUrl = baseUrl || 'https://api.convoso.com';
  const url = new URL(`${apiBaseUrl}/v1/${endpoint}`);
  url.searchParams.append('auth_token', authToken);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.append(key, value);
    }
  });

  console.log(`Convoso API Request: ${endpoint} to ${url.origin}`);

  try {
    // Create timeout for older Node.js versions that don't support AbortSignal.timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Convoso API Error:', response.status, errorText);

      // Try to parse error message if it's JSON
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(`Convoso API error: ${response.status} - ${errorData.message || errorData.error || 'Unknown error'}`);
      } catch {
        throw new Error(`Convoso API error: ${response.status} - ${errorText}`);
      }
    }

    const data = await response.json();
    console.log(`Convoso API Response: ${endpoint} - Success`);
    return data;

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Convoso API Request Timeout');
      throw new Error('Convoso API request timed out after 30 seconds');
    }
    throw error;
  }
}

module.exports = {
  decryptApiKey,
  getConvosoToken,
  getConvosoConfig,
  makeConvosoRequest
};