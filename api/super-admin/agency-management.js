import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''
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
    // Authentication check using our JWT system
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    
    // Verify super admin access by decoding JWT
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64'));
      if (payload.role !== 'super_admin') {
        return res.status(403).json({ error: 'Super admin access required' });
      }
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
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
    console.error('Agency management API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

async function handleGetRequest(req, res, action) {
  switch (action) {
    case 'performance_summary':
      const performanceData = await getAgencyPerformanceSummary();
      return res.status(200).json(performanceData);
      
    case 'health_analytics':
      const healthData = await getAgencyHealthAnalytics();
      return res.status(200).json(healthData);
      
    case 'churn_analysis':
      const churnData = await getChurnAnalysis();
      return res.status(200).json(churnData);
      
    case 'detailed_list':
      const detailedList = await getDetailedAgencyList();
      return res.status(200).json(detailedList);
      
    case 'rate_limits':
      const { agency_id } = req.query;
      const rateLimits = await getAgencyRateLimits(agency_id);
      return res.status(200).json(rateLimits);
      
    default:
      const allData = await getAllAgencyManagementData();
      return res.status(200).json(allData);
  }
}

async function handlePostRequest(req, res, action) {
  switch (action) {
    case 'create_agency':
      const newAgency = await createAgencyWithAdmin(req.body);
      return res.status(201).json(newAgency);
      
    case 'bulk_operations':
      const bulkResult = await performBulkOperations(req.body);
      return res.status(200).json(bulkResult);
      
    case 'set_rate_limits':
      const rateLimitResult = await setAgencyRateLimits(req.body);
      return res.status(200).json(rateLimitResult);
      
    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}

async function handlePutRequest(req, res, action) {
  switch (action) {
    case 'update_agency':
      const { agency_id } = req.query;
      const updatedAgency = await updateAgency(agency_id, req.body);
      return res.status(200).json(updatedAgency);
      
    case 'suspend_agency':
      const suspendResult = await suspendAgency(req.body.agency_id, req.body.reason);
      return res.status(200).json(suspendResult);
      
    case 'activate_agency':
      const activateResult = await activateAgency(req.body.agency_id);
      return res.status(200).json(activateResult);
      
    case 'update_pricing':
      const pricingResult = await updateAgencyPricing(req.body);
      return res.status(200).json(pricingResult);
      
    case 'customize_branding':
      const brandingResult = await customizeAgencyBranding(req.body);
      return res.status(200).json(brandingResult);
      
    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}

async function handleDeleteRequest(req, res, action) {
  switch (action) {
    case 'delete_agency':
      const { agency_id } = req.query;
      const deleteResult = await deleteAgency(agency_id);
      return res.status(200).json(deleteResult);
      
    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}

async function getAllAgencyManagementData() {
  try {
    const [
      performanceSummary,
      healthAnalytics,
      churnAnalysis,
      detailedList
    ] = await Promise.all([
      getAgencyPerformanceSummary(),
      getAgencyHealthAnalytics(),
      getChurnAnalysis(),
      getDetailedAgencyList()
    ]);

    return {
      timestamp: new Date().toISOString(),
      performance_summary: performanceSummary,
      health_analytics: healthAnalytics,
      churn_analysis: churnAnalysis,
      agencies: detailedList
    };
  } catch (error) {
    console.error('Error getting all agency management data:', error);
    throw error;
  }
}

async function getAgencyPerformanceSummary() {
  try {
    // Get all agencies with their revenue data
    const { data: agencies } = await supabase
      .from('agencies')
      .select(`
        id, name, subscription_plan, is_active, created_at,
        profiles!profiles_agency_id_fkey(
          id, role, name,
          commissions!commissions_agent_id_fkey(commission_amount, created_at),
          sales!sales_agent_id_fkey(premium_amount, created_at)
        )
      `);

    const agencyStats = agencies?.map(agency => {
      const users = agency.profiles || [];
      const totalRevenue = users.reduce((sum, user) => {
        const userCommissions = user.commissions?.reduce((commSum, comm) => commSum + (comm.commission_amount || 0), 0) || 0;
        const userSales = user.sales?.reduce((salesSum, sale) => salesSum + (sale.premium_amount || 0), 0) || 0;
        return sum + userCommissions + userSales;
      }, 0);

      return {
        id: agency.id,
        name: agency.name,
        subscription_plan: agency.subscription_plan,
        is_active: agency.is_active,
        user_count: users.length,
        active_users: users.filter(u => u.commissions?.length > 0 || u.sales?.length > 0).length,
        total_revenue: totalRevenue,
        created_at: agency.created_at
      };
    }) || [];

    // Sort by revenue
    agencyStats.sort((a, b) => b.total_revenue - a.total_revenue);

    // Calculate summary metrics
    const totalRevenue = agencyStats.reduce((sum, agency) => sum + agency.total_revenue, 0);
    const averageRevenuePerAgency = agencyStats.length > 0 ? totalRevenue / agencyStats.length : 0;
    
    // Define performance targets based on subscription plan
    const targets = {
      'starter': 5000,
      'professional': 15000,
      'enterprise': 50000
    };

    const agenciesBelowTarget = agencyStats.filter(agency => {
      const target = targets[agency.subscription_plan] || targets.starter;
      return agency.total_revenue < target;
    }).length;

    const topPerformers = agencyStats.slice(0, 5);

    return {
      total_revenue: totalRevenue,
      average_revenue_per_agency: averageRevenuePerAgency,
      agencies_below_target: agenciesBelowTarget,
      below_target_percentage: agencyStats.length > 0 ? ((agenciesBelowTarget / agencyStats.length) * 100).toFixed(1) : 0,
      top_performers: topPerformers,
      performance_distribution: {
        high_performers: agencyStats.filter(a => a.total_revenue > averageRevenuePerAgency * 1.5).length,
        average_performers: agencyStats.filter(a => a.total_revenue >= averageRevenuePerAgency * 0.7 && a.total_revenue <= averageRevenuePerAgency * 1.5).length,
        low_performers: agencyStats.filter(a => a.total_revenue < averageRevenuePerAgency * 0.7).length
      }
    };
  } catch (error) {
    console.error('Error getting agency performance summary:', error);
    throw error;
  }
}

async function getAgencyHealthAnalytics() {
  try {
    const { data: agencies } = await supabase
      .from('agencies')
      .select(`
        id, name, subscription_plan, is_active, created_at,
        profiles!profiles_agency_id_fkey(
          id, role, name, last_sign_in_at,
          commissions!commissions_agent_id_fkey(commission_amount, created_at),
          sales!sales_agent_id_fkey(premium_amount, created_at)
        )
      `);

    const healthMetrics = agencies?.map(agency => {
      const users = agency.profiles || [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // User activity
      const recentlyActiveUsers = users.filter(u => 
        u.last_sign_in_at && new Date(u.last_sign_in_at) > sevenDaysAgo
      ).length;

      // Revenue trends
      const recentRevenue = users.reduce((sum, user) => {
        const recentCommissions = user.commissions?.filter(c => new Date(c.created_at) > thirtyDaysAgo)
          .reduce((commSum, comm) => commSum + (comm.commission_amount || 0), 0) || 0;
        const recentSales = user.sales?.filter(s => new Date(s.created_at) > thirtyDaysAgo)
          .reduce((salesSum, sale) => salesSum + (sale.premium_amount || 0), 0) || 0;
        return sum + recentCommissions + recentSales;
      }, 0);

      // Health score calculation
      let healthScore = 0;
      const userEngagement = users.length > 0 ? (recentlyActiveUsers / users.length) * 100 : 0;
      const hasRecentRevenue = recentRevenue > 0;
      const accountAge = (Date.now() - new Date(agency.created_at)) / (1000 * 60 * 60 * 24);
      
      healthScore += userEngagement * 0.4; // 40% weight
      healthScore += hasRecentRevenue ? 30 : 0; // 30% weight
      healthScore += agency.is_active ? 20 : 0; // 20% weight
      healthScore += Math.min(accountAge / 30, 1) * 10; // 10% weight, capped at 30 days

      let healthStatus = 'poor';
      if (healthScore >= 80) healthStatus = 'excellent';
      else if (healthScore >= 60) healthStatus = 'good';
      else if (healthScore >= 40) healthStatus = 'fair';

      return {
        id: agency.id,
        name: agency.name,
        health_score: Math.round(healthScore),
        health_status: healthStatus,
        user_engagement: Math.round(userEngagement),
        recent_revenue: recentRevenue,
        user_count: users.length,
        active_users: recentlyActiveUsers,
        account_age_days: Math.floor(accountAge)
      };
    }) || [];

    // Categorize agencies by health
    const healthCategories = {
      excellent: healthMetrics.filter(a => a.health_status === 'excellent').length,
      good: healthMetrics.filter(a => a.health_status === 'good').length,
      fair: healthMetrics.filter(a => a.health_status === 'fair').length,
      poor: healthMetrics.filter(a => a.health_status === 'poor').length
    };

    return {
      agency_health_scores: healthMetrics.sort((a, b) => b.health_score - a.health_score),
      health_distribution: healthCategories,
      average_health_score: healthMetrics.length > 0 ? 
        Math.round(healthMetrics.reduce((sum, a) => sum + a.health_score, 0) / healthMetrics.length) : 0,
      at_risk_agencies: healthMetrics.filter(a => a.health_score < 40).length,
      improvement_recommendations: generateHealthRecommendations(healthMetrics)
    };
  } catch (error) {
    console.error('Error getting agency health analytics:', error);
    throw error;
  }
}

function generateHealthRecommendations(healthMetrics) {
  const recommendations = [];
  
  const lowEngagementAgencies = healthMetrics.filter(a => a.user_engagement < 30).length;
  const noRecentRevenueAgencies = healthMetrics.filter(a => a.recent_revenue === 0).length;
  
  if (lowEngagementAgencies > 0) {
    recommendations.push({
      type: 'user_engagement',
      priority: 'high',
      message: `${lowEngagementAgencies} agencies have low user engagement (<30%). Consider outreach programs.`,
      action: 'Schedule training sessions and check-in calls'
    });
  }
  
  if (noRecentRevenueAgencies > 0) {
    recommendations.push({
      type: 'revenue_generation',
      priority: 'high',
      message: `${noRecentRevenueAgencies} agencies have no recent revenue. Investigate potential issues.`,
      action: 'Review agency setup and provide sales support'
    });
  }
  
  return recommendations;
}

async function getChurnAnalysis() {
  try {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: agencies } = await supabase
      .from('agencies')
      .select(`
        id, name, subscription_plan, is_active, created_at,
        profiles!profiles_agency_id_fkey(
          id, role, last_sign_in_at,
          commissions!commissions_agent_id_fkey(commission_amount, created_at),
          sales!sales_agent_id_fkey(premium_amount, created_at)
        )
      `);

    const churnRiskFactors = agencies?.map(agency => {
      const users = agency.profiles || [];
      
      // Calculate risk factors
      const noRecentActivity = users.filter(u => 
        !u.last_sign_in_at || new Date(u.last_sign_in_at) < thirtyDaysAgo
      ).length / Math.max(users.length, 1);

      const noRecentRevenue = users.every(u => {
        const hasRecentCommissions = u.commissions?.some(c => new Date(c.created_at) > thirtyDaysAgo);
        const hasRecentSales = u.sales?.some(s => new Date(s.created_at) > thirtyDaysAgo);
        return !hasRecentCommissions && !hasRecentSales;
      });

      const accountAge = (Date.now() - new Date(agency.created_at)) / (1000 * 60 * 60 * 24);
      const isNewAccount = accountAge < 30;

      // Calculate churn risk score
      let churnRisk = 0;
      churnRisk += noRecentActivity * 40; // High weight for user inactivity
      churnRisk += noRecentRevenue ? 30 : 0; // High weight for no revenue
      churnRisk += isNewAccount ? 20 : 0; // New accounts have higher churn risk
      churnRisk += !agency.is_active ? 10 : 0; // Inactive agencies

      let riskLevel = 'low';
      if (churnRisk >= 70) riskLevel = 'high';
      else if (churnRisk >= 40) riskLevel = 'medium';

      return {
        id: agency.id,
        name: agency.name,
        subscription_plan: agency.subscription_plan,
        churn_risk_score: Math.round(churnRisk),
        risk_level: riskLevel,
        risk_factors: {
          user_inactivity: noRecentActivity > 0.5,
          no_recent_revenue: noRecentRevenue,
          new_account: isNewAccount,
          inactive_status: !agency.is_active
        },
        user_count: users.length,
        account_age_days: Math.floor(accountAge)
      };
    }) || [];

    // Sort by churn risk
    churnRiskFactors.sort((a, b) => b.churn_risk_score - a.churn_risk_score);

    const highRiskAgencies = churnRiskFactors.filter(a => a.risk_level === 'high');
    const mediumRiskAgencies = churnRiskFactors.filter(a => a.risk_level === 'medium');
    const lowRiskAgencies = churnRiskFactors.filter(a => a.risk_level === 'low');

    return {
      churn_risk_analysis: churnRiskFactors,
      risk_distribution: {
        high_risk: highRiskAgencies.length,
        medium_risk: mediumRiskAgencies.length,
        low_risk: lowRiskAgencies.length
      },
      retention_strategies: generateRetentionStrategies(highRiskAgencies),
      average_churn_risk: churnRiskFactors.length > 0 ? 
        Math.round(churnRiskFactors.reduce((sum, a) => sum + a.churn_risk_score, 0) / churnRiskFactors.length) : 0
    };
  } catch (error) {
    console.error('Error getting churn analysis:', error);
    throw error;
  }
}

function generateRetentionStrategies(highRiskAgencies) {
  const strategies = [];

  highRiskAgencies.forEach(agency => {
    const strategy = {
      agency_id: agency.id,
      agency_name: agency.name,
      recommended_actions: []
    };

    if (agency.risk_factors.user_inactivity) {
      strategy.recommended_actions.push({
        action: 'Immediate outreach',
        description: 'Contact agency admin to discuss platform usage and identify barriers'
      });
    }

    if (agency.risk_factors.no_recent_revenue) {
      strategy.recommended_actions.push({
        action: 'Sales support',
        description: 'Provide dedicated sales coaching and lead generation support'
      });
    }

    if (agency.risk_factors.new_account) {
      strategy.recommended_actions.push({
        action: 'Enhanced onboarding',
        description: 'Assign success manager for personalized onboarding experience'
      });
    }

    strategies.push(strategy);
  });

  return strategies;
}

async function getDetailedAgencyList() {
  try {
    const { data: agencies } = await supabase
      .from('agencies')
      .select(`
        id, name, subscription_plan, is_active, created_at, phone, website, address,
        profiles!profiles_agency_id_fkey(
          id, role, name, email, last_sign_in_at,
          commissions!commissions_agent_id_fkey(commission_amount, created_at),
          sales!sales_agent_id_fkey(premium_amount, created_at)
        )
      `)
      .order('created_at', { ascending: false });

    return agencies?.map(agency => {
      const users = agency.profiles || [];
      const adminUser = users.find(u => u.role === 'admin');
      
      const totalRevenue = users.reduce((sum, user) => {
        const userCommissions = user.commissions?.reduce((commSum, comm) => commSum + (comm.commission_amount || 0), 0) || 0;
        const userSales = user.sales?.reduce((salesSum, sale) => salesSum + (sale.premium_amount || 0), 0) || 0;
        return sum + userCommissions + userSales;
      }, 0);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const activeUsers = users.filter(u => 
        u.last_sign_in_at && new Date(u.last_sign_in_at) > sevenDaysAgo
      ).length;

      return {
        id: agency.id,
        name: agency.name,
        subscription_plan: agency.subscription_plan,
        is_active: agency.is_active,
        created_at: agency.created_at,
        contact_info: {
          phone: agency.phone,
          website: agency.website,
          address: agency.address
        },
        admin_user: adminUser ? {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          last_sign_in_at: adminUser.last_sign_in_at
        } : null,
        metrics: {
          total_users: users.length,
          active_users: activeUsers,
          total_revenue: totalRevenue,
          user_roles: users.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
          }, {})
        }
      };
    }) || [];
  } catch (error) {
    console.error('Error getting detailed agency list:', error);
    throw error;
  }
}

async function createAgencyWithAdmin(agencyData) {
  try {
    const {
      name, admin_name, admin_email, phone, website, address,
      subscription_plan, is_active = true, custom_branding = {}
    } = agencyData;

    // Start transaction
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .insert({
        name,
        subscription_plan: subscription_plan || 'professional',
        is_active,
        phone,
        website,
        address,
        custom_branding,
        settings: {
          api_rate_limit: subscription_plan === 'enterprise' ? 10000 : subscription_plan === 'professional' ? 5000 : 1000,
          features_enabled: getFeaturesByPlan(subscription_plan || 'professional')
        }
      })
      .select()
      .single();

    if (agencyError) {
      throw new Error(`Failed to create agency: ${agencyError.message}`);
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create admin user
    const { data: adminAuth, error: authError } = await supabase.auth.admin.createUser({
      email: admin_email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: admin_name,
        role: 'admin',
        agency_id: agency.id
      }
    });

    if (authError) {
      // Rollback agency creation
      await supabase.from('agencies').delete().eq('id', agency.id);
      throw new Error(`Failed to create admin user: ${authError.message}`);
    }

    // Create admin profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: adminAuth.user.id,
        agency_id: agency.id,
        name: admin_name,
        email: admin_email,
        role: 'admin',
        is_active: true
      });

    if (profileError) {
      // Rollback
      await supabase.auth.admin.deleteUser(adminAuth.user.id);
      await supabase.from('agencies').delete().eq('id', agency.id);
      throw new Error(`Failed to create admin profile: ${profileError.message}`);
    }

    // Send welcome email (implement as needed)
    // await sendWelcomeEmail(admin_email, admin_name, agency.name, tempPassword);

    return {
      success: true,
      agency,
      admin_user: {
        id: adminAuth.user.id,
        email: admin_email,
        name: admin_name,
        temp_password: tempPassword
      }
    };
  } catch (error) {
    console.error('Error creating agency with admin:', error);
    throw error;
  }
}

