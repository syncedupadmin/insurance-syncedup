import { requireAuth, logAction } from '../_middleware/authCheck.js';
import { createClient } from '@supabase/supabase-js';

async function leaderboardSettingsHandler(req, res) {
  const supabase = req.supabase || createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Get agency_id for the requesting admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('agency_id, role')
      .eq('id', req.user.id)
      .single();

    if (adminError || !adminUser) {
      return res.status(403).json({ error: 'Unable to verify admin privileges' });
    }

    if (req.method === 'GET') {
      // Get leaderboard settings for the admin's agency
      const { data: settings, error } = await supabase
        .from('leaderboard_settings')
        .select('*')
        .eq('agency_id', adminUser.agency_id)
        .single();

      // If no settings exist, return defaults
      const defaultSettings = {
        enabled: false,
        anonymize_names: true,
        anonymize_agency: true,
        participate_sales: true,
        participate_policies: true,
        participate_satisfaction: false,
        show_in_public: true,
        show_performance_tier: true,
        update_frequency: 'daily'
      };

      return res.json({
        success: true,
        settings: settings || defaultSettings,
        agency_id: adminUser.agency_id
      });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const {
        enabled,
        anonymize_names,
        anonymize_agency,
        participate_sales,
        participate_policies,
        participate_satisfaction,
        show_in_public,
        show_performance_tier,
        update_frequency
      } = req.body;

      // Validate input
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'enabled must be a boolean' });
      }

      const settingsData = {
        agency_id: adminUser.agency_id,
        enabled: enabled,
        anonymize_names: anonymize_names !== undefined ? anonymize_names : true,
        anonymize_agency: anonymize_agency !== undefined ? anonymize_agency : true,
        participate_sales: participate_sales !== undefined ? participate_sales : true,
        participate_policies: participate_policies !== undefined ? participate_policies : true,
        participate_satisfaction: participate_satisfaction !== undefined ? participate_satisfaction : false,
        show_in_public: show_in_public !== undefined ? show_in_public : true,
        show_performance_tier: show_performance_tier !== undefined ? show_performance_tier : true,
        update_frequency: update_frequency || 'daily',
        updated_at: new Date().toISOString()
      };

      // Check if settings already exist
      const { data: existingSettings, error: checkError } = await supabase
        .from('leaderboard_settings')
        .select('id')
        .eq('agency_id', adminUser.agency_id)
        .single();

      let result;
      if (existingSettings) {
        // Update existing settings
        result = await supabase
          .from('leaderboard_settings')
          .update(settingsData)
          .eq('agency_id', adminUser.agency_id)
          .select()
          .single();
      } else {
        // Create new settings
        settingsData.created_at = new Date().toISOString();
        result = await supabase
          .from('leaderboard_settings')
          .insert(settingsData)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Leaderboard settings save error:', result.error);
        return res.status(500).json({ error: 'Failed to save leaderboard settings' });
      }

      // Log the action
      try {
        await logAction(
          supabase,
          req.user.id,
          adminUser.agency_id,
          existingSettings ? 'UPDATE' : 'CREATE',
          'leaderboard_settings',
          result.data.id,
          { enabled, categories: { sales: participate_sales, policies: participate_policies, satisfaction: participate_satisfaction } }
        );
      } catch (logError) {
        console.error('Log action failed:', logError);
      }

      // If leaderboard was enabled, trigger data sync (in a real app, this might be queued)
      if (enabled && !existingSettings?.enabled) {
        try {
          await syncAgencyToLeaderboard(supabase, adminUser.agency_id);
        } catch (syncError) {
          console.error('Initial leaderboard sync failed:', syncError);
          // Don't fail the request if sync fails
        }
      }

      return res.json({
        success: true,
        message: 'Leaderboard settings saved successfully',
        settings: result.data
      });
    }

    if (req.method === 'DELETE') {
      // Disable leaderboard participation (soft delete)
      const { error } = await supabase
        .from('leaderboard_settings')
        .update({ 
          enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('agency_id', adminUser.agency_id);

      if (error) {
        return res.status(500).json({ error: 'Failed to disable leaderboard participation' });
      }

      // Remove agency from current leaderboard entries
      await supabase
        .from('global_leaderboard')
        .delete()
        .eq('agency_id', adminUser.agency_id);

      try {
        await logAction(supabase, req.user.id, adminUser.agency_id, 'DISABLE', 'leaderboard_settings', adminUser.agency_id);
      } catch (logError) {
        console.error('Log action failed:', logError);
      }

      return res.json({
        success: true,
        message: 'Leaderboard participation disabled'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Leaderboard settings handler error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Helper function to sync agency data to leaderboard
async function syncAgencyToLeaderboard(supabase, agencyId) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  // Get agency's active agents
  const { data: agents, error: agentsError } = await supabase
    .from('users')
    .select(`
      id,
      name,
      agency_id,
      created_at
    `)
    .eq('agency_id', agencyId)
    .eq('role', 'agent')
    .eq('is_active', true);

  if (agentsError || !agents) {
    throw new Error('Failed to fetch agency agents');
  }

  // Get agency and leaderboard settings
  const { data: agency, error: agencyError } = await supabase
    .from('agencies')
    .select('name')
    .eq('id', agencyId)
    .single();

  const { data: settings, error: settingsError } = await supabase
    .from('leaderboard_settings')
    .select('*')
    .eq('agency_id', agencyId)
    .single();

  if (agencyError || settingsError) {
    throw new Error('Failed to fetch agency or settings data');
  }

  // For each agent, create or update leaderboard entry
  for (const agent of agents) {
    // This would normally aggregate real sales data
    // For now, we'll create placeholder entries
    const leaderboardData = {
      agent_id: agent.id,
      agency_id: agencyId,
      display_name: settings.anonymize_names ? null : agent.name,
      real_name: agent.name,
      show_real_name: !settings.anonymize_names,
      agency_name: agency.name,
      show_agency_name: !settings.anonymize_agency,
      total_sales: 0, // Would be calculated from actual sales
      policies_count: 0, // Would be calculated from actual policies
      customer_satisfaction: null,
      period: 'monthly',
      period_filter: currentMonth,
      period_start: new Date(currentMonth + '-01'),
      period_end: new Date(new Date(currentMonth + '-01').setMonth(new Date(currentMonth + '-01').getMonth() + 1) - 1),
      updated_at: new Date().toISOString()
    };

    // Upsert leaderboard entry
    await supabase
      .from('global_leaderboard')
      .upsert(leaderboardData, {
        onConflict: 'agent_id,period,period_filter',
        ignoreDuplicates: false
      });
  }
}

export default requireAuth(['admin', 'super_admin'])(leaderboardSettingsHandler);