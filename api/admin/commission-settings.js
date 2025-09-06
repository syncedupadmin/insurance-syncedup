import { requireAuth, logAction } from '../_middleware/authCheck.js';
import { createClient } from '@supabase/supabase-js';

// Default commission structures
const defaultCommissionStructures = {
  flat_percentage: {
    type: 'percentage',
    name: 'Flat Percentage',
    description: 'Fixed percentage commission for all sales',
    rate: 80, // 80% to agent
    active: true
  },
  tiered: {
    type: 'tiered',
    name: 'Tiered Commission',
    description: 'Commission rate increases with sales volume',
    tiers: [
      { min: 0, max: 10000, rate: 70, description: '$0 - $10,000' },
      { min: 10001, max: 25000, rate: 75, description: '$10,001 - $25,000' },
      { min: 25001, max: null, rate: 80, description: '$25,001+' }
    ],
    active: false
  },
  product_based: {
    type: 'product',
    name: 'Product-Based Commission',
    description: 'Different commission rates by insurance product',
    rates: {
      'auto': 75,
      'home': 80,
      'life': 85,
      'business': 70,
      'health': 75,
      'dental': 70,
      'vision': 65
    },
    active: false
  },
  hybrid: {
    type: 'hybrid',
    name: 'Hybrid Commission',
    description: 'Base rate with bonus for high performers',
    base_rate: 60,
    bonus_threshold: 20000,
    bonus_rate: 85,
    active: false
  }
};

