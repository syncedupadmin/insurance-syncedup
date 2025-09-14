import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { period = 'monthly', category = 'total_sales', limit = 100 } = req.query;
    
    // Determine date range based on period
    const now = new Date();
    let dateFilter;
    
    switch (period) {
      case 'weekly':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        dateFilter = startOfWeek.toISOString().slice(0, 10);
        break;
        
      case 'monthly':
        dateFilter = now.toISOString().slice(0, 7); // YYYY-MM format
        break;
        
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3) + 1;
        dateFilter = `${now.getFullYear()}-Q${quarter}`;
        break;
        
      case 'yearly':
        dateFilter = now.getFullYear().toString();
        break;
        
      default:
        dateFilter = now.toISOString().slice(0, 7);
    }

    // Query the global leaderboard
    const { data: leaders, error } = await supabase
      .from('global_leaderboard')
      .select(`
        id,
        agent_id,
        display_name,
        real_name,
        show_real_name,
        agency_name,
        show_agency_name,
        total_sales,
        policies_count,
        customer_satisfaction,
        rank_sales,
        rank_policies,
        rank_satisfaction,
        period,
        period_start,
        created_at,
        updated_at
      `)
      .eq('period', period)
      .eq('period_filter', dateFilter)
      .order(category === 'policies_count' ? 'rank_policies' : 
             category === 'customer_satisfaction' ? 'rank_satisfaction' : 'rank_sales', 
             { ascending: true })
      .limit(Math.min(parseInt(limit) || 100, 500)); // Cap at 500 max

    if (error) {
      console.error('Leaderboard query error:', error);
      return res.status(500).json({ error: 'Failed to fetch leaderboard data' });
    }

    // Process and anonymize data based on privacy settings
    const processedLeaders = leaders.map((leader, index) => {
      const actualRank = index + 1;
      
      return {
        rank: actualRank,
        display_name: leader.show_real_name ? leader.real_name : `Agent #${String(actualRank).padStart(3, '0')}`,
        agency_name: leader.show_agency_name ? leader.agency_name : 'Private Agency',
        total_sales: leader.total_sales || 0,
        policies_count: leader.policies_count || 0,
        customer_satisfaction: leader.customer_satisfaction || null,
        // Performance indicators without exposing exact amounts
        performance_tier: getTierBadge(leader.total_sales),
        period,
        last_updated: leader.updated_at
      };
    });

    // Add aggregated statistics
    const stats = {
      total_participants: leaders.length,
      period,
      period_display: formatPeriodDisplay(period, dateFilter),
      top_performer: processedLeaders[0] || null,
      average_sales: leaders.length > 0 ? 
        Math.round(leaders.reduce((sum, l) => sum + (l.total_sales || 0), 0) / leaders.length) : 0,
      total_policies: leaders.reduce((sum, l) => sum + (l.policies_count || 0), 0)
    };

    // Add category-specific rankings if requested
    let categoryLeaders = processedLeaders;
    if (category === 'policies_count') {
      categoryLeaders = [...processedLeaders].sort((a, b) => b.policies_count - a.policies_count);
    } else if (category === 'customer_satisfaction') {
      categoryLeaders = [...processedLeaders].filter(l => l.customer_satisfaction !== null)
        .sort((a, b) => b.customer_satisfaction - a.customer_satisfaction);
    }

    return res.json({
      success: true,
      leaderboard: categoryLeaders,
      category,
      stats,
      meta: {
        generated_at: new Date().toISOString(),
        privacy_note: "Names and agency information are anonymized based on participant privacy preferences",
        data_freshness: "Updated every 15 minutes during business hours"
      }
    });

  } catch (error) {
    console.error('Global leaderboard error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// Helper function to determine performance tier
function getTierBadge(totalSales) {
  if (!totalSales || totalSales === 0) return 'Bronze';
  if (totalSales >= 100000) return 'Diamond';
  if (totalSales >= 75000) return 'Platinum';
  if (totalSales >= 50000) return 'Gold';
  if (totalSales >= 25000) return 'Silver';
  return 'Bronze';
}

// Helper function to format period display
function formatPeriodDisplay(period, dateFilter) {
  const now = new Date();
  
  switch (period) {
    case 'weekly':
      return `Week of ${new Date(dateFilter).toLocaleDateString()}`;
    case 'monthly':
      const [year, month] = dateFilter.split('-');
      return `${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    case 'quarterly':
      return `${dateFilter}`;
    case 'yearly':
      return `Year ${dateFilter}`;
    default:
      return dateFilter;
  }
}