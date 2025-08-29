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
    
    // Return mock commission data filtered by post date weeks
    // In real implementation, this would query sales where post_date falls within the week range
    
    let mockCommissions;
    
    if (timeframe === 'thisweek') {
      // Commissions for sales with post dates in this week
      mockCommissions = [
        {
          saleId: 'SALE008',
          amount: '98.70',
          status: 'pending',
          productName: 'Good Health Distribution Partner 1',
          premium: '329.00',
          postDate: weekRange.start, // Sunday of this week
          effectiveDate: weekRange.start,
          commissionRate: '30%',
          dateCreated: new Date().toISOString()
        },
        {
          saleId: 'SALE009', 
          amount: '127.50',
          status: 'pending',
          productName: 'Summit Plan 500',
          premium: '425.00',
          postDate: new Date(new Date(weekRange.start).getTime() + 2*24*60*60*1000).toISOString().split('T')[0], // Tuesday
          effectiveDate: new Date(new Date(weekRange.start).getTime() + 2*24*60*60*1000).toISOString().split('T')[0],
          commissionRate: '30%',
          dateCreated: new Date().toISOString()
        },
        {
          saleId: 'SALE010',
          amount: '81.60',
          status: 'pending',
          productName: 'Sigma Care PLUS 200',
          premium: '272.00',
          postDate: new Date(new Date(weekRange.start).getTime() + 4*24*60*60*1000).toISOString().split('T')[0], // Thursday
          effectiveDate: new Date(new Date(weekRange.start).getTime() + 4*24*60*60*1000).toISOString().split('T')[0],
          commissionRate: '30%',
          dateCreated: new Date().toISOString()
        }
      ];
    } else if (timeframe === 'lastweek') {
      // Commissions for sales with post dates in last week
      mockCommissions = [
        {
          saleId: 'SALE001',
          amount: '115.01',
          status: 'paid',
          productName: 'Good Health Distribution Partner 2',
          premium: '383.38',
          postDate: weekRange.start, // Sunday of last week
          effectiveDate: weekRange.start,
          commissionRate: '30%',
          dateCreated: new Date(Date.now() - 7*24*60*60*1000).toISOString()
        },
        {
          saleId: 'SALE002', 
          amount: '135.95',
          status: 'paid',
          productName: 'Summit Plan 750',
          premium: '453.16',
          postDate: new Date(new Date(weekRange.start).getTime() + 3*24*60*60*1000).toISOString().split('T')[0], // Wednesday
          effectiveDate: new Date(new Date(weekRange.start).getTime() + 3*24*60*60*1000).toISOString().split('T')[0],
          commissionRate: '30%',
          dateCreated: new Date(Date.now() - 4*24*60*60*1000).toISOString()
        },
        {
          saleId: 'SALE003',
          amount: '96.30',
          status: 'paid',
          productName: 'Sigma Care PLUS 100',
          premium: '321.00',
          postDate: new Date(new Date(weekRange.start).getTime() + 5*24*60*60*1000).toISOString().split('T')[0], // Friday
          effectiveDate: new Date(new Date(weekRange.start).getTime() + 5*24*60*60*1000).toISOString().split('T')[0],
          commissionRate: '30%',
          dateCreated: new Date(Date.now() - 2*24*60*60*1000).toISOString()
        }
      ];
    } else {
      // Default to this week
      mockCommissions = [
        {
          saleId: 'SALE008',
          amount: '98.70',
          status: 'pending',
          productName: 'Good Health Distribution Partner 1',
          premium: '329.00',
          postDate: weekRange.start,
          effectiveDate: weekRange.start,
          commissionRate: '30%',
          dateCreated: new Date().toISOString()
        }
      ];
    }

    console.log(`Commissions request for agent: ${agentId}, timeframe: ${timeframe}, found ${mockCommissions.length} commissions`);
    res.status(200).json(mockCommissions);

  } catch (error) {
    console.error('Commissions API error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}