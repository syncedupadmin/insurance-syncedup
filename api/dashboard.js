import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function getWeekDateRange(timeframe) {
  const today = new Date();
  let startDate, endDate;
  
  if (timeframe === 'thisweek') {
    // This week starts on Sunday
    startDate = new Date(today);
    startDate.setDate(today.getDate() - today.getDay());
    startDate.setHours(0, 0, 0, 0);
    
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else if (timeframe === 'lastweek') {
    // Last week 
    startDate = new Date(today);
    startDate.setDate(today.getDate() - today.getDay() - 7);
    startDate.setHours(0, 0, 0, 0);
    
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // Default to this week if no timeframe specified
    startDate = new Date(today);
    startDate.setDate(today.getDate() - today.getDay());
    startDate.setHours(0, 0, 0, 0);
    
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  }
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { agentId, timeframe } = req.query;

  if (!agentId) {
    return res.status(400).json({ error: 'Agent ID is required' });
  }

  try {
    // Get the week date range for filtering by post dates
    const weekRange = getWeekDateRange(timeframe || 'thisweek');
    
    // Return mock dashboard data filtered by post date weeks
    // In real implementation, this would query sales where post_date falls within the week range
    
    let mockDashboardData;
    
    if (timeframe === 'thisweek') {
      // This week's performance
      mockDashboardData = {
        totalSales: 8,
        totalPremium: '2,640.00',
        totalCommission: '792.00',
        averageSale: '330.00',
        agentId: agentId,
        timeframe: timeframe || 'thisweek',
        period: `This Week (${weekRange.start} - ${weekRange.end})`,
        weekRange: weekRange
      };
    } else if (timeframe === 'lastweek') {
      // Last week's performance
      mockDashboardData = {
        totalSales: 12,
        totalPremium: '3,840.00',
        totalCommission: '1,152.00',
        averageSale: '320.00',
        agentId: agentId,
        timeframe: timeframe,
        period: `Last Week (${weekRange.start} - ${weekRange.end})`,
        weekRange: weekRange
      };
    } else {
      // Default to this week
      mockDashboardData = {
        totalSales: 8,
        totalPremium: '2,640.00',
        totalCommission: '792.00',
        averageSale: '330.00',
        agentId: agentId,
        timeframe: 'thisweek',
        period: `This Week (${weekRange.start} - ${weekRange.end})`,
        weekRange: weekRange
      };
    }

    console.log(`Dashboard request for agent: ${agentId}, timeframe: ${timeframe}, period: ${mockDashboardData.period}`);
    res.status(200).json(mockDashboardData);

  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}