function getFeaturesByPlan(plan) {
  const features = {
    starter: ['basic_dashboard', 'lead_management', 'basic_reports'],
    professional: ['basic_dashboard', 'lead_management', 'advanced_reports', 'team_management', 'api_access'],
    enterprise: ['basic_dashboard', 'lead_management', 'advanced_reports', 'team_management', 'api_access', 'custom_branding', 'white_label', 'priority_support']
  };
  return features[plan] || features.starter;
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function suspendAgency(agencyId, reason) {
  try {
    const { data: agency, error } = await supabase
      .from('agencies')
      .update({
        is_active: false,
        suspension_reason: reason,
        suspended_at: new Date().toISOString()
      })
      .eq('id', agencyId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to suspend agency: ${error.message}`);
    }

    // Deactivate all users in the agency
    await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('agency_id', agencyId);

    return {
      success: true,
      message: 'Agency suspended successfully',
      agency
    };
  } catch (error) {
    console.error('Error suspending agency:', error);
    throw error;
  }
}

async function activateAgency(agencyId) {
  try {
    const { data: agency, error } = await supabase
      .from('agencies')
      .update({
        is_active: true,
        suspension_reason: null,
        suspended_at: null,
        reactivated_at: new Date().toISOString()
      })
      .eq('id', agencyId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to activate agency: ${error.message}`);
    }

    // Reactivate all users in the agency
    await supabase
      .from('profiles')
      .update({ is_active: true })
      .eq('agency_id', agencyId);

    return {
      success: true,
      message: 'Agency activated successfully',
      agency
    };
  } catch (error) {
    console.error('Error activating agency:', error);
    throw error;
  }
}

