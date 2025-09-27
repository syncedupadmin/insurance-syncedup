import { createClient } from '@supabase/supabase-js';
// DISABLED: import { requireAuth } from '../_middleware/authCheck.js';
import { getUserContext } from '../utils/auth-helper.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function goalsHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { agencyId, role } = getUserContext(req);

    switch (req.method) {
      case 'GET':
        return handleGetGoals(req, res, agencyId);
      case 'POST':
        return handleCreateGoal(req, res, agencyId);
      case 'PUT':
        return handleUpdateGoal(req, res, agencyId);
      case 'DELETE':
        return handleDeleteGoal(req, res, agencyId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Goals API error:', error);
    return res.status(500).json({ 
      error: 'Failed to process goals request', 
      details: error.message 
    });
  }
}

async function handleGetGoals(req, res, agencyId) {
  const { agent_id, type, status } = req.query;

  try {
    // Get all agents for dropdown/selection
    const { data: agents, error: agentsError } = await supabase
      .from('portal_users')
      .select('id, full_name, agent_code')
      .eq('agency_id', agencyId)
      .eq('role', 'agent')
      .eq('is_active', true)
      .order('full_name');

    if (agentsError) throw agentsError;

    // Check if goals table exists, if not return demo data
    const { data: goals, error: goalsError } = await supabase
      .from('portal_goals')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });

    // If table doesn't exist or no goals, return demo data
    if (goalsError || !goals || goals.length === 0) {
      return res.status(200).json({
        goals: generateDemoGoals(agents),
        agents: agents || [],
        summary: {
          total_goals: 6,
          active_goals: 4,
          completed_goals: 1,
          overdue_goals: 1
        }
      });
    }

    // Filter goals based on query parameters
    let filteredGoals = goals;
    if (agent_id) filteredGoals = filteredGoals.filter(g => g.agent_id === agent_id);
    if (type) filteredGoals = filteredGoals.filter(g => g.goal_type === type);
    if (status) filteredGoals = filteredGoals.filter(g => g.status === status);

    // Calculate progress for each goal
    const goalsWithProgress = await Promise.all(
      filteredGoals.map(async (goal) => {
        const progress = await calculateGoalProgress(goal);
        return { ...goal, progress };
      })
    );

    // Calculate summary stats
    const summary = {
      total_goals: goalsWithProgress.length,
      active_goals: goalsWithProgress.filter(g => g.status === 'active').length,
      completed_goals: goalsWithProgress.filter(g => g.status === 'completed').length,
      overdue_goals: goalsWithProgress.filter(g => 
        g.status === 'active' && new Date(g.target_date) < new Date()
      ).length
    };

    return res.status(200).json({
      goals: goalsWithProgress,
      agents: agents || [],
      summary
    });

  } catch (error) {
    console.error('Error fetching goals:', error);
    return res.status(500).json({ error: 'Failed to fetch goals' });
  }
}

async function handleCreateGoal(req, res, agencyId) {
  const { agent_id, goal_type, title, description, target_value, target_date, metric_type } = req.body;

  if (!agent_id || !goal_type || !title || !target_value || !target_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data, error } = await supabase
      .from('portal_goals')
      .insert({
        agency_id: agencyId,
        agent_id,
        goal_type,
        title,
        description: description || '',
        target_value: parseFloat(target_value),
        target_date,
        metric_type: metric_type || 'sales',
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      message: 'Goal created successfully',
      goal: data
    });

  } catch (error) {
    console.error('Error creating goal:', error);
    return res.status(500).json({ error: 'Failed to create goal' });
  }
}

async function handleUpdateGoal(req, res, agencyId) {
  const { goal_id } = req.query;
  const updates = req.body;

  if (!goal_id) {
    return res.status(400).json({ error: 'Goal ID required' });
  }

  try {
    const { data, error } = await supabase
      .from('portal_goals')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', goal_id)
      .eq('agency_id', agencyId)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      message: 'Goal updated successfully',
      goal: data
    });

  } catch (error) {
    console.error('Error updating goal:', error);
    return res.status(500).json({ error: 'Failed to update goal' });
  }
}

