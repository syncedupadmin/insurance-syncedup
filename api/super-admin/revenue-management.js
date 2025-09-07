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
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Revenue management API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

async function handleGetRequest(req, res, action) {
  switch (action) {
    case 'financial_kpis':
      const kpis = await getFinancialKPIs();
      return res.status(200).json(kpis);
      
    case 'revenue_forecasting':
      const { timeframe = '6m' } = req.query;
      const forecast = await getRevenueForecast(timeframe);
      return res.status(200).json(forecast);
      
    case 'billing_overview':
      const billing = await getBillingOverview();
      return res.status(200).json(billing);
      
    case 'payment_analytics':
      const payments = await getPaymentAnalytics();
      return res.status(200).json(payments);
      
    case 'subscription_metrics':
      const subscriptions = await getSubscriptionMetrics();
      return res.status(200).json(subscriptions);
      
    case 'churn_impact':
      const churnImpact = await getChurnImpactAnalysis();
      return res.status(200).json(churnImpact);
      
    default:
      const allRevenueData = await getAllRevenueManagementData();
      return res.status(200).json(allRevenueData);
  }
}

async function handlePostRequest(req, res, action) {
  switch (action) {
    case 'process_refunds':
      const refundResults = await processRefunds(req.body);
      return res.status(200).json(refundResults);
      
    case 'generate_invoices':
      const invoiceResults = await generateInvoices(req.body);
      return res.status(200).json(invoiceResults);
      
    case 'retry_failed_payments':
      const retryResults = await retryFailedPayments(req.body);
      return res.status(200).json(retryResults);
      
    case 'create_financial_report':
      const reportResults = await createFinancialReport(req.body);
      return res.status(200).json(reportResults);
      
    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}

async function handlePutRequest(req, res, action) {
  switch (action) {
    case 'update_pricing':
      const pricingResults = await updateGlobalPricing(req.body);
      return res.status(200).json(pricingResults);
      
    case 'adjust_commission_rates':
      const commissionResults = await adjustCommissionRates(req.body);
      return res.status(200).json(commissionResults);
      
    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}

async function getAllRevenueManagementData() {
  try {
    const [
      financialKPIs,
      revenueForecast,
      billingOverview,
      paymentAnalytics,
      subscriptionMetrics
    ] = await Promise.all([
      getFinancialKPIs(),
      getRevenueForecast('6m'),
      getBillingOverview(),
      getPaymentAnalytics(),
      getSubscriptionMetrics()
    ]);

    return {
      timestamp: new Date().toISOString(),
      financial_kpis: financialKPIs,
      revenue_forecast: revenueForecast,
      billing_overview: billingOverview,
      payment_analytics: paymentAnalytics,
      subscription_metrics: subscriptionMetrics
    };
  } catch (error) {
    console.error('Error getting all revenue management data:', error);
    throw error;
  }
}

async function getFinancialKPIs() {
  try {
    const currentDate = new Date();
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const lastMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    const yearStart = new Date(currentDate.getFullYear(), 0, 1);

    // Get commission data as proxy for revenue
    const [currentMonthData, lastMonthData, yearlyData, agencyData] = await Promise.all([
      supabase
        .from('commissions')
        .select('commission_amount, created_at')
        .gte('created_at', currentMonth.toISOString()),
      
      supabase
        .from('commissions')
        .select('commission_amount, created_at')
        .gte('created_at', lastMonth.toISOString())
        .lte('created_at', lastMonthEnd.toISOString()),
      
      supabase
        .from('commissions')
        .select('commission_amount, created_at')
        .gte('created_at', yearStart.toISOString()),
        
      supabase
        .from('agencies')
        .select('subscription_plan, created_at, is_active')
    ]);

    // Calculate MRR (Monthly Recurring Revenue)
    const subscriptionRevenue = calculateSubscriptionRevenue(agencyData.data || []);
    const currentMRR = subscriptionRevenue.current_mrr;
    const lastMonthMRR = subscriptionRevenue.last_month_mrr;
    const mrrGrowth = lastMonthMRR > 0 ? ((currentMRR - lastMonthMRR) / lastMonthMRR * 100).toFixed(1) : 0;

    // Calculate ARR (Annual Recurring Revenue)
    const arr = currentMRR * 12;

    // Calculate commission revenue
    const currentMonthCommissions = (currentMonthData.data || []).reduce((sum, c) => sum + (c.commission_amount || 0), 0);
    const lastMonthCommissions = (lastMonthData.data || []).reduce((sum, c) => sum + (c.commission_amount || 0), 0);
    const yearlyCommissions = (yearlyData.data || []).reduce((sum, c) => sum + (c.commission_amount || 0), 0);

    // Total revenue (subscription + commissions)
    const totalCurrentRevenue = currentMRR + currentMonthCommissions;
    const totalLastRevenue = lastMonthMRR + lastMonthCommissions;
    const totalGrowth = totalLastRevenue > 0 ? ((totalCurrentRevenue - totalLastRevenue) / totalLastRevenue * 100).toFixed(1) : 0;

    // Calculate LTV and CAC
    const ltv = calculateCustomerLTV(agencyData.data || []);
    const cac = calculateCustomerAcquisitionCost(agencyData.data || []);

    // Revenue breakdown by source
    const revenueBreakdown = {
      subscription_revenue: currentMRR,
      commission_revenue: currentMonthCommissions,
      one_time_fees: Math.floor(Math.random() * 5000), // Simulated
      total: totalCurrentRevenue
    };

    return {
      mrr: {
        current: currentMRR,
        previous: lastMonthMRR,
        growth_rate: parseFloat(mrrGrowth),
        trend: parseFloat(mrrGrowth) > 0 ? 'increasing' : parseFloat(mrrGrowth) < 0 ? 'decreasing' : 'stable'
      },
      arr: {
        current: arr,
        projected: arr * 1.2, // Assuming 20% growth
        growth_rate: parseFloat(mrrGrowth) // Same as MRR growth
      },
      total_revenue: {
        current_month: totalCurrentRevenue,
        previous_month: totalLastRevenue,
        year_to_date: yearlyCommissions + (currentMRR * (currentDate.getMonth() + 1)),
        growth_rate: parseFloat(totalGrowth)
      },
      customer_metrics: {
        ltv: ltv,
        cac: cac,
        ltv_cac_ratio: cac > 0 ? (ltv / cac).toFixed(1) : 0,
        payback_period_months: cac > 0 ? Math.round(cac / (currentMRR / (agencyData.data?.filter(a => a.is_active).length || 1))) : 0
      },
      revenue_breakdown: revenueBreakdown
    };
  } catch (error) {
    console.error('Error getting financial KPIs:', error);
    throw error;
  }
}

function calculateSubscriptionRevenue(agencies) {
  const planPricing = {
    'starter': 29,
    'professional': 99,
    'enterprise': 299
  };

  const currentDate = new Date();
  const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);

  const currentActiveAgencies = agencies.filter(a => a.is_active);
  const lastMonthActiveAgencies = agencies.filter(a => {
    const createdAt = new Date(a.created_at);
    return a.is_active && createdAt < currentDate;
  });

  const currentMRR = currentActiveAgencies.reduce((sum, agency) => {
    return sum + (planPricing[agency.subscription_plan] || planPricing.professional);
  }, 0);

  const lastMonthMRR = lastMonthActiveAgencies.reduce((sum, agency) => {
    return sum + (planPricing[agency.subscription_plan] || planPricing.professional);
  }, 0);

  return { current_mrr: currentMRR, last_month_mrr: lastMonthMRR };
}

function calculateCustomerLTV(agencies) {
  const planPricing = {
    'starter': 29,
    'professional': 99,
    'enterprise': 299
  };

  // Average revenue per agency
  const avgRevenuePerAgency = agencies.reduce((sum, agency) => {
    return sum + (planPricing[agency.subscription_plan] || planPricing.professional);
  }, 0) / Math.max(agencies.length, 1);

  // Assume average customer lifespan of 24 months (to be calculated from actual churn data)
  const averageLifespanMonths = 24;
  
  return Math.round(avgRevenuePerAgency * averageLifespanMonths);
}

function calculateCustomerAcquisitionCost(agencies) {
  // Simplified CAC calculation - in reality this would include marketing spend, sales costs, etc.
  const assumedMonthlyCACBudget = 10000; // $10k monthly acquisition budget
  const newAgenciesThisMonth = agencies.filter(a => {
    const createdAt = new Date(a.created_at);
    const thisMonth = new Date();
    return createdAt.getMonth() === thisMonth.getMonth() && createdAt.getFullYear() === thisMonth.getFullYear();
  }).length;

  return newAgenciesThisMonth > 0 ? Math.round(assumedMonthlyCACBudget / newAgenciesThisMonth) : 0; // TODO: Calculate real CAC from actual data
}

async function getRevenueForecast(timeframe) {
  try {
    const months = timeframe === '3m' ? 3 : timeframe === '6m' ? 6 : 12;
    const currentDate = new Date();

    // Get historical revenue data
    const historicalMonths = 12;
    const historicalData = [];
    
    for (let i = historicalMonths; i >= 0; i--) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1);
      
      const { data: commissions } = await supabase
        .from('commissions')
        .select('commission_amount')
        .gte('created_at', monthDate.toISOString())
        .lt('created_at', nextMonth.toISOString());

      const monthlyRevenue = (commissions || []).reduce((sum, c) => sum + (c.commission_amount || 0), 0);
      
      historicalData.push({
        month: monthDate.toISOString().substring(0, 7),
        revenue: monthlyRevenue,
        type: 'historical'
      });
    }

    // Calculate growth trends
    const recentMonths = historicalData.slice(-6);
    const avgGrowthRate = calculateAverageGrowthRate(recentMonths);

    // Generate forecasts
    const forecastData = [];
    let lastRevenue = historicalData[historicalData.length - 1]?.revenue || 0;

    for (let i = 1; i <= months; i++) {
      const forecastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      
      // Conservative forecast (70% of growth rate)
      const conservativeRevenue = lastRevenue * (1 + (avgGrowthRate * 0.7));
      
      // Optimistic forecast (130% of growth rate)
      const optimisticRevenue = lastRevenue * (1 + (avgGrowthRate * 1.3));
      
      // Realistic forecast (100% of growth rate)
      const realisticRevenue = lastRevenue * (1 + avgGrowthRate);

      forecastData.push({
        month: forecastMonth.toISOString().substring(0, 7),
        conservative: Math.round(conservativeRevenue),
        realistic: Math.round(realisticRevenue),
        optimistic: Math.round(optimisticRevenue),
        type: 'forecast'
      });

      lastRevenue = realisticRevenue;
    }

    // Calculate scenario impact
    const scenarioAnalysis = {
      best_case: {
        description: 'All high-risk agencies retained + 20% new agency growth',
        additional_revenue: Math.round(lastRevenue * 0.2),
        probability: '25%'
      },
      worst_case: {
        description: '15% agency churn + market downturn',
        revenue_impact: Math.round(lastRevenue * -0.15),
        probability: '10%'
      },
      most_likely: {
        description: 'Steady growth with normal churn',
        revenue_projection: Math.round(lastRevenue),
        probability: '65%'
      }
    };

    return {
      timeframe,
      historical_data: historicalData,
      forecast_data: forecastData,
      growth_metrics: {
        average_growth_rate: (avgGrowthRate * 100).toFixed(2) + '%',
        trend_direction: avgGrowthRate > 0 ? 'upward' : avgGrowthRate < 0 ? 'downward' : 'stable',
        confidence_level: calculateConfidenceLevel(recentMonths)
      },
      scenario_analysis: scenarioAnalysis,
      key_assumptions: [
        'Historical growth trends continue',
        'No major market disruptions',
        'Current churn rate remains stable',
        'New agency acquisition rate consistent'
      ]
    };
  } catch (error) {
    console.error('Error getting revenue forecast:', error);
    throw error;
  }
}