async function commissionSettingsHandler(req, res) {
  const supabase = req.supabase || createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    if (req.method === 'GET') {
      // Get commission settings from database or return defaults
      const { data: settings, error } = await supabase
        .from('commission_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      let commissionStructures = defaultCommissionStructures;
      
      if (settings && settings.structures) {
        commissionStructures = settings.structures;
      }

      // Also get active agents for commission calculation preview
      const { data: agents, error: agentsError } = await supabase
        .from('portal_users')
        .select('id, name, email')
        .eq('role', 'agent')
        .eq('is_active', true);

      return res.json({
        success: true,
        commission_structures: commissionStructures,
        agents: agents || [],
        last_updated: settings?.updated_at || null,
        updated_by: settings?.updated_by || null
      });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const { commission_structures, active_structure } = req.body;

      if (!commission_structures) {
        return res.status(400).json({ error: 'Commission structures are required' });
      }

      // Validate commission structures
      const validationError = validateCommissionStructures(commission_structures);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      // Save to database
      const settingsData = {
        structures: commission_structures,
        active_structure: active_structure || 'flat_percentage',
        updated_by: req.user.id,
        updated_at: new Date().toISOString()
      };

      // Check if settings exist
      const { data: existingSettings } = await supabase
        .from('commission_settings')
        .select('id')
        .limit(1)
        .single();

      let result;
      if (existingSettings) {
        // Update existing settings
        result = await supabase
          .from('commission_settings')
          .update(settingsData)
          .eq('id', existingSettings.id)
          .select()
          .single();
      } else {
        // Create new settings
        result = await supabase
          .from('commission_settings')
          .insert(settingsData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // Log the action
      try {
        await logAction(
          supabase, 
          req.user.id, 
          result.data.id, 
          existingSettings ? 'UPDATE' : 'CREATE', 
          'commission_settings', 
          result.data.id,
          { active_structure, structures_count: Object.keys(commission_structures).length }
        );
      } catch (logError) {
        console.error('Log action failed:', logError);
      }

      return res.json({
        success: true,
        message: 'Commission settings updated successfully',
        settings: result.data
      });
    }

    if (req.method === 'DELETE') {
      const { structure_type } = req.query;

      if (!structure_type) {
        return res.status(400).json({ error: 'Structure type is required' });
      }

      // Get current settings
      const { data: settings, error } = await supabase
        .from('commission_settings')
        .select('*')
        .limit(1)
        .single();

      if (!settings) {
        return res.status(404).json({ error: 'Commission settings not found' });
      }

      let structures = settings.structures || defaultCommissionStructures;

      // Remove the structure
      if (structures[structure_type]) {
        delete structures[structure_type];

        // Update in database
        const { error: updateError } = await supabase
          .from('commission_settings')
          .update({ 
            structures,
            updated_by: req.user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id);

        if (updateError) throw updateError;

        // Log the action
        try {
          await logAction(supabase, req.user.id, settings.id, 'DELETE', 'commission_structure', structure_type);
        } catch (logError) {
          console.error('Log action failed:', logError);
        }

        return res.json({
          success: true,
          message: `Commission structure '${structure_type}' deleted successfully`
        });
      } else {
        return res.status(404).json({ error: 'Commission structure not found' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Commission settings handler error:', error);
    return res.status(500).json({ error: error.message });
  }
}

function validateCommissionStructures(structures) {
  for (const [key, structure] of Object.entries(structures)) {
    if (!structure.type) {
      return `Structure '${key}' is missing type`;
    }

    switch (structure.type) {
      case 'percentage':
        if (typeof structure.rate !== 'number' || structure.rate < 0 || structure.rate > 100) {
          return `Structure '${key}' has invalid rate (must be 0-100)`;
        }
        break;

      case 'tiered':
        if (!Array.isArray(structure.tiers) || structure.tiers.length === 0) {
          return `Structure '${key}' must have at least one tier`;
        }
        for (const tier of structure.tiers) {
          if (typeof tier.rate !== 'number' || tier.rate < 0 || tier.rate > 100) {
            return `Structure '${key}' has invalid tier rate (must be 0-100)`;
          }
          if (typeof tier.min !== 'number' || tier.min < 0) {
            return `Structure '${key}' has invalid tier minimum`;
          }
        }
        break;

      case 'product':
        if (!structure.rates || typeof structure.rates !== 'object') {
          return `Structure '${key}' must have rates object`;
        }
        for (const [product, rate] of Object.entries(structure.rates)) {
          if (typeof rate !== 'number' || rate < 0 || rate > 100) {
            return `Structure '${key}' has invalid rate for product '${product}' (must be 0-100)`;
          }
        }
        break;

      case 'hybrid':
        if (typeof structure.base_rate !== 'number' || structure.base_rate < 0 || structure.base_rate > 100) {
          return `Structure '${key}' has invalid base_rate (must be 0-100)`;
        }
        if (typeof structure.bonus_rate !== 'number' || structure.bonus_rate < 0 || structure.bonus_rate > 100) {
          return `Structure '${key}' has invalid bonus_rate (must be 0-100)`;
        }
        if (typeof structure.bonus_threshold !== 'number' || structure.bonus_threshold < 0) {
          return `Structure '${key}' has invalid bonus_threshold`;
        }
        break;

      default:
        return `Structure '${key}' has invalid type '${structure.type}'`;
    }
  }

  return null; // No validation errors
}

// Helper function to calculate commission based on structure
export function calculateCommission(amount, product, agentSales, structure) {
  switch (structure.type) {
    case 'percentage':
      return (amount * structure.rate) / 100;

    case 'tiered':
      for (const tier of structure.tiers) {
        if (agentSales >= tier.min && (tier.max === null || agentSales <= tier.max)) {
          return (amount * tier.rate) / 100;
        }
      }
      return 0;

    case 'product':
      const productRate = structure.rates[product] || structure.rates['default'] || 0;
      return (amount * productRate) / 100;

    case 'hybrid':
      const baseCommission = (amount * structure.base_rate) / 100;
      if (agentSales >= structure.bonus_threshold) {
        return (amount * structure.bonus_rate) / 100;
      }
      return baseCommission;

    default:
      return 0;
  }
}

export default requireAuth(['admin'])(commissionSettingsHandler);