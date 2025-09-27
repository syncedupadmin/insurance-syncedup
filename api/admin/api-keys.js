const { requireAuth } = require('../_middleware/authCheck.js');
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';

function encryptApiKey(apiKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'), iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptApiKey(encryptedKey) {
  const parts = encryptedKey.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function maskApiKey(apiKey) {
  if (apiKey.length <= 8) {
    return '••••••••';
  }
  const prefix = apiKey.slice(0, Math.min(8, apiKey.length - 4));
  const suffix = apiKey.slice(-4);
  return prefix + '••••••••••••' + suffix;
}

async function apiKeysHandler(req, res) {
  const supabase = req.supabase;
  const user = req.user;

  try {
    if (req.method === 'GET') {
      console.log('API Keys API - GET - User:', user.role, 'Agency:', user.agency_id);

      const { data: keys, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('agency_id', user.agency_id)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.message?.includes('does not exist') || error.code === 'PGRST116') {
          console.log('API Keys API - api_keys table does not exist yet');
          return res.status(200).json({
            success: true,
            keys: []
          });
        }
        throw error;
      }

      const maskedKeys = (keys || []).map(key => ({
        id: key.id,
        service: key.service,
        name: key.name,
        maskedKey: maskApiKey(key.api_key_prefix || ''),
        status: key.status,
        lastUsed: key.last_used_at,
        created: key.created_at
      }));

      return res.status(200).json({
        success: true,
        keys: maskedKeys
      });
    }

    if (req.method === 'POST') {
      console.log('API Keys API - POST - User:', user.role, 'Agency:', user.agency_id);

      const { service, name, apiKey } = req.body;

      if (!service || !name || !apiKey) {
        return res.status(400).json({ error: 'Service, name, and apiKey are required' });
      }

      const encryptedKey = encryptApiKey(apiKey);
      const apiKeyPrefix = apiKey.slice(0, Math.min(8, apiKey.length - 4));

      const { data: key, error } = await supabase
        .from('api_keys')
        .insert({
          agency_id: user.agency_id,
          service,
          name,
          encrypted_key: encryptedKey,
          api_key_prefix: apiKeyPrefix,
          status: 'active',
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        data: {
          id: key.id,
          service: key.service,
          name: key.name,
          maskedKey: maskApiKey(apiKeyPrefix),
          status: key.status
        },
        message: 'API key created successfully'
      });
    }

    if (req.method === 'PUT') {
      console.log('API Keys API - PUT - User:', user.role, 'Agency:', user.agency_id);

      const { id, service, name, apiKey, status } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }

      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (service) updateData.service = service;
      if (name) updateData.name = name;
      if (status) updateData.status = status;

      if (apiKey) {
        updateData.encrypted_key = encryptApiKey(apiKey);
        updateData.api_key_prefix = apiKey.slice(0, Math.min(8, apiKey.length - 4));
      }

      const { data: key, error } = await supabase
        .from('api_keys')
        .update(updateData)
        .eq('id', id)
        .eq('agency_id', user.agency_id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: {
          id: key.id,
          service: key.service,
          name: key.name,
          status: key.status
        },
        message: 'API key updated successfully'
      });
    }

    if (req.method === 'DELETE') {
      console.log('API Keys API - DELETE - User:', user.role, 'Agency:', user.agency_id);

      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }

      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id)
        .eq('agency_id', user.agency_id);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        message: 'API key deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Keys API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

module.exports = requireAuth(['admin', 'manager'])(apiKeysHandler);