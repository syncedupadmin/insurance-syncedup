import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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

  const { agentId, payPeriod } = req.query;

  if (!agentId) {
    return res.status(400).json({ error: 'Agent ID is required' });
  }

  try {
    // Return mock chargeback data since we don't have chargeback tables yet
    // In real implementation, this would query chargebacks that will hit the specified pay period
    
    const weekRange = getWeekDateRange(payPeriod || 'thisweek');
    
    // Mock chargebacks that would hit this week's paycheck
    const mockChargebacks = [
      {
        id: 'CB001',
        originalSaleId: 'SALE004',
        agentId: agentId,
        amount: -115.01, // Negative because it's a deduction
        cancellationDate: '2025-08-15',
        originalCommission: 115.01,
        daysInForce: 65,
        payPeriodApplied: weekRange.start,
        reason: 'Customer cancelled after agent payout - member did not make 2nd payment',
        status: 'pending_deduction'
      }
    ];

    // Filter chargebacks that would hit this specific pay period
    const applicableChargebacks = mockChargebacks.filter(cb => {
      const cbPayPeriod = cb.payPeriodApplied;
      return cbPayPeriod >= weekRange.start && cbPayPeriod <= weekRange.end;
    });

    // For testing - only show chargebacks for certain scenarios
    if (payPeriod === 'lastweek' || agentId === 'AGENT002') {
      res.status(200).json(applicableChargebacks);
    } else {
      // This week has no chargebacks for AGENT001
      res.status(200).json([]);
    }

  } catch (error) {
    console.error('Chargebacks API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch chargebacks', 
      details: error.message 
    });
  }
}