import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Return test sales data
      return res.status(200).json({
        sales: [],
        totals: {
          totalSales: 0,
          totalPremium: 0,
          totalCommissions: 0
        },
        message: 'No sales data available'
      });
    }
    
    if (req.method === 'POST') {
      // Handle sale creation
      const body = req.body;
      console.log('Creating sale with body:', body);

      // Legacy format support
      if (body.customerName && body.productId && body.premium) {
        const products = await getProducts();
      const productData = products.find(p => p.id === body.productId);
        
        if (!productData) {
          return res.status(404).json({ error: 'Product not found' });
        }

        const commissionAmount = calculateCommission(parseFloat(body.premium), productData);
        const saleId = generateSaleId();

        const sale = {
          id: saleId,
          customer_name: body.customerName,
          customer_email: body.customerEmail || null,
          customer_phone: body.customerPhone || null,
          product_id: body.productId,
          product_name: productData.name,
          carrier: productData.carrier,
          premium: parseFloat(body.premium),
          sale_date: new Date().toISOString().split('T')[0],
          status: 'active',
          created_at: new Date().toISOString()
        };

        const commission = {
          id: generateCommissionId(),
          sale_id: saleId,
          commission_amount: commissionAmount,
          commission_rate: productData.commission_rate,
          status: 'pending',
          created_at: new Date().toISOString()
        };

        return res.status(201).json({
          sale,
          commission,
          calculatedCommission: commissionAmount,
          message: 'Sale created successfully with commission calculation',
          testMode: true
        });
      }

      // New format
      const { productId, customerInfo, saleDetails, quoteNumber } = body;

      if (!productId || !customerInfo || !saleDetails) {
        return res.status(400).json({ 
          error: 'Missing required fields: productId, customerInfo, saleDetails' 
        });
      }

      const products = await getProducts();
      const productData = products.find(p => p.id === productId);
      if (!productData) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const commissionAmount = calculateCommission(parseFloat(saleDetails.premium), productData);
      const saleId = generateSaleId();

      const sale = {
        id: saleId,
        product_id: productId,
        quote_id: quoteNumber || null,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone || null,
        product_name: productData.name,
        carrier: productData.carrier,
        premium: parseFloat(saleDetails.premium),
        sale_date: saleDetails.saleDate || new Date().toISOString().split('T')[0],
        status: 'active',
        created_at: new Date().toISOString()
      };

      const commission = {
        id: generateCommissionId(),
        sale_id: saleId,
        commission_amount: commissionAmount,
        commission_rate: productData.commission_rate,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      return res.status(201).json({
        sale,
        commission,
        calculatedCommission: commissionAmount,
        message: 'Sale created successfully with automatic commission calculation',
        testMode: true
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Sales API error:', error);
    res.status(500).json({ 
      error: 'Failed to process request', 
      details: error.message 
    });
  }
}

function calculateCommission(premium, product) {
  return Math.round(premium * (product.commission_rate / 100) * 100) / 100;
}

function generateSaleId() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SAL-${timestamp.slice(-8)}-${random}`;
}

function generateCommissionId() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `COM-${timestamp.slice(-8)}-${random}`;
}

async function getProducts() {
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }
  
  return products || [];
}