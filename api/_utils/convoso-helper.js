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
    return null;
  }

  const decryptedToken = decryptApiKey(keys[0].encrypted_key);

  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keys[0].id);

  return decryptedToken;
}

async function makeConvosoRequest(authToken, endpoint, params = {}) {
  const url = new URL(`https://api.convoso.com/v1/${endpoint}`);
  url.searchParams.append('auth_token', authToken);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.append(key, value);
    }
  });

  console.log(`Convoso API Request: ${endpoint}`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Convoso API Error:', response.status, errorText);
    throw new Error(`Convoso API error: ${response.status}`);
  }

  return await response.json();
}

module.exports = {
  decryptApiKey,
  getConvosoToken,
  makeConvosoRequest
};