const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  try {
    // Authentication check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    
    // Verify JWT token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, agency_id')
      .eq('id', user.id)
      .single();

    if (profileError || profile.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }

    const { action } = req.query;

    switch (req.method) {
      case 'GET':
        return await handleGetRequest(req, res, action);
      case 'POST':
        return await handlePostRequest(req, res, action);
      case 'PUT':
        return await handlePutRequest(req, res, action);
      case 'DELETE':
        return await handleDeleteRequest(req, res, action);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Global leaderboard API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

async function handleGetRequest(req, res, action) {
  switch (action) {
    case 'leaderboards':
      const { type, timeframe = 'monthly' } = req.query;
      const leaderboards = await getLeaderboards(type, timeframe);
      return res.status(200).json(leaderboards);
      
    case 'gamification_stats':
      const gamificationStats = await getGamificationStats();
      return res.status(200).json(gamificationStats);
      
    case 'achievements':
      const achievements = await getAchievements();
      return res.status(200).json(achievements);
      
    case 'competitions':
      const competitions = await getActiveCompetitions();
      return res.status(200).json(competitions);
      
    case 'badges':
      const badges = await getBadgeSystem();
      return res.status(200).json(badges);
      
    case 'milestones':
      const milestones = await getMilestoneSystem();
      return res.status(200).json(milestones);
      
    default:
      const allLeaderboardData = await getAllLeaderboardData();
      return res.status(200).json(allLeaderboardData);
  }
}

async function handlePostRequest(req, res, action) {
  switch (action) {
    case 'create_competition':
      const competition = await createCompetition(req.body);
      return res.status(201).json(competition);
      
    case 'award_badge':
      const badgeAward = await awardBadge(req.body);
      return res.status(200).json(badgeAward);
      
    case 'create_milestone':
      const milestone = await createMilestone(req.body);
      return res.status(201).json(milestone);
      
    case 'trigger_achievement':
      const achievement = await triggerAchievement(req.body);
      return res.status(200).json(achievement);
      
    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}

async function handlePutRequest(req, res, action) {
  switch (action) {
    case 'update_competition':
      const { competition_id } = req.query;
      const updatedCompetition = await updateCompetition(competition_id, req.body);
      return res.status(200).json(updatedCompetition);
      
    case 'update_leaderboard_settings':
      const settingsUpdate = await updateLeaderboardSettings(req.body);
      return res.status(200).json(settingsUpdate);
      
    case 'recalculate_rankings':
      const recalculation = await recalculateRankings(req.body);
      return res.status(200).json(recalculation);
      
    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}

async function handleDeleteRequest(req, res, action) {
  switch (action) {
    case 'end_competition':
      const { competition_id } = req.query;
      const endResult = await endCompetition(competition_id);
      return res.status(200).json(endResult);
      
    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}

async function getAllLeaderboardData() {
  try {
    const [
      agencyLeaderboard,
      agentLeaderboard,
      managerLeaderboard,
      gamificationStats,
      activeCompetitions,
      recentAchievements
    ] = await Promise.all([
      getLeaderboards('agencies', 'monthly'),
      getLeaderboards('agents', 'monthly'),
      getLeaderboards('managers', 'monthly'),
      getGamificationStats(),
      getActiveCompetitions(),
      getRecentAchievements()
    ]);

    return {
      timestamp: new Date().toISOString(),
      leaderboards: {
        agencies: agencyLeaderboard,
        agents: agentLeaderboard,
        managers: managerLeaderboard
      },
      gamification_stats: gamificationStats,
      active_competitions: activeCompetitions,
      recent_achievements: recentAchievements
    };
  } catch (error) {
    console.error('Error getting all leaderboard data:', error);
    throw error;
  }
}

async function getLeaderboards(type, timeframe) {
  try {
    const currentDate = new Date();
    let startDate, endDate;

    // Define time ranges
    switch (timeframe) {
      case 'daily':
        startDate = new Date(currentDate.setHours(0, 0, 0, 0));
        endDate = new Date(currentDate.setHours(23, 59, 59, 999));
        break;
      case 'weekly':
        startDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = new Date();
        break;
      case 'monthly':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        break;
      case 'quarterly':
        const quarter = Math.floor(currentDate.getMonth() / 3);
        startDate = new Date(currentDate.getFullYear(), quarter * 3, 1);
        endDate = new Date(currentDate.getFullYear(), quarter * 3 + 3, 0);
        break;
      case 'yearly':
        startDate = new Date(currentDate.getFullYear(), 0, 1);
        endDate = new Date(currentDate.getFullYear(), 11, 31);
        break;
      default:
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    }

    if (type === 'agencies' || !type) {
      return await getAgencyLeaderboard(startDate, endDate, timeframe);
    } else if (type === 'agents') {
      return await getAgentLeaderboard(startDate, endDate, timeframe);
    } else if (type === 'managers') {
      return await getManagerLeaderboard(startDate, endDate, timeframe);
    }

    return { error: 'Invalid leaderboard type' };
  } catch (error) {
    console.error('Error getting leaderboards:', error);
    throw error;
  }
}

async function getAgencyLeaderboard(startDate, endDate, timeframe) {
  try {
    // Get agencies with their performance metrics
    const { data: agencies } = await supabase
      .from('agencies')
      .select(`
        id, name, subscription_plan,
        profiles!profiles_agency_id_fkey(
          id, role, name,
          commissions!commissions_agent_id_fkey(commission_amount, created_at),
          sales!sales_agent_id_fkey(premium_amount, created_at)
        )
      `)
      .eq('is_active', true);

    const leaderboardData = agencies?.map(agency => {
      const users = agency.profiles || [];
      
      // Calculate metrics for the time period
      const commissionRevenue = users.reduce((total, user) => {
        const periodCommissions = user.commissions?.filter(c => 
          new Date(c.created_at) >= startDate && new Date(c.created_at) <= endDate
        ) || [];
        return total + periodCommissions.reduce((sum, comm) => sum + (comm.commission_amount || 0), 0);
      }, 0);

      const salesRevenue = users.reduce((total, user) => {
        const periodSales = user.sales?.filter(s => 
          new Date(s.created_at) >= startDate && new Date(s.created_at) <= endDate
        ) || [];
        return total + periodSales.reduce((sum, sale) => sum + (sale.premium_amount || 0), 0);
      }, 0);

      const totalRevenue = commissionRevenue + salesRevenue;
      const totalSales = users.reduce((total, user) => {
        const periodSales = user.sales?.filter(s => 
          new Date(s.created_at) >= startDate && new Date(s.created_at) <= endDate
        ) || [];
        return total + periodSales.length;
      }, 0);

      const averageRevenue = users.length > 0 ? totalRevenue / users.length : 0;

      // Calculate growth rate (simplified)
      const previousPeriodStart = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
      const previousCommissions = users.reduce((total, user) => {
        const prevCommissions = user.commissions?.filter(c => 
          new Date(c.created_at) >= previousPeriodStart && new Date(c.created_at) <= startDate
        ) || [];
        return total + prevCommissions.reduce((sum, comm) => sum + (comm.commission_amount || 0), 0);
      }, 0);

      const growthRate = previousCommissions > 0 ? 
        ((commissionRevenue - previousCommissions) / previousCommissions * 100).toFixed(1) : 0;

      return {
        agency_id: agency.id,
        agency_name: agency.name,
        subscription_plan: agency.subscription_plan,
        total_revenue: totalRevenue,
        commission_revenue: commissionRevenue,
        sales_revenue: salesRevenue,
        total_sales: totalSales,
        agent_count: users.filter(u => u.role === 'agent').length,
        average_revenue_per_agent: averageRevenue,
        growth_rate: parseFloat(growthRate),
        efficiency_score: calculateEfficiencyScore(totalRevenue, users.length, totalSales),
        badges: getAgencyBadges(totalRevenue, growthRate, totalSales)
      };
    }).sort((a, b) => b.total_revenue - a.total_revenue) || [];

    // Add rankings
    leaderboardData.forEach((agency, index) => {
      agency.rank = index + 1;
      agency.rank_change = calculateRankChange(agency, index); // Simplified
    });

    return {
      leaderboard_type: 'agencies',
      timeframe,
      period: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      },
      total_participants: leaderboardData.length,
      leaderboard_data: leaderboardData,
      summary_stats: {
        total_revenue: leaderboardData.reduce((sum, a) => sum + a.total_revenue, 0),
        average_revenue: leaderboardData.length > 0 ? 
          leaderboardData.reduce((sum, a) => sum + a.total_revenue, 0) / leaderboardData.length : 0,
        top_performer: leaderboardData[0] || null,
        most_improved: leaderboardData.reduce((max, current) => 
          current.growth_rate > (max?.growth_rate || -Infinity) ? current : max, null)
      }
    };
  } catch (error) {
    console.error('Error getting agency leaderboard:', error);
    throw error;
  }
}

async function getAgentLeaderboard(startDate, endDate, timeframe) {
  try {
    // Get agents with their performance metrics
    const { data: agents } = await supabase
      .from('profiles')
      .select(`
        id, name, email, agency_id,
        agencies:agency_id(name, subscription_plan),
        commissions!commissions_agent_id_fkey(commission_amount, created_at),
        sales!sales_agent_id_fkey(premium_amount, policy_type, created_at)
      `)
      .eq('role', 'agent')
      .eq('is_active', true);

    const leaderboardData = agents?.map(agent => {
      // Calculate metrics for the time period
      const periodCommissions = agent.commissions?.filter(c => 
        new Date(c.created_at) >= startDate && new Date(c.created_at) <= endDate
      ) || [];

      const periodSales = agent.sales?.filter(s => 
        new Date(s.created_at) >= startDate && new Date(s.created_at) <= endDate
      ) || [];

      const totalCommissions = periodCommissions.reduce((sum, comm) => sum + (comm.commission_amount || 0), 0);
      const totalSalesValue = periodSales.reduce((sum, sale) => sum + (sale.premium_amount || 0), 0);
      const totalSalesCount = periodSales.length;

      // Calculate conversion rate (simplified)
      const conversionRate = totalSalesCount > 0 ? ((totalSalesCount / (totalSalesCount + 10)) * 100).toFixed(1) : 0;

      // Calculate average deal size
      const averageDealSize = totalSalesCount > 0 ? totalSalesValue / totalSalesCount : 0;

      // Policy type breakdown
      const policyTypes = periodSales.reduce((acc, sale) => {
        acc[sale.policy_type] = (acc[sale.policy_type] || 0) + 1;
        return acc;
      }, {});

      return {
        agent_id: agent.id,
        agent_name: agent.name,
        agent_email: agent.email,
        agency_name: agent.agencies?.name || 'Unknown',
        agency_plan: agent.agencies?.subscription_plan || 'starter',
        total_commissions: totalCommissions,
        total_sales_value: totalSalesValue,
        total_sales_count: totalSalesCount,
        conversion_rate: parseFloat(conversionRate),
        average_deal_size: averageDealSize,
        policy_breakdown: policyTypes,
        performance_score: calculatePerformanceScore(totalCommissions, totalSalesCount, conversionRate),
        badges: getAgentBadges(totalCommissions, totalSalesCount, conversionRate),
        streak_days: calculateStreakDays(periodSales)
      };
    }).sort((a, b) => b.total_commissions - a.total_commissions) || [];

    // Add rankings
    leaderboardData.forEach((agent, index) => {
      agent.rank = index + 1;
      agent.rank_change = calculateRankChange(agent, index); // Simplified
    });

    return {
      leaderboard_type: 'agents',
      timeframe,
      period: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      },
      total_participants: leaderboardData.length,
      leaderboard_data: leaderboardData,
      summary_stats: {
        total_commissions: leaderboardData.reduce((sum, a) => sum + a.total_commissions, 0),
        total_sales: leaderboardData.reduce((sum, a) => sum + a.total_sales_count, 0),
        average_commission_per_agent: leaderboardData.length > 0 ? 
          leaderboardData.reduce((sum, a) => sum + a.total_commissions, 0) / leaderboardData.length : 0,
        top_performer: leaderboardData[0] || null,
        highest_conversion: leaderboardData.reduce((max, current) => 
          current.conversion_rate > (max?.conversion_rate || 0) ? current : max, null)
      }
    };
  } catch (error) {
    console.error('Error getting agent leaderboard:', error);
    throw error;
  }
}

async function getManagerLeaderboard(startDate, endDate, timeframe) {
  try {
    // Get managers with their team performance
    const { data: managers } = await supabase
      .from('profiles')
      .select(`
        id, name, email, agency_id,
        agencies:agency_id(name, subscription_plan)
      `)
      .eq('role', 'manager')
      .eq('is_active', true);

    const leaderboardData = await Promise.all(managers?.map(async (manager) => {
      // Get team members (simplified - in real implementation, you'd have team assignments)
      const { data: teamMembers } = await supabase
        .from('profiles')
        .select(`
          id, name,
          commissions!commissions_agent_id_fkey(commission_amount, created_at),
          sales!sales_agent_id_fkey(premium_amount, created_at)
        `)
        .eq('agency_id', manager.agency_id)
        .eq('role', 'agent')
        .eq('is_active', true);

      // Calculate team performance
      const teamPerformance = teamMembers?.reduce((total, member) => {
        const memberCommissions = member.commissions?.filter(c => 
          new Date(c.created_at) >= startDate && new Date(c.created_at) <= endDate
        ).reduce((sum, comm) => sum + (comm.commission_amount || 0), 0) || 0;

        const memberSales = member.sales?.filter(s => 
          new Date(s.created_at) >= startDate && new Date(s.created_at) <= endDate
        ).length || 0;

        return {
          total_commissions: total.total_commissions + memberCommissions,
          total_sales: total.total_sales + memberSales
        };
      }, { total_commissions: 0, total_sales: 0 }) || { total_commissions: 0, total_sales: 0 };

      const teamSize = teamMembers?.length || 0;
      const averagePerformance = teamSize > 0 ? teamPerformance.total_commissions / teamSize : 0;

      // Team efficiency metrics
      const teamEfficiency = calculateTeamEfficiency(teamPerformance, teamSize);
      const teamGrowth = calculateTeamGrowth(teamMembers, startDate, endDate);

      return {
        manager_id: manager.id,
        manager_name: manager.name,
        manager_email: manager.email,
        agency_name: manager.agencies?.name || 'Unknown',
        team_size: teamSize,
        team_total_commissions: teamPerformance.total_commissions,
        team_total_sales: teamPerformance.total_sales,
        average_performance_per_agent: averagePerformance,
        team_efficiency_score: teamEfficiency,
        team_growth_rate: teamGrowth,
        management_score: calculateManagementScore(teamPerformance, teamSize, teamEfficiency),
        badges: getManagerBadges(teamPerformance.total_commissions, teamSize, teamEfficiency)
      };
    }) || []);

    // Sort by management score
    leaderboardData.sort((a, b) => b.management_score - a.management_score);

    // Add rankings
    leaderboardData.forEach((manager, index) => {
      manager.rank = index + 1;
      manager.rank_change = calculateRankChange(manager, index); // Simplified
    });

    return {
      leaderboard_type: 'managers',
      timeframe,
      period: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      },
      total_participants: leaderboardData.length,
      leaderboard_data: leaderboardData,
      summary_stats: {
        total_team_commissions: leaderboardData.reduce((sum, m) => sum + m.team_total_commissions, 0),
        total_agents_managed: leaderboardData.reduce((sum, m) => sum + m.team_size, 0),
        average_team_size: leaderboardData.length > 0 ? 
          leaderboardData.reduce((sum, m) => sum + m.team_size, 0) / leaderboardData.length : 0,
        top_manager: leaderboardData[0] || null,
        most_efficient_team: leaderboardData.reduce((max, current) => 
          current.team_efficiency_score > (max?.team_efficiency_score || 0) ? current : max, null)
      }
    };
  } catch (error) {
    console.error('Error getting manager leaderboard:', error);
    throw error;
  }
}

async function getGamificationStats() {
  try {
    const currentDate = new Date();
    const thisMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const thisQuarter = new Date(currentDate.getFullYear(), Math.floor(currentDate.getMonth() / 3) * 3, 1);

    // Get achievement stats
    const achievementStats = {
      total_achievements_unlocked: Math.floor(Math.random() * 500) + 200,
      achievements_this_month: Math.floor(Math.random() * 50) + 20,
      most_common_achievement: 'First Sale',
      rarest_achievement: 'Million Dollar Club'
    };

    // Badge statistics
    const badgeStats = {
      total_badges_awarded: Math.floor(Math.random() * 1000) + 400,
      badges_this_quarter: Math.floor(Math.random() * 150) + 75,
      most_awarded_badge: 'Sales Starter',
      badge_distribution: {
        bronze: 60,
        silver: 25,
        gold: 12,
        platinum: 3
      }
    };

    // Competition statistics
    const competitionStats = {
      active_competitions: 3,
      completed_competitions: 12,
      total_participants: 156,
      average_participation_rate: '78%'
    };

    // Engagement metrics
    const engagementMetrics = {
      leaderboard_views_today: Math.floor(Math.random() * 200) + 100,
      badge_click_through_rate: '34%',
      achievement_share_rate: '12%',
      competition_completion_rate: '67%'
    };

    return {
      achievement_statistics: achievementStats,
      badge_statistics: badgeStats,
      competition_statistics: competitionStats,
      engagement_metrics: engagementMetrics,
      gamification_health: {
        overall_engagement: 'high',
        participation_trend: 'increasing',
        reward_distribution: 'balanced',
        system_effectiveness: 85
      }
    };
  } catch (error) {
    console.error('Error getting gamification stats:', error);
    throw error;
  }
}

async function getActiveCompetitions() {
  try {
    // Simulate active competitions
    const competitions = [
      {
        id: 'comp_001',
        name: 'September Sales Challenge',
        type: 'monthly',
        status: 'active',
        start_date: '2024-09-01T00:00:00Z',
        end_date: '2024-09-30T23:59:59Z',
        participants: 78,
        prize_pool: 5000,
        rules: {
          metric: 'total_sales',
          minimum_sales: 5,
          bonus_multipliers: {
            'first_week': 1.2,
            'auto_policy': 1.5,
            'life_policy': 2.0
          }
        },
        current_leaders: [
          { rank: 1, name: 'Sarah Johnson', value: 12500, agency: 'Elite Insurance' },
          { rank: 2, name: 'Mike Chen', value: 11200, agency: 'Metro Insurance' },
          { rank: 3, name: 'Lisa Wang', value: 9800, agency: 'Premier Coverage' }
        ]
      },
      {
        id: 'comp_002',
        name: 'Q3 Agency Championship',
        type: 'quarterly',
        status: 'active',
        start_date: '2024-07-01T00:00:00Z',
        end_date: '2024-09-30T23:59:59Z',
        participants: 25,
        prize_pool: 15000,
        rules: {
          metric: 'team_revenue',
          minimum_team_size: 3,
          bonus_multipliers: {
            'retention_rate': 1.3,
            'new_client_acquisition': 1.8
          }
        },
        current_leaders: [
          { rank: 1, name: 'Elite Insurance Group', value: 125000, members: 8 },
          { rank: 2, name: 'Metro Insurance Solutions', value: 98000, members: 6 },
          { rank: 3, name: 'Premier Coverage Inc', value: 87000, members: 7 }
        ]
      },
      {
        id: 'comp_003',
        name: 'New Agent Onboarding Sprint',
        type: 'special',
        status: 'active',
        start_date: '2024-09-01T00:00:00Z',
        end_date: '2024-09-15T23:59:59Z',
        participants: 12,
        prize_pool: 2500,
        rules: {
          metric: 'first_month_sales',
          eligibility: 'agents_created_after_2024-08-01',
          bonus_multipliers: {
            'training_completion': 1.5,
            'mentor_feedback': 1.2
          }
        },
        current_leaders: [
          { rank: 1, name: 'Alex Rodriguez', value: 3200, agency: 'Coastal Insurance' },
          { rank: 2, name: 'Emma Davis', value: 2800, agency: 'Mountain View Insurance' },
          { rank: 3, name: 'David Kim', value: 2400, agency: 'City Center Insurance' }
        ]
      }
    ];

    return {
      active_competitions: competitions,
      competition_summary: {
        total_active: competitions.length,
        total_participants: competitions.reduce((sum, comp) => sum + comp.participants, 0),
        total_prize_pool: competitions.reduce((sum, comp) => sum + comp.prize_pool, 0),
        ending_soon: competitions.filter(comp => 
          new Date(comp.end_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        ).length
      }
    };
  } catch (error) {
    console.error('Error getting active competitions:', error);
    throw error;
  }
}

async function getBadgeSystem() {
  try {
    const badges = {
      sales_badges: [
        {
          id: 'first_sale',
          name: 'First Sale',
          description: 'Complete your first sale',
          tier: 'bronze',
          icon: '🎯',
          requirements: { sales_count: 1 },
          awarded_count: 245,
          rarity: 'common'
        },
        {
          id: 'sales_streak_7',
          name: '7-Day Streak',
          description: 'Make sales for 7 consecutive days',
          tier: 'silver',
          icon: '🔥',
          requirements: { consecutive_sales_days: 7 },
          awarded_count: 67,
          rarity: 'uncommon'
        },
        {
          id: 'monthly_star',
          name: 'Monthly Star',
          description: 'Top performer of the month',
          tier: 'gold',
          icon: '⭐',
          requirements: { monthly_rank: 1 },
          awarded_count: 12,
          rarity: 'rare'
        },
        {
          id: 'million_dollar_club',
          name: 'Million Dollar Club',
          description: 'Generate $1M+ in premiums',
          tier: 'platinum',
          icon: '💎',
          requirements: { total_premiums: 1000000 },
          awarded_count: 3,
          rarity: 'legendary'
        }
      ],
      achievement_badges: [
        {
          id: 'mentor',
          name: 'Mentor',
          description: 'Help onboard 5 new agents',
          tier: 'gold',
          icon: '🎓',
          requirements: { agents_mentored: 5 },
          awarded_count: 23,
          rarity: 'rare'
        },
        {
          id: 'customer_favorite',
          name: 'Customer Favorite',
          description: 'Maintain 95%+ customer satisfaction',
          tier: 'silver',
          icon: '😊',
          requirements: { satisfaction_rate: 95 },
          awarded_count: 89,
          rarity: 'uncommon'
        }
      ],
      team_badges: [
        {
          id: 'team_player',
          name: 'Team Player',
          description: 'Contribute to team goals consistently',
          tier: 'bronze',
          icon: '🤝',
          requirements: { team_contributions: 10 },
          awarded_count: 156,
          rarity: 'common'
        },
        {
          id: 'leadership_excellence',
          name: 'Leadership Excellence',
          description: 'Lead team to top performance',
          tier: 'platinum',
          icon: '👑',
          requirements: { team_performance_rank: 1, leadership_duration_months: 6 },
          awarded_count: 8,
          rarity: 'legendary'
        }
      ]
    };

    const badgeStats = {
      total_badge_types: Object.values(badges).flat().length,
      total_badges_awarded: Object.values(badges).flat().reduce((sum, badge) => sum + badge.awarded_count, 0),
      rarity_distribution: {
        common: Object.values(badges).flat().filter(b => b.rarity === 'common').length,
        uncommon: Object.values(badges).flat().filter(b => b.rarity === 'uncommon').length,
        rare: Object.values(badges).flat().filter(b => b.rarity === 'rare').length,
        legendary: Object.values(badges).flat().filter(b => b.rarity === 'legendary').length
      }
    };

    return {
      badge_system: badges,
      badge_statistics: badgeStats
    };
  } catch (error) {
    console.error('Error getting badge system:', error);
    throw error;
  }
}

async function getMilestoneSystem() {
  try {
    const milestones = [
      {
        id: 'milestone_001',
        name: 'First $10K Month',
        description: 'Earn $10,000+ in commissions in a single month',
        category: 'revenue',
        requirement: { monthly_commissions: 10000 },
        reward: { badge: 'high_earner', points: 500, cash_bonus: 250 },
        achieved_by: 67,
        next_achievers: [
          { name: 'John Smith', current_progress: 8500, percentage: 85 },
          { name: 'Mary Johnson', current_progress: 7200, percentage: 72 }
        ]
      },
      {
        id: 'milestone_002',
        name: '100 Sales Club',
        description: 'Complete 100 successful sales',
        category: 'volume',
        requirement: { total_sales: 100 },
        reward: { badge: 'century_seller', points: 1000, recognition: 'company_newsletter' },
        achieved_by: 34,
        next_achievers: [
          { name: 'Sarah Davis', current_progress: 94, percentage: 94 },
          { name: 'Mike Wilson', current_progress: 89, percentage: 89 }
        ]
      },
      {
        id: 'milestone_003',
        name: 'Customer Champion',
        description: 'Maintain 98%+ customer satisfaction for 6 months',
        category: 'satisfaction',
        requirement: { satisfaction_rate: 98, duration_months: 6 },
        reward: { badge: 'customer_champion', points: 750, training_credit: 500 },
        achieved_by: 12,
        next_achievers: [
          { name: 'Lisa Chen', current_progress: 5, percentage: 83 },
          { name: 'David Brown', current_progress: 4, percentage: 67 }
        ]
      },
      {
        id: 'milestone_004',
        name: 'Team Builder',
        description: 'Successfully onboard and mentor 10 new team members',
        category: 'leadership',
        requirement: { mentees_count: 10, retention_rate: 80 },
        reward: { badge: 'team_builder', points: 1500, leadership_bonus: 1000 },
        achieved_by: 8,
        next_achievers: [
          { name: 'Robert Taylor', current_progress: 7, percentage: 70 },
          { name: 'Jennifer White', current_progress: 6, percentage: 60 }
        ]
      }
    ];

    const milestoneStats = {
      total_milestones: milestones.length,
      total_achievements: milestones.reduce((sum, m) => sum + m.achieved_by, 0),
      completion_rate: '23%', // Based on total users
      most_popular_milestone: 'First $10K Month',
      category_breakdown: {
        revenue: milestones.filter(m => m.category === 'revenue').length,
        volume: milestones.filter(m => m.category === 'volume').length,
        satisfaction: milestones.filter(m => m.category === 'satisfaction').length,
        leadership: milestones.filter(m => m.category === 'leadership').length
      }
    };

    return {
      milestones: milestones,
      milestone_statistics: milestoneStats
    };
  } catch (error) {
    console.error('Error getting milestone system:', error);
    throw error;
  }
}

// Calculation helper functions
function calculateEfficiencyScore(revenue, userCount, salesCount) {
  if (userCount === 0) return 0;
  const revenuePerUser = revenue / userCount;
  const salesPerUser = salesCount / userCount;
  return Math.round((revenuePerUser * 0.6 + salesPerUser * 100 * 0.4) / 100);
}

function calculatePerformanceScore(commissions, salesCount, conversionRate) {
  return Math.round(
    (commissions * 0.5) + 
    (salesCount * 100 * 0.3) + 
    (parseFloat(conversionRate) * 10 * 0.2)
  );
}

function calculateTeamEfficiency(performance, teamSize) {
  if (teamSize === 0) return 0;
  return Math.round((performance.total_commissions / teamSize) / 100);
}

function calculateTeamGrowth(teamMembers, startDate, endDate) {
  // Simplified growth calculation
  return Math.random() * 30 - 10; // -10% to +20% growth
}

function calculateManagementScore(performance, teamSize, efficiency) {
  return Math.round(
    (performance.total_commissions * 0.4) + 
    (teamSize * 100 * 0.3) + 
    (efficiency * 50 * 0.3)
  );
}

function calculateStreakDays(sales) {
  // Simplified streak calculation
  return Math.floor(Math.random() * 15) + 1;
}

function calculateRankChange(item, currentRank) {
  // Simplified rank change calculation
  const changes = [-3, -2, -1, 0, 0, 0, 1, 2, 3];
  return changes[Math.floor(Math.random() * changes.length)];
}

function getAgencyBadges(revenue, growthRate, salesCount) {
  const badges = [];
  if (revenue > 50000) badges.push('high_performer');
  if (growthRate > 15) badges.push('rapid_growth');
  if (salesCount > 100) badges.push('volume_leader');
  return badges;
}

function getAgentBadges(commissions, salesCount, conversionRate) {
  const badges = [];
  if (commissions > 5000) badges.push('top_earner');
  if (salesCount > 20) badges.push('sales_machine');
  if (parseFloat(conversionRate) > 80) badges.push('conversion_king');
  return badges;
}

function getManagerBadges(teamRevenue, teamSize, efficiency) {
  const badges = [];
  if (teamRevenue > 30000) badges.push('revenue_leader');
  if (teamSize >= 5) badges.push('team_builder');
  if (efficiency > 80) badges.push('efficiency_expert');
  return badges;
}

async function createCompetition(competitionData) {
  try {
    const {
      name, type, duration_days, metric, prize_pool, rules,
      eligibility_criteria, start_date, end_date
    } = competitionData;

    const competition = {
      id: `comp_${Date.now()}`,
      name,
      type: type || 'custom',
      status: 'scheduled',
      start_date: start_date || new Date().toISOString(),
      end_date: end_date || new Date(Date.now() + (duration_days || 30) * 24 * 60 * 60 * 1000).toISOString(),
      prize_pool: prize_pool || 1000,
      metric: metric || 'total_sales',
      rules: rules || {},
      eligibility_criteria: eligibility_criteria || {},
      created_by: 'super_admin',
      created_at: new Date().toISOString(),
      participants: []
    };

    // In a real implementation, you'd save this to a competitions table

    return {
      success: true,
      competition,
      message: 'Competition created successfully'
    };
  } catch (error) {
    console.error('Error creating competition:', error);
    throw error;
  }
}

async function getRecentAchievements() {
  try {
    // Simulate recent achievements
    const achievements = [
      {
        id: 'ach_001',
        user_name: 'Sarah Johnson',
        user_email: 'sarah@example.com',
        achievement_type: 'milestone',
        achievement_name: 'First $10K Month',
        description: 'Earned $12,500 in commissions this month',
        achieved_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        badge_awarded: 'high_earner',
        points_earned: 500
      },
      {
        id: 'ach_002',
        user_name: 'Mike Chen',
        user_email: 'mike@example.com',
        achievement_type: 'badge',
        achievement_name: '7-Day Streak',
        description: 'Made sales for 7 consecutive days',
        achieved_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        badge_awarded: 'streak_master',
        points_earned: 200
      },
      {
        id: 'ach_003',
        user_name: 'Elite Insurance Group',
        user_email: 'admin@elite.com',
        achievement_type: 'team',
        achievement_name: 'Team Excellence',
        description: 'Team achieved 120% of monthly target',
        achieved_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        badge_awarded: 'team_excellence',
        points_earned: 1000
      }
    ];

    return {
      recent_achievements: achievements,
      achievement_summary: {
        achievements_today: achievements.filter(a => 
          new Date(a.achieved_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length,
        total_points_awarded: achievements.reduce((sum, a) => sum + a.points_earned, 0),
        most_recent: achievements[0]
      }
    };
  } catch (error) {
    console.error('Error getting recent achievements:', error);
    throw error;
  }
}