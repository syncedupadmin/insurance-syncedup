// ENTERPRISE IP ACCESS CONTROL API - NETWORK SECURITY MANAGEMENT
// Manages IP whitelist/blacklist rules for system access control

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify super admin authorization
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    await logSecurityEvent('UNAUTHORIZED_IP_RULES_ACCESS', 'No token provided', req);
    return res.status(401).json({ error: 'Authorization required' });
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      await logSecurityEvent('INVALID_TOKEN_IP_RULES', 'Invalid token for IP rules', req);
      return res.status(403).json({ error: 'Invalid authorization' });
    }

    // Verify super admin role
    if (user.user_metadata?.role !== 'super_admin' && user.app_metadata?.role !== 'super_admin') {
      await logSecurityEvent('INSUFFICIENT_PRIVILEGES_IP_RULES', `${user.email} attempted IP rules access`, req);
      return res.status(403).json({ error: 'Super admin privileges required' });
    }

    // Route to appropriate handler
    switch (req.method) {
      case 'GET':
        return await handleGetIPRules(req, res, user);
      case 'POST':
        return await handleCreateIPRule(req, res, user);
      case 'PUT':
        return await handleUpdateIPRule(req, res, user);
      case 'DELETE':
        return await handleDeleteIPRule(req, res, user);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('CRITICAL: IP Rules API error:', error);
    await logSecurityEvent('IP_RULES_API_ERROR', `API error: ${error.message}`, req);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Get all IP rules
async function handleGetIPRules(req, res, user) {
  try {
    const { data: ipRules, error } = await supabase
      .from('ip_access_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching IP rules:', error);
      return res.status(500).json({ error: 'Failed to fetch IP rules' });
    }

    // Log access
    await logAdminAction(user, 'IP_RULES_VIEWED', `Retrieved ${ipRules?.length || 0} IP access rules`, req);

    return res.status(200).json({
      rules: ipRules || [],
      total_count: ipRules?.length || 0
    });

  } catch (error) {
    console.error('Error handling IP rules retrieval:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}

// Create new IP rule
async function handleCreateIPRule(req, res, user) {
  try {
    const { ip_address, rule_type, description, expiry_date } = req.body;
    
    if (!ip_address || !rule_type) {
      return res.status(400).json({ error: 'IP address and rule type required' });
    }

    // Validate IP format
    if (!isValidIP(ip_address)) {
      return res.status(400).json({ error: 'Invalid IP address format' });
    }

    // Validate rule type
    if (!['allow', 'block'].includes(rule_type)) {
      return res.status(400).json({ error: 'Rule type must be "allow" or "block"' });
    }

    // Check for duplicate IP rules
    const { data: existingRule } = await supabase
      .from('ip_access_rules')
      .select('id')
      .eq('ip_address', ip_address)
      .eq('rule_type', rule_type)
      .single();

    if (existingRule) {
      return res.status(409).json({ error: 'IP rule already exists for this address and type' });
    }

    const newRule = {
      ip_address,
      rule_type,
      description: description || '',
      created_by: user.email,
      created_at: new Date().toISOString(),
      expires_at: expiry_date ? new Date(expiry_date).toISOString() : null,
      is_active: true
    };

    const { data: createdRule, error } = await supabase
      .from('ip_access_rules')
      .insert([newRule])
      .select()
      .single();

    if (error) {
      console.error('Failed to create IP rule:', error);
      return res.status(500).json({ error: 'Failed to create IP rule' });
    }

    // Critical security audit log
    await logAdminAction(user, 'IP_RULE_CREATED', 
      `Created ${rule_type} rule for IP ${ip_address} - ${description}`, req, ip_address);

    return res.status(201).json({
      success: true,
      message: `IP ${rule_type} rule created successfully`,
      rule: createdRule
    });

  } catch (error) {
    console.error('Error creating IP rule:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}

// Update existing IP rule
async function handleUpdateIPRule(req, res, user) {
  try {
    const { rule_id } = req.query;
    const { description, expiry_date, is_active } = req.body;
    
    if (!rule_id) {
      return res.status(400).json({ error: 'Rule ID required' });
    }

    // Get existing rule
    const { data: existingRule, error: fetchError } = await supabase
      .from('ip_access_rules')
      .select('*')
      .eq('id', rule_id)
      .single();

    if (fetchError || !existingRule) {
      return res.status(404).json({ error: 'IP rule not found' });
    }

    const updateData = {
      updated_by: user.email,
      updated_at: new Date().toISOString()
    };

    if (description !== undefined) updateData.description = description;
    if (expiry_date !== undefined) updateData.expires_at = expiry_date ? new Date(expiry_date).toISOString() : null;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedRule, error } = await supabase
      .from('ip_access_rules')
      .update(updateData)
      .eq('id', rule_id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update IP rule:', error);
      return res.status(500).json({ error: 'Failed to update IP rule' });
    }

    // Audit log
    await logAdminAction(user, 'IP_RULE_UPDATED', 
      `Updated ${existingRule.rule_type} rule for IP ${existingRule.ip_address}`, req, existingRule.ip_address);

    return res.status(200).json({
      success: true,
      message: 'IP rule updated successfully',
      rule: updatedRule
    });

  } catch (error) {
    console.error('Error updating IP rule:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}

// Delete IP rule
async function handleDeleteIPRule(req, res, user) {
  try {
    const { rule_id } = req.query;
    
    if (!rule_id) {
      return res.status(400).json({ error: 'Rule ID required' });
    }

    // Get rule details before deletion for audit log
    const { data: ruleToDelete, error: fetchError } = await supabase
      .from('ip_access_rules')
      .select('*')
      .eq('id', rule_id)
      .single();

    if (fetchError || !ruleToDelete) {
      return res.status(404).json({ error: 'IP rule not found' });
    }

    const { error } = await supabase
      .from('ip_access_rules')
      .delete()
      .eq('id', rule_id);

    if (error) {
      console.error('Failed to delete IP rule:', error);
      return res.status(500).json({ error: 'Failed to delete IP rule' });
    }

    // Critical security audit log
    await logAdminAction(user, 'IP_RULE_DELETED', 
      `Deleted ${ruleToDelete.rule_type} rule for IP ${ruleToDelete.ip_address} - ${ruleToDelete.description}`, 
      req, ruleToDelete.ip_address);

    return res.status(200).json({
      success: true,
      message: 'IP rule deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting IP rule:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}

// Validate IP address format
function isValidIP(ip) {
  // Support both IPv4 and basic CIDR notation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
  
  if (!ipv4Regex.test(ip)) {
    return false;
  }

  // If it's CIDR notation, validate the network part
  if (ip.includes('/')) {
    const [address, subnet] = ip.split('/');
    const subnetNum = parseInt(subnet);
    if (subnetNum < 0 || subnetNum > 32) return false;
    
    const parts = address.split('.');
    return parts.every(part => {
      const num = parseInt(part);
      return num >= 0 && num <= 255;
    });
  }

  // Validate regular IPv4
  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part);
    return num >= 0 && num <= 255;
  });
}

// Utility functions
async function logAdminAction(user, action, details, req, targetResource = null) {
  try {
    const auditEntry = {
      admin_id: user.id,
      admin_email: user.email,
      action: action.toUpperCase(),
      details,
      target_resource: targetResource,
      ip_address: getClientIP(req),
      user_agent: req.headers['user-agent'] || 'Unknown',
      timestamp: new Date().toISOString()
    };

    await supabase.from('admin_audit_log').insert([auditEntry]);
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}

async function logSecurityEvent(eventType, details, req) {
  try {
    const securityEvent = {
      event_type: eventType,
      severity: 'high',
      ip_address: getClientIP(req),
      user_agent: req.headers['user-agent'] || 'Unknown',
      attempted_endpoint: req.url,
      details,
      timestamp: new Date().toISOString()
    };

    await supabase.from('security_events').insert([securityEvent]);
    console.error(`SECURITY EVENT: ${eventType} - ${details}`);
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         'unknown';
}