async function updateAgencyPricing(pricingData) {
  try {
    const { agency_id, subscription_plan, custom_pricing } = pricingData;

    const updates = {
      subscription_plan,
      updated_at: new Date().toISOString()
    };

    if (custom_pricing) {
      updates.custom_pricing = custom_pricing;
    }

    // Update features based on new plan
    const features = getFeaturesByPlan(subscription_plan);
    updates.settings = {
      api_rate_limit: subscription_plan === 'enterprise' ? 10000 : subscription_plan === 'professional' ? 5000 : 1000,
      features_enabled: features
    };

    const { data: agency, error } = await supabase
      .from('agencies')
      .update(updates)
      .eq('id', agency_id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update agency pricing: ${error.message}`);
    }

    return {
      success: true,
      message: 'Agency pricing updated successfully',
      agency
    };
  } catch (error) {
    console.error('Error updating agency pricing:', error);
    throw error;
  }
}

async function setAgencyRateLimits(rateLimitData) {
  try {
    const { agency_id, rate_limit_config } = rateLimitData;

    const { data: agency, error } = await supabase
      .from('agencies')
      .update({
        settings: {
          ...rate_limit_config,
          updated_at: new Date().toISOString()
        }
      })
      .eq('id', agency_id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to set rate limits: ${error.message}`);
    }

    return {
      success: true,
      message: 'Rate limits updated successfully',
      agency
    };
  } catch (error) {
    console.error('Error setting agency rate limits:', error);
    throw error;
  }
}

