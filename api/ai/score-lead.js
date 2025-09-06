import { requireAuth } from '../_middleware/authCheck.js';

async function leadScorerHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { leadData } = req.body;
  
  if (!leadData || !leadData.email) {
    return res.status(400).json({ error: 'Lead data with email required' });
  }

  try {
    // Get agent's conversion history
    const { data: history } = await req.supabase
      .from('portal_sales')
      .select('client_age, client_income, commission_amount, product_type, created_at')
      .eq('agent_id', req.user.id)
      .not('commission_amount', 'is', null)
      .limit(100);

    // Scoring algorithm
    let score = 50; // Base score
    const factors = [];

    // Income factor (validated)
    const income = parseInt(leadData.income) || 0;
    if (income > 100000) {
      score += 20;
      factors.push('High income bracket ($100k+)');
    } else if (income > 75000) {
      score += 15;
      factors.push('Upper-middle income ($75k+)');
    } else if (income > 50000) {
      score += 10;
      factors.push('Middle income ($50k+)');
    }

    // Age factor (insurance sweet spot is 30-55)
    const age = parseInt(leadData.age) || 30;
    if (age >= 30 && age <= 55) {
      score += 10;
      factors.push('Prime insurance age (30-55)');
    } else if (age >= 25 && age < 30) {
      score += 5;
      factors.push('Young adult demographic');
    }

    // Life events (major drivers of insurance purchases)
    if (leadData.life_event) {
      const eventScores = {
        'new_baby': 25,
        'marriage': 20,
        'new_job': 15,
        'home_purchase': 15,
        'divorce': 10
      };
      const eventScore = eventScores[leadData.life_event] || 5;
      score += eventScore;
      factors.push(`Life event: ${leadData.life_event.replace('_', ' ')}`);
    }

    // Contact completeness
    if (leadData.phone && leadData.email) {
      score += 10;
      factors.push('Complete contact information');
    }

    // Previous engagement indicators
    if (leadData.requested_quote) {
      score += 15;
      factors.push('Actively requested quote');
    }
    
    if (leadData.visited_pricing) {
      score += 8;
      factors.push('Visited pricing page');
    }

    // Timing factors
    if (leadData.urgent) {
      score += 12;
      factors.push('Expressed urgency');
    }

    // Calculate expected commission based on historical data
    let avgCommission = 1200; // Default baseline
    let bestCallTime = '2:00 PM - 4:00 PM'; // Default
    
    if (history && history.length > 0) {
      // Find similar successful deals
      const relevantDeals = history.filter(h => 
        h.client_age && h.client_income &&
        Math.abs(h.client_age - age) <= 10 &&
        Math.abs(h.client_income - income) <= 20000
      );
      
      if (relevantDeals.length > 0) {
        avgCommission = relevantDeals.reduce((sum, d) => 
          sum + (d.commission_amount || 0), 0) / relevantDeals.length;
        factors.push(`Based on ${relevantDeals.length} similar successful deals`);
      }

      // Analyze best call times from historical data
      const hourCounts = {};
      history.forEach(sale => {
        const hour = new Date(sale.created_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      
      const bestHour = Object.keys(hourCounts).reduce((a, b) => 
        hourCounts[a] > hourCounts[b] ? a : b
      );
      
      if (bestHour) {
        const startHour = parseInt(bestHour);
        const endHour = startHour + 1;
        bestCallTime = `${startHour}:00 - ${endHour}:00`;
      }
    }

    // Normalize score to 0-100 range
    score = Math.min(100, Math.max(0, score));
    const closeProbability = Math.min(95, score * 0.9); // Slightly more conservative

    // Generate talking points based on lead characteristics
    const talkingPoints = [];
    if (leadData.life_event === 'new_baby') {
      talkingPoints.push('Emphasize family protection and future planning');
      talkingPoints.push('Discuss life insurance and college savings options');
    }
    if (income > 75000) {
      talkingPoints.push('Focus on comprehensive coverage options');
      talkingPoints.push('Mention tax-advantaged insurance strategies');
    }
    if (age < 35) {
      talkingPoints.push('Highlight affordable rates for young adults');
      talkingPoints.push('Stress the importance of locking in low rates early');
    }

    // Store the lead score in database
    const scoreRecord = {
      agency_id: req.user.agency_id,
      agent_id: req.user.id,
      lead_email: leadData.email,
      lead_name: leadData.name,
      score,
      close_probability: closeProbability,
      expected_commission: avgCommission,
      best_call_time: bestCallTime,
      scoring_factors: { factors, leadData, talkingPoints }
    };

    await req.supabase.from('lead_scores').insert(scoreRecord);

    // Return comprehensive scoring results
    return res.json({
      score,
      grade: score > 80 ? 'A' : score > 65 ? 'B' : score > 50 ? 'C' : 'D',
      probability: `${closeProbability.toFixed(0)}%`,
      expectedCommission: `$${Math.round(avgCommission).toLocaleString()}`,
      bestCallTime,
      factors,
      talkingPoints,
      priority: score > 75 ? 'HIGH' : score > 50 ? 'MEDIUM' : 'LOW',
      recommendation: 
        score > 80 ? 'IMMEDIATE ACTION - Call within 1 hour' :
        score > 65 ? 'HOT LEAD - Contact within 4 hours' :
        score > 50 ? 'WARM LEAD - Follow up within 24 hours' :
        'NURTURE - Add to email campaign',
      estimatedCloseTime: score > 75 ? '1-2 calls' : score > 50 ? '3-5 calls' : '5+ touchpoints'
    });
  } catch (error) {
    console.error('Lead scoring error:', error);
    return res.status(500).json({ 
      error: 'Failed to score lead', 
      details: error.message 
    });
  }
}

export default requireAuth()(leadScorerHandler);