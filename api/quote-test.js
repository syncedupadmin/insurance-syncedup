import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse request body
    let body = req.body;
    if (typeof body === 'string') {
      try { 
        body = JSON.parse(body); 
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON in request body' });
      }
    }

    const {
      productIds,
      customerInfo,
      coverageOptions
    } = body;

    // Validate required fields
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'Product IDs are required' });
    }

    if (!customerInfo || !customerInfo.age || !customerInfo.state) {
      return res.status(400).json({ error: 'Customer age and state are required' });
    }

    // Get products from database or demo data
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds);

    let selectedProducts = products;

    // If no products in database, return error
    if (!products || products.length === 0) {
      return res.status(404).json({ error: 'No products available in system' });
    }

    if (!selectedProducts || selectedProducts.length === 0) {
      return res.status(404).json({ error: 'No products found for the given IDs' });
    }

    // Calculate quotes for each product
    const quotes = selectedProducts.map(product => {
      const baseQuote = calculateProductQuote(product, customerInfo, coverageOptions);
      
      return {
        productId: product.id,
        productName: product.name,
        carrier: product.carrier,
        monthlyPremium: baseQuote.monthlyPremium,
        annualPremium: baseQuote.annualPremium,
        commissionAmount: baseQuote.commissionAmount,
        commissionRate: product.commission_rate,
        deductible: product.deductible,
        maxOutOfPocket: product.max_out_of_pocket,
        copayPrimary: product.copay_primary,
        copaySpecialist: product.copay_specialist,
        benefits: baseQuote.benefits,
        limitations: baseQuote.limitations,
        effectiveDate: getNextMonthFirst(),
        expirationDate: getQuoteExpirationDate(),
        quoteNumber: generateQuoteNumber(),
        discounts: baseQuote.discounts || []
      };
    });

    // Return the quotes
    res.status(200).json({
      quoteNumber: generateQuoteNumber(),
      quotes,
      customerInfo,
      expirationDate: getQuoteExpirationDate(),
      totalEstimatedCommission: quotes.reduce((sum, q) => sum + q.commissionAmount, 0),
      testMode: true
    });

  } catch (error) {
    console.error('Quote API error:', error);
    res.status(500).json({ 
      error: 'Failed to generate quote', 
      details: error.message 
    });
  }
}

// Calculate quote based on product and customer info
function calculateProductQuote(product, customerInfo, coverageOptions = {}) {
  let basePremium = product.premium || 149.99;
  let discounts = [];
  
  // Age-based adjustments
  const age = parseInt(customerInfo.age);
  let ageMultiplier = 1.0;
  
  if (age < 25) {
    ageMultiplier = 1.2; // Higher for young adults
  } else if (age >= 25 && age < 35) {
    ageMultiplier = 0.95; // Slight discount for 25-35
  } else if (age >= 35 && age < 45) {
    ageMultiplier = 1.0; // Base rate
  } else if (age >= 45 && age < 55) {
    ageMultiplier = 1.1; // Slight increase
  } else if (age >= 55) {
    ageMultiplier = 1.3; // Higher for 55+
  }

  // State-based adjustments
  const stateMultipliers = {
    'CA': 1.2,
    'NY': 1.15,
    'TX': 0.95,
    'FL': 1.0,
    'IL': 1.05
  };
  
  const stateMultiplier = stateMultipliers[customerInfo.state] || 1.0;
  
  // Apply multipliers
  const adjustedPremium = basePremium * ageMultiplier * stateMultiplier;
  
  // Apply discounts
  if (customerInfo.nonsmoker) {
    const discount = adjustedPremium * 0.1;
    discounts.push({
      type: 'Non-smoker discount',
      amount: discount
    });
  }
  
  if (coverageOptions.bundleDiscount) {
    const discount = adjustedPremium * 0.05;
    discounts.push({
      type: 'Multi-product bundle',
      amount: discount
    });
  }

  const totalDiscounts = discounts.reduce((sum, d) => sum + d.amount, 0);
  const finalMonthlyPremium = Math.max(adjustedPremium - totalDiscounts, basePremium * 0.7);
  const annualPremium = finalMonthlyPremium * 12;
  const commissionAmount = annualPremium * ((product.commission_rate || 30) / 100);

  return {
    monthlyPremium: Math.round(finalMonthlyPremium * 100) / 100,
    annualPremium: Math.round(annualPremium * 100) / 100,
    commissionAmount: Math.round(commissionAmount * 100) / 100,
    discounts,
    benefits: generateBenefitsList(product),
    limitations: generateLimitationsList(product)
  };
}

function generateBenefitsList(product) {
  const benefits = [];
  
  if (product.prescription_coverage) {
    benefits.push('Prescription drug coverage included');
  }
  
  if (product.dental_included) {
    benefits.push('Dental coverage included');
  }
  
  if (product.vision_included) {
    benefits.push('Vision coverage included');
  }
  
  if ((product.deductible || 1000) <= 1000) {
    benefits.push('Low deductible plan');
  }
  
  if (product.product_type === 'health' && (product.copay_primary || 25) <= 25) {
    benefits.push('Affordable primary care visits');
  }
  
  return benefits;
}

function generateLimitationsList(product) {
  const limitations = [];
  
  if (product.product_type === 'health' || product.name?.includes('HMO')) {
    limitations.push('Network restrictions may apply');
    limitations.push('Pre-authorization required for specialist visits');
  }
  
  if ((product.deductible || 0) > 2000) {
    limitations.push('High deductible must be met before coverage begins');
  }
  
  if (!product.dental_included) {
    limitations.push('Dental coverage not included');
  }
  
  if (!product.vision_included) {
    limitations.push('Vision coverage not included');
  }
  
  return limitations;
}

function generateQuoteNumber() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `QT-${timestamp.slice(-8)}-${random}`;
}

function getNextMonthFirst() {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return nextMonth.toISOString().split('T')[0];
}

function getQuoteExpirationDate() {
  const today = new Date();
  const expiration = new Date(today.setDate(today.getDate() + 30)); // 30 days from now
  return expiration.toISOString();
}

// Products should come from database only