async function getAgencyRateLimits(agencyId) {
  try {
    const { data: agency, error } = await supabase
      .from('agencies')
      .select('id, name, settings')
      .eq('id', agencyId)
      .single();

    if (error) {
      throw new Error(`Failed to get rate limits: ${error.message}`);
    }

    return {
      success: true,
      agency_id: agency.id,
      agency_name: agency.name,
      rate_limits: agency.settings || {}
    };
  } catch (error) {
    console.error('Error getting agency rate limits:', error);
    throw error;
  }
}

async function deleteAgency(agencyId) {
  try {
    // First, check if agency exists and get details
    const { data: agency, error: fetchError } = await supabase
      .from('agencies')
      .select('id, name, profiles(id)')
      .eq('id', agencyId)
      .single();

    if (fetchError || !agency) {
      throw new Error('Agency not found');
    }

    // Safety check - prevent deletion if agency has users
    if (agency.profiles && agency.profiles.length > 0) {
      return {
        success: false,
        error: 'Cannot delete agency with existing users. Please remove all users first.',
        user_count: agency.profiles.length
      };
    }

    // Delete agency
    const { error: deleteError } = await supabase
      .from('agencies')
      .delete()
      .eq('id', agencyId);

    if (deleteError) {
      throw new Error(`Failed to delete agency: ${deleteError.message}`);
    }

    return {
      success: true,
      message: `Agency "${agency.name}" deleted successfully`,
      deleted_agency: {
        id: agency.id,
        name: agency.name,
        deleted_at: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error deleting agency:', error);
    throw error;
  }
}

async function updateAgency(agencyId, updateData) {
  try {
    const { data: agency, error } = await supabase
      .from('agencies')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', agencyId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update agency: ${error.message}`);
    }

    return {
      success: true,
      message: 'Agency updated successfully',
      agency
    };
  } catch (error) {
    console.error('Error updating agency:', error);
    throw error;
  }
}

async function performBulkOperations(operationData) {
  try {
    const { operation, agency_ids, data } = operationData;
    
    switch (operation) {
      case 'bulk_suspend':
        const suspendResults = await Promise.all(
          agency_ids.map(id => suspendAgency(id, data.reason))
        );
        return {
          success: true,
          message: `${agency_ids.length} agencies suspended`,
          results: suspendResults
        };
        
      case 'bulk_activate':
        const activateResults = await Promise.all(
          agency_ids.map(id => activateAgency(id))
        );
        return {
          success: true,
          message: `${agency_ids.length} agencies activated`,
          results: activateResults
        };
        
      case 'bulk_update_plan':
        const updateResults = await Promise.all(
          agency_ids.map(id => updateAgencyPricing({ agency_id: id, subscription_plan: data.subscription_plan }))
        );
        return {
          success: true,
          message: `${agency_ids.length} agencies updated to ${data.subscription_plan}`,
          results: updateResults
        };
        
      default:
        throw new Error('Unknown bulk operation');
    }
  } catch (error) {
    console.error('Error performing bulk operations:', error);
    throw error;
  }
}

async function customizeAgencyBranding(brandingData) {
  try {
    const { agency_id, branding_config } = brandingData;

    const { data: agency, error } = await supabase
      .from('agencies')
      .update({
        custom_branding: branding_config,
        updated_at: new Date().toISOString()
      })
      .eq('id', agency_id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update branding: ${error.message}`);
    }

    return {
      success: true,
      message: 'Agency branding updated successfully',
      agency
    };
  } catch (error) {
    console.error('Error updating agency branding:', error);
    throw error;
  }
}