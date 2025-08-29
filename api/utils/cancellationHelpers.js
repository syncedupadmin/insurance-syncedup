// Email parsing and cancellation processing helpers

export function parseEmailContent(emailContent) {
  const email = emailContent.toLowerCase();
  
  // Extract customer name
  let customerName = 'Unknown Customer';
  const namePatterns = [
    /(?:customer|name|client|insured)[:\s]+([a-zA-Z\s]+)/i,
    /dear\s+([a-zA-Z\s]+)/i,
    /(?:mr|mrs|ms|dr)[.\s]+([a-zA-Z\s]+)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = emailContent.match(pattern);
    if (match && match[1]) {
      customerName = match[1].trim();
      break;
    }
  }
  
  // Extract policy number
  let policyNumber = 'Unknown Policy';
  const policyPatterns = [
    /(?:policy|pol|policy\s+number|policy\s+#)[:\s#]*([a-zA-Z0-9-]+)/i,
    /(?:member|membership)\s+(?:id|number)[:\s#]*([a-zA-Z0-9-]+)/i
  ];
  
  for (const pattern of policyPatterns) {
    const match = emailContent.match(pattern);
    if (match && match[1]) {
      policyNumber = match[1].trim();
      break;
    }
  }
  
  // Extract dates
  const datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g,
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/gi,
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2},?\s+\d{4}/gi
  ];
  
  let dates = [];
  for (const pattern of datePatterns) {
    const matches = emailContent.match(pattern);
    if (matches) {
      dates.push(...matches);
    }
  }
  
  // Clean and parse dates
  const parsedDates = dates.map(dateStr => {
    try {
      return new Date(dateStr);
    } catch {
      return null;
    }
  }).filter(date => date && !isNaN(date.getTime()));
  
  // Sort dates to identify effective and cancellation dates
  parsedDates.sort((a, b) => a - b);
  
  const effectiveDate = parsedDates[0] || new Date('2025-01-01');
  const cancellationDate = parsedDates[parsedDates.length - 1] || new Date();
  
  // Extract premium amounts
  let originalPremium = 0;
  const premiumPatterns = [
    /(?:premium|amount|monthly|cost|price)[:\s]*\$?(\d+\.?\d*)/i,
    /\$(\d+\.?\d*)/g
  ];
  
  for (const pattern of premiumPatterns) {
    const match = emailContent.match(pattern);
    if (match && match[1]) {
      originalPremium = parseFloat(match[1]);
      if (originalPremium > 50 && originalPremium < 1000) { // Reasonable premium range
        break;
      }
    }
  }
  
  // If no premium found, use a default based on our product data
  if (originalPremium === 0) {
    originalPremium = 383.38; // Default from our product data
  }
  
  return {
    customerName,
    policyNumber,
    effectiveDate: effectiveDate.toISOString().split('T')[0],
    cancellationDate: cancellationDate.toISOString().split('T')[0],
    originalPremium,
    originalCommission: originalPremium * 0.30 // 30% commission rate
  };
}

export function getWeekDateRange(timeframe) {
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

export function calculateCancellationImpact(parsedData) {
  // Calculate days in force
  const effectiveDate = new Date(parsedData.effectiveDate);
  const cancellationDate = new Date(parsedData.cancellationDate);
  const daysInForce = Math.floor((cancellationDate - effectiveDate) / (1000 * 60 * 60 * 24));

  // Determine if this is a chargeback or cancellation based on agent payment status
  const wasAgentPaidOut = daysInForce > 45; // Simulate: agents typically get paid after ~45 days
  
  let chargebackAmount = 0;
  let isChargeback = false;
  let processingType = '';
  let reason = '';

  if (wasAgentPaidOut) {
    // This is a CHARGEBACK - agent was already paid, now member cancelled without 2nd payment
    isChargeback = true;
    chargebackAmount = parsedData.originalCommission; // Full commission gets charged back
    processingType = 'CHARGEBACK';
    reason = `Member cancelled after agent was paid out (${daysInForce} days in force). Full commission will be deducted from next check.`;
  } else {
    // This is a CANCELLATION - agent never got paid, so no money to charge back
    isChargeback = false;
    chargebackAmount = 0;
    processingType = 'CANCELLATION';
    reason = `Member cancelled before agent payout (${daysInForce} days in force). Agent never received commission for this sale.`;
  }

  return {
    daysInForce,
    wasAgentPaidOut,
    isChargeback,
    chargebackAmount,
    processingType,
    reason
  };
}

export function getMockCancellations(agentId, timeframe) {
  const weekRange = getWeekDateRange(timeframe || 'thisweek');
  
  // Mock cancellations that occurred this week (no financial impact to agent)
  const mockCancellations = [
    {
      id: 'CAN001',
      saleId: 'SALE005',
      agentId: agentId,
      customerName: 'Mike Johnson',
      cancellationDate: '2025-08-26',
      effectiveDate: '2025-08-20',
      daysInForce: 6,
      reason: 'Customer cancelled before agent payout period',
      originalPremium: 275.50,
      potentialCommission: 82.65, // What would have been earned
      financialImpact: 0, // No impact since agent never got paid
      status: 'cancelled_before_payout'
    },
    {
      id: 'CAN002', 
      saleId: 'SALE006',
      agentId: agentId,
      customerName: 'Sarah Davis',
      cancellationDate: '2025-08-27',
      effectiveDate: '2025-08-25',
      daysInForce: 2,
      reason: 'Customer cancelled during grace period',
      originalPremium: 189.99,
      potentialCommission: 56.99,
      financialImpact: 0,
      status: 'cancelled_before_payout'
    }
  ];

  // Filter cancellations that occurred during the specified timeframe
  const applicableCancellations = mockCancellations.filter(cancellation => {
    const cancelDate = cancellation.cancellationDate;
    return cancelDate >= weekRange.start && cancelDate <= weekRange.end;
  });

  // For testing - show cancellations based on timeframe
  if (timeframe === 'thisweek') {
    return applicableCancellations;
  } else {
    // Last week had different cancellations
    return [
      {
        id: 'CAN003',
        saleId: 'SALE007',
        agentId: agentId,
        customerName: 'Robert Wilson',
        cancellationDate: '2025-08-21',
        effectiveDate: '2025-08-15',
        daysInForce: 6,
        reason: 'Policy cancelled before first commission payout',
        originalPremium: 421.00,
        potentialCommission: 126.30,
        financialImpact: 0,
        status: 'cancelled_before_payout'
      }
    ];
  }
}