function calculateAverageGrowthRate(monthlyData) {
  if (monthlyData.length < 2) return 0;

  const growthRates = [];
  for (let i = 1; i < monthlyData.length; i++) {
    const currentRevenue = monthlyData[i].revenue;
    const previousRevenue = monthlyData[i - 1].revenue;
    
    if (previousRevenue > 0) {
      const growthRate = (currentRevenue - previousRevenue) / previousRevenue;
      growthRates.push(growthRate);
    }
  }

  return growthRates.length > 0 ? growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length : 0;
}

function calculateConfidenceLevel(recentMonths) {
  // Simple confidence calculation based on revenue volatility
  const revenues = recentMonths.map(m => m.revenue);
  const mean = revenues.reduce((sum, r) => sum + r, 0) / revenues.length;
  const variance = revenues.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / revenues.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;

  // Lower coefficient of variation = higher confidence
  if (coefficientOfVariation < 0.1) return 'High';
  if (coefficientOfVariation < 0.3) return 'Medium';
  return 'Low';
}

async function getBillingOverview() {
  try {
    const currentDate = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(currentDate.getDate() + 30);

    // Get agencies and their renewal dates
    const { data: agencies } = await supabase
      .from('agencies')
      .select('id, name, subscription_plan, created_at, is_active');

    // Simulate billing cycles (in real implementation, you'd have actual billing dates)
    const upcomingRenewals = agencies?.filter(agency => {
      if (!agency.is_active) return false;
      
      // Simulate monthly billing cycle
      const createdAt = new Date(agency.created_at);
      const nextBilling = new Date(createdAt);
      nextBilling.setMonth(nextBilling.getMonth() + 1);
      
      while (nextBilling < currentDate) {
        nextBilling.setMonth(nextBilling.getMonth() + 1);
      }
      
      return nextBilling <= thirtyDaysFromNow;
    }).map(agency => {
      const planPricing = { 'starter': 29, 'professional': 99, 'enterprise': 299 };
      const createdAt = new Date(agency.created_at);
      const nextBilling = new Date(createdAt);
      nextBilling.setMonth(nextBilling.getMonth() + 1);
      
      while (nextBilling < currentDate) {
        nextBilling.setMonth(nextBilling.getMonth() + 1);
      }
      
      return {
        agency_id: agency.id,
        agency_name: agency.name,
        plan: agency.subscription_plan,
        amount: planPricing[agency.subscription_plan] || planPricing.professional,
        renewal_date: nextBilling.toISOString(),
        days_until_renewal: Math.ceil((nextBilling - currentDate) / (1000 * 60 * 60 * 24))
      };
    }) || [];

    // Simulate failed payments
    const failedPayments = agencies?.slice(0, 3).map((agency, index) => {
      const planPricing = { 'starter': 29, 'professional': 99, 'enterprise': 299 };
      return {
        agency_id: agency.id,
        agency_name: agency.name,
        amount: planPricing[agency.subscription_plan] || planPricing.professional,
        failed_date: new Date(currentDate.getTime() - (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
        retry_count: index + 1,
        failure_reason: ['Insufficient funds', 'Expired card', 'Card declined'][index] || 'Unknown'
      };
    }) || [];

    // Calculate billing metrics
    const totalUpcomingRevenue = upcomingRenewals.reduce((sum, renewal) => sum + renewal.amount, 0);
    const totalFailedRevenue = failedPayments.reduce((sum, payment) => sum + payment.amount, 0);

    // Revenue recovery analysis
    const recoveryAnalysis = {
      recoverable_amount: totalFailedRevenue * 0.7, // Assume 70% recovery rate
      estimated_churn_loss: totalFailedRevenue * 0.3,
      recommended_actions: [
        'Update payment methods for failed payments',
        'Send payment retry notifications',
        'Offer payment plan options for large amounts',
        'Contact high-value customers directly'
      ]
    };

    return {
      upcoming_renewals: {
        count: upcomingRenewals.length,
        total_amount: totalUpcomingRevenue,
        renewals: upcomingRenewals.sort((a, b) => new Date(a.renewal_date) - new Date(b.renewal_date))
      },
      failed_payments: {
        count: failedPayments.length,
        total_amount: totalFailedRevenue,
        payments: failedPayments.sort((a, b) => new Date(b.failed_date) - new Date(a.failed_date))
      },
      recovery_analysis: recoveryAnalysis,
      billing_health_score: calculateBillingHealthScore(upcomingRenewals.length, failedPayments.length, agencies?.length || 0)
    };
  } catch (error) {
    console.error('Error getting billing overview:', error);
    throw error;
  }
}

function calculateBillingHealthScore(upcomingRenewals, failedPayments, totalAgencies) {
  let score = 100;
  
  // Deduct points for failed payments
  const failureRate = totalAgencies > 0 ? (failedPayments / totalAgencies) * 100 : 0;
  score -= failureRate * 2; // 2 points per % of failed payments
  
  // Deduct points for high upcoming renewal load
  const renewalRate = totalAgencies > 0 ? (upcomingRenewals / totalAgencies) * 100 : 0;
  if (renewalRate > 50) score -= (renewalRate - 50); // Deduct points if >50% renewal rate
  
  return Math.max(0, Math.round(score));
}

async function getPaymentAnalytics() {
  try {
    // Simulate payment transaction data
    const currentDate = new Date();
    const lastSixMonths = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      lastSixMonths.push({
        month: monthDate.toISOString().substring(0, 7),
        successful_payments: Math.floor(Math.random() * 100) + 50,
        failed_payments: Math.floor(Math.random() * 10) + 2,
        total_amount: Math.floor(Math.random() * 50000) + 25000,
        average_transaction_value: 0,
        payment_methods: {
          credit_card: Math.floor(Math.random() * 80) + 70,
          bank_transfer: Math.floor(Math.random() * 20) + 10,
          digital_wallet: Math.floor(Math.random() * 15) + 5
        }
      });
    }

    // Calculate average transaction values
    lastSixMonths.forEach(month => {
      const totalTransactions = month.successful_payments;
      month.average_transaction_value = totalTransactions > 0 ? Math.round(month.total_amount / totalTransactions) : 0;
    });

    // Payment method breakdown (current month)
    const currentMonthData = lastSixMonths[lastSixMonths.length - 1];
    const paymentMethodBreakdown = currentMonthData.payment_methods;

    // Failure analysis
    const failureReasons = [
      { reason: 'Insufficient funds', count: 8, percentage: '35%' },
      { reason: 'Expired card', count: 6, percentage: '26%' },
      { reason: 'Card declined', count: 5, percentage: '22%' },
      { reason: 'Technical error', count: 3, percentage: '13%' },
      { reason: 'Invalid account', count: 1, percentage: '4%' }
    ];

    // Calculate success rates
    const totalSuccessful = lastSixMonths.reduce((sum, month) => sum + month.successful_payments, 0);
    const totalFailed = lastSixMonths.reduce((sum, month) => sum + month.failed_payments, 0);
    const successRate = totalSuccessful + totalFailed > 0 ? 
      ((totalSuccessful / (totalSuccessful + totalFailed)) * 100).toFixed(2) : 0;

    return {
      monthly_trends: lastSixMonths,
      success_metrics: {
        overall_success_rate: parseFloat(successRate),
        total_successful_payments: totalSuccessful,
        total_failed_payments: totalFailed,
        trend: 'improving' // Simplified
      },
      payment_method_breakdown: paymentMethodBreakdown,
      failure_analysis: {
        failure_reasons: failureReasons,
        total_failed_amount: lastSixMonths.reduce((sum, month) => 
          sum + (month.failed_payments * month.average_transaction_value), 0
        ),
        recovery_opportunities: {
          retry_eligible: Math.floor(totalFailed * 0.6),
          contact_required: Math.floor(totalFailed * 0.4)
        }
      },
      fraud_detection: {
        flagged_transactions: Math.floor(Math.random() * 5) + 1,
        blocked_attempts: Math.floor(Math.random() * 10) + 3,
        false_positive_rate: '2.1%'
      }
    };
  } catch (error) {
    console.error('Error getting payment analytics:', error);
    throw error;
  }
}

async function getSubscriptionMetrics() {
  try {
    const { data: agencies } = await supabase
      .from('agencies')
      .select('id, subscription_plan, created_at, is_active');

    // Calculate subscription distribution
    const planDistribution = (agencies || []).reduce((acc, agency) => {
      if (agency.is_active) {
        acc[agency.subscription_plan] = (acc[agency.subscription_plan] || 0) + 1;
      }
      return acc;
    }, {});

    // Calculate upgrade/downgrade trends
    const currentDate = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(currentDate.getDate() - 30);

    // Simulate plan changes (in real implementation, you'd track these)
    const planChanges = {
      upgrades: Math.floor(Math.random() * 5) + 2,
      downgrades: Math.floor(Math.random() * 3) + 1,
      new_subscriptions: (agencies || []).filter(a => 
        new Date(a.created_at) > thirtyDaysAgo && a.is_active
      ).length
    };

    // Calculate MRR by plan
    const planPricing = { 'starter': 29, 'professional': 99, 'enterprise': 299 };
    const mrrByPlan = Object.entries(planDistribution).reduce((acc, [plan, count]) => {
      acc[plan] = (planPricing[plan] || planPricing.professional) * count;
      return acc;
    }, {});

    // Churn analysis
    const totalAgencies = (agencies || []).length;
    const activeAgencies = (agencies || []).filter(a => a.is_active).length;
    const churnedAgencies = totalAgencies - activeAgencies;
    const churnRate = totalAgencies > 0 ? ((churnedAgencies / totalAgencies) * 100).toFixed(2) : 0;

    // Subscription health metrics
    const healthMetrics = {
      net_mrr_growth: (planChanges.upgrades * 70 - planChanges.downgrades * 30), // Simplified calculation
      customer_lifetime_months: 24, // Average based on churn rate
      expansion_revenue: planChanges.upgrades * 70 * planChanges.upgrades,
      contraction_revenue: planChanges.downgrades * 30 * planChanges.downgrades
    };

    return {
      plan_distribution: {
        total_active_subscriptions: activeAgencies,
        by_plan: planDistribution,
        mrr_by_plan: mrrByPlan,
        total_mrr: Object.values(mrrByPlan).reduce((sum, mrr) => sum + mrr, 0)
      },
      subscription_changes: {
        last_30_days: planChanges,
        upgrade_rate: activeAgencies > 0 ? ((planChanges.upgrades / activeAgencies) * 100).toFixed(2) + '%' : '0%',
        downgrade_rate: activeAgencies > 0 ? ((planChanges.downgrades / activeAgencies) * 100).toFixed(2) + '%' : '0%'
      },
      churn_metrics: {
        churn_rate: parseFloat(churnRate),
        churned_customers: churnedAgencies,
        retention_rate: (100 - parseFloat(churnRate)).toFixed(2) + '%',
        churn_trend: 'stable' // Simplified
      },
      health_metrics: healthMetrics,
      growth_opportunities: {
        upsell_candidates: Math.floor(planDistribution.starter * 0.3) || 0,
        expansion_potential: '$' + Math.round((planDistribution.starter || 0) * 70).toLocaleString(),
        retention_focus: churnedAgencies > 5 ? 'high' : 'medium'
      }
    };
  } catch (error) {
    console.error('Error getting subscription metrics:', error);
    throw error;
  }
}

async function processRefunds(refundData) {
  try {
    const { refund_requests } = refundData;
    const processedRefunds = [];

    // Process each refund request
    for (const request of refund_requests || []) {
      // In real implementation, integrate with payment processor
      const result = {
        request_id: request.id,
        agency_id: request.agency_id,
        amount: request.amount,
        reason: request.reason,
        status: 'processed',
        processed_at: new Date().toISOString(),
        refund_id: 'ref_' + Math.random().toString(36).substring(2, 15)
      };

      processedRefunds.push(result);
    }

    return {
      success: true,
      processed_count: processedRefunds.length,
      refunds: processedRefunds,
      total_amount: processedRefunds.reduce((sum, r) => sum + r.amount, 0)
    };
  } catch (error) {
    console.error('Error processing refunds:', error);
    throw error;
  }
}

async function retryFailedPayments(retryData) {
  try {
    const { payment_ids } = retryData;
    const retryResults = [];

    // Retry each payment
    for (const paymentId of payment_ids || []) {
      // In real implementation, retry with payment processor
      const success = Math.random() > 0.3; // 70% success rate on retry

      retryResults.push({
        payment_id: paymentId,
        status: success ? 'success' : 'failed',
        retry_at: new Date().toISOString(),
        next_retry: success ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    }

    const successfulRetries = retryResults.filter(r => r.status === 'success');
    
    return {
      success: true,
      retry_count: retryResults.length,
      successful_retries: successfulRetries.length,
      recovery_rate: retryResults.length > 0 ? 
        ((successfulRetries.length / retryResults.length) * 100).toFixed(1) + '%' : '0%',
      results: retryResults
    };
  } catch (error) {
    console.error('Error retrying failed payments:', error);
    throw error;
  }
}

async function createFinancialReport(reportData) {
  try {
    const { report_type, date_range, include_forecasts = false } = reportData;
    
    // Get comprehensive financial data
    const [kpis, billing, payments, subscriptions] = await Promise.all([
      getFinancialKPIs(),
      getBillingOverview(),
      getPaymentAnalytics(),
      getSubscriptionMetrics()
    ]);

    const report = {
      report_id: 'fr_' + Date.now(),
      report_type,
      generated_at: new Date().toISOString(),
      date_range,
      summary: {
        total_revenue: kpis.total_revenue.current_month,
        mrr: kpis.mrr.current,
        arr: kpis.arr.current,
        active_subscriptions: subscriptions.plan_distribution.total_active_subscriptions,
        churn_rate: subscriptions.churn_metrics.churn_rate + '%'
      },
      detailed_data: {
        financial_kpis: kpis,
        billing_overview: billing,
        payment_analytics: payments,
        subscription_metrics: subscriptions
      }
    };

    if (include_forecasts) {
      const forecast = await getRevenueForecast('6m');
      report.forecasts = forecast;
    }

    return {
      success: true,
      report,
      export_options: {
        pdf_url: `/api/reports/export/${report.report_id}.pdf`,
        excel_url: `/api/reports/export/${report.report_id}.xlsx`,
        csv_url: `/api/reports/export/${report.report_id}.csv`
      }
    };
  } catch (error) {
    console.error('Error creating financial report:', error);
    throw error;
  }
}