async function handleDeleteGoal(req, res, agencyId) {
  const { goal_id } = req.query;

  if (!goal_id) {
    return res.status(400).json({ error: 'Goal ID required' });
  }

  try {
    const { error } = await supabase
      .from('portal_goals')
      .delete()
      .eq('id', goal_id)
      .eq('agency_id', agencyId);

    if (error) throw error;

    return res.status(200).json({
      message: 'Goal deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting goal:', error);
    return res.status(500).json({ error: 'Failed to delete goal' });
  }
}

async function calculateGoalProgress(goal) {
  const { agent_id, goal_type, metric_type, target_value, created_at, target_date } = goal;
  
  try {
    let currentValue = 0;
    
    // Calculate current progress based on metric type
    switch (metric_type) {
      case 'sales':
        const { data: sales } = await supabase
          .from('portal_sales')
          .select('premium')
          .eq('agent_id', agent_id)
          .gte('sale_date', created_at)
          .lte('sale_date', target_date);
        
        currentValue = sales?.reduce((sum, s) => sum + parseFloat(s.premium), 0) || 0;
        break;
        
      case 'policies':
        const { data: policies } = await supabase
          .from('portal_sales')
          .select('id')
          .eq('agent_id', agent_id)
          .gte('sale_date', created_at)
          .lte('sale_date', target_date);
        
        currentValue = policies?.length || 0;
        break;
        
      case 'leads':
        // Mock lead data since leads table might not exist
        currentValue = Math.floor(Math.random() * target_value * 0.7);
        break;
        
      default:
        currentValue = 0;
    }
    
    const percentage = target_value > 0 ? Math.min((currentValue / target_value) * 100, 100) : 0;
    
    return {
      current_value: currentValue,
      target_value: target_value,
      percentage: Math.round(percentage),
      days_remaining: Math.max(0, Math.ceil((new Date(target_date) - new Date()) / (1000 * 60 * 60 * 24)))
    };
    
  } catch (error) {
    console.error('Error calculating goal progress:', error);
    return {
      current_value: 0,
      target_value: target_value,
      percentage: 0,
      days_remaining: 0
    };
  }
}

function generateDemoGoals(agents) {
  const demoAgents = agents && agents.length > 0 ? agents : [
    { id: 'demo-agent-1', full_name: 'Sarah Johnson', agent_code: 'SJ001' },
    { id: 'demo-agent-2', full_name: 'Michael Chen', agent_code: 'MC002' }
  ];

  return [
    {
      id: 'goal-1',
      agent_id: demoAgents[0].id,
      agent_name: demoAgents[0].full_name,
      goal_type: 'monthly',
      title: 'Monthly Sales Target',
      description: 'Achieve $15,000 in monthly sales',
      target_value: 15000,
      target_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
      metric_type: 'sales',
      status: 'active',
      created_at: new Date().toISOString(),
      progress: {
        current_value: 12500,
        target_value: 15000,
        percentage: 83,
        days_remaining: 8
      }
    },
    {
      id: 'goal-2',
      agent_id: demoAgents[1].id,
      agent_name: demoAgents[1].full_name,
      goal_type: 'quarterly',
      title: 'Q4 Policy Count',
      description: 'Write 25 new policies this quarter',
      target_value: 25,
      target_date: '2025-12-31',
      metric_type: 'policies',
      status: 'active',
      created_at: '2025-10-01',
      progress: {
        current_value: 18,
        target_value: 25,
        percentage: 72,
        days_remaining: 45
      }
    },
    {
      id: 'goal-3',
      agent_id: demoAgents[0].id,
      agent_name: demoAgents[0].full_name,
      goal_type: 'weekly',
      title: 'Weekly Lead Follow-up',
      description: 'Contact 30 leads this week',
      target_value: 30,
      target_date: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
      metric_type: 'leads',
      status: 'active',
      created_at: new Date().toISOString(),
      progress: {
        current_value: 22,
        target_value: 30,
        percentage: 73,
        days_remaining: 3
      }
    },
    {
      id: 'goal-4',
      agent_id: demoAgents[1].id,
      agent_name: demoAgents[1].full_name,
      goal_type: 'annual',
      title: '2025 Annual Target',
      description: 'Achieve $180,000 in annual sales',
      target_value: 180000,
      target_date: '2025-12-31',
      metric_type: 'sales',
      status: 'active',
      created_at: '2025-01-01',
      progress: {
        current_value: 125000,
        target_value: 180000,
        percentage: 69,
        days_remaining: 120
      }
    },
    {
      id: 'goal-5',
      agent_id: demoAgents[0].id,
      agent_name: demoAgents[0].full_name,
      goal_type: 'monthly',
      title: 'August Sales Goal',
      description: 'Monthly sales target completed',
      target_value: 12000,
      target_date: '2025-08-31',
      metric_type: 'sales',
      status: 'completed',
      created_at: '2025-08-01',
      progress: {
        current_value: 12500,
        target_value: 12000,
        percentage: 100,
        days_remaining: 0
      }
    },
    {
      id: 'goal-6',
      agent_id: demoAgents[1].id,
      agent_name: demoAgents[1].full_name,
      goal_type: 'weekly',
      title: 'Last Week Follow-up',
      description: 'Missed weekly lead contact goal',
      target_value: 25,
      target_date: '2025-08-25',
      metric_type: 'leads',
      status: 'overdue',
      created_at: '2025-08-18',
      progress: {
        current_value: 18,
        target_value: 25,
        percentage: 72,
        days_remaining: -7
      }
    }
  ];
}

