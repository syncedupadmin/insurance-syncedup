// API endpoint for license types management
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authentication check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    
    // Verify admin access
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64'));
      if (!['admin', 'super_admin', 'manager'].includes(payload.role)) {
        return res.status(403).json({ error: 'Admin access required' });
      }
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get license types
    const { data: licenseTypes, error } = await supabase
      .from('license_types')
      .select('*')
      .eq('is_active', true)
      .order('type_name');

    if (error) {
      // Fallback to hardcoded license types if table doesn't exist
      const fallbackTypes = [
        { type_code: 'LIFE', type_name: 'Life Insurance', description: 'Life insurance producer license' },
        { type_code: 'HEALTH', type_name: 'Health Insurance', description: 'Health insurance producer license' },
        { type_code: 'PROP', type_name: 'Property Insurance', description: 'Property insurance producer license' },
        { type_code: 'CAS', type_name: 'Casualty Insurance', description: 'Casualty insurance producer license' },
        { type_code: 'LIFE_HEALTH', type_name: 'Life & Health', description: 'Combined life and health insurance license' },
        { type_code: 'PROP_CAS', type_name: 'Property & Casualty', description: 'Combined property and casualty license' },
        { type_code: 'VAR_LIFE', type_name: 'Variable Life', description: 'Variable life insurance license' },
        { type_code: 'VAR_ANN', type_name: 'Variable Annuities', description: 'Variable annuities license' },
        { type_code: 'SURPLUS', type_name: 'Surplus Lines', description: 'Surplus lines insurance license' },
        { type_code: 'ADJUSTER', type_name: 'Claims Adjuster', description: 'Insurance claims adjuster license' }
      ];

      return res.status(200).json({
        success: true,
        data: fallbackTypes,
        source: 'fallback'
      });
    }

    return res.status(200).json({
      success: true,
      data: licenseTypes,
      source: 'database'
    });

  } catch (error) {
    console.error('License types error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}