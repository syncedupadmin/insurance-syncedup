import { createClient } from '@supabase/supabase-js';
import { getUserContext } from './utils/auth-helper';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { timeframe } = req.query;
  
  try {
    // Get user context from JWT/session
    const { agencyId, agentId, role } = getUserContext(req);
    console.log('Dashboard API called for role:', role, 'agencyId:', agencyId, 'agentId:', agentId, 'timeframe:', timeframe);

    // Calculate date range based on timeframe
    let startDate, endDate;
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    if (timeframe === 'thisweek') {
      // This week (Sunday to Saturday)
      const sundayOffset = dayOfWeek;
      startDate = new Date(today);
      startDate.setDate(today.getDate() - sundayOffset);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (timeframe === 'lastweek') {
      // Last week (Previous Sunday to Saturday)
      const sundayOffset = dayOfWeek + 7;
      startDate = new Date(today);
      startDate.setDate(today.getDate() - sundayOffset);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default to this month
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    // Build query with role-based filtering
    let query = supabase.from('portal_sales');

    if (role === 'agent') {
      query = query.eq('agent_id', agentId);
    } else if (role === 'manager' || role === 'admin') {
      query = query.eq('agency_id', agencyId);
    }
    // Super admin sees all data (no additional filtering)

    // Add date filtering
    query = query
      .gte('sale_date', startDate.toISOString())
      .lte('sale_date', endDate.toISOString());

    const { data: sales, error } = await query.select('*');

    if (error) {
      console.error('Query error:', error);
      throw error;
    }

    // Calculate totals from actual data
    const totalSales = sales?.length || 0;
    const totalPremium = sales?.reduce((sum, sale) => sum + (sale.premium || 0), 0) || 0;
    const totalCommission = sales?.reduce((sum, sale) => sum + (sale.commission || 0), 0) || 0;
    const averageSale = totalSales > 0 ? totalPremium / totalSales : 0;

    const dashboardData = {
      totalSales,
      totalPremium: totalPremium.toFixed(2),
      totalCommission: totalCommission.toFixed(2),
      averageSale: averageSale.toFixed(2),
      role,
      agencyId,
      agentId,
      timeframe,
      period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
    };

    console.log('Returning dashboard data:', dashboardData);
    res.status(200).json(dashboardData);
    
  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard data', 
      details: error.message 
    });
  }
}