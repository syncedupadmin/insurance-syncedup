const { sales } = require('../data');

// Process cancellation emails
function processCancellationEmail(emailContent) {
  const patterns = {
    policyNumber: /Policy\s*(?:Number|#)?\s*:\s*([A-Z0-9\-]+)/i,
    memberName: /Member\s*Name\s*:\s*([A-Za-z\s]+?)(?:\n|Policy|$)/i,
    memberId: /Member\s*(?:ID)?\s*:\s*([A-Z0-9\-]+)/i,
    effectiveDate: /(?:Effective|Cancellation)\s*Date\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
  };

  const extracted = {};
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = emailContent.match(pattern);
    if (match) {
      extracted[key] = match[1].trim();
    }
  }

  return extracted;
}

// Find matching sale and process cancellation
function processCancellation(extractedData) {
  console.log('Processing cancellation with data:', extractedData);
  console.log('Available sales:', sales);
  
  let matchingSale = null;
  if (extractedData.memberName) {
    const searchName = extractedData.memberName.toLowerCase().trim();
    console.log('Searching for customer name:', searchName);
    
    matchingSale = sales.find(sale => {
      const saleName = sale.customerName.toLowerCase().trim();
      console.log('Comparing:', saleName, 'with', searchName);
      return saleName === searchName || saleName.includes(searchName) || searchName.includes(saleName);
    });
  }

  if (matchingSale) {
    console.log('Found matching sale:', matchingSale);
    
    matchingSale.status = 'cancelled';
    matchingSale.cancelledAt = new Date();
    
    const chargeback = {
      id: Date.now().toString(),
      saleId: matchingSale.id,
      agentId: matchingSale.agentId,
      amount: -(matchingSale.premium * 0.30),
      reason: 'Policy Cancellation',
      processedAt: new Date()
    };

    return {
      success: true,
      matchingSale,
      chargeback,
      message: `Cancellation processed for ${matchingSale.customerName}`
    };
  }

  console.log('No matching sale found');
  return {
    success: false,
    message: 'No matching sale found for cancellation'
  };
}

module.exports = {
  processCancellationEmail,
  processCancellation
};