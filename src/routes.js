const express = require('express');
const router = express.Router();
const { products, sales, agents, chargebacks } = require('./data');

// Get products by state
router.get('/products/:state', (req, res) => {
  const state = req.params.state;
  const availableProducts = products.filter(p => 
    p.states.includes(state.toUpperCase())
  );
  res.json(availableProducts);
});

// Add a sale
router.post('/sales', (req, res) => {
  const sale = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date()
  };
  sales.push(sale);
  res.json(sale);
});

// Get agent commissions
router.get('/commissions/:agentId', (req, res) => {
  const agentSales = sales.filter(s => s.agentId === req.params.agentId);
  const commissions = agentSales.map(sale => ({
    saleId: sale.id,
    amount: (sale.premium * 0.30).toFixed(2),
    status: 'pending'
  }));
  res.json(commissions);
});

// Get agent dashboard
router.get('/dashboard/:agentId/:timeframe', (req, res) => {
  const { agentId, timeframe } = req.params;
  const agentSales = sales.filter(s => s.agentId === agentId);
  
  const totalSales = agentSales.length;
  const totalPremium = agentSales.reduce((sum, sale) => sum + sale.premium, 0);
  const totalCommission = totalPremium * 0.30;
  const averageSale = totalSales > 0 ? totalPremium / totalSales : 0;
  
  res.json({
    totalSales,
    totalPremium: totalPremium.toFixed(2),
    totalCommission: totalCommission.toFixed(2),
    averageSale: averageSale.toFixed(2)
  });
});

// Process cancellation email
router.post('/cancellation', (req, res) => {
  const { emailContent } = req.body;
  
  if (!emailContent) {
    return res.status(400).json({ error: 'Email content required' });
  }

  const emailProcessor = require('./services/emailProcessor');
  const extractedData = emailProcessor.processCancellationEmail(emailContent);
  const result = emailProcessor.processCancellation(extractedData);
  
  if (result.success) {
    chargebacks.push(result.chargeback);
  }
  
  res.json(result);
});

// Get chargebacks for agent
router.get('/chargebacks/:agentId', (req, res) => {
  const agentChargebacks = chargebacks.filter(cb => cb.agentId === req.params.agentId);
  res.json(agentChargebacks);
});

// Generate payroll export
router.get('/payroll/export/:format', (req, res) => {
  const { format } = req.params;
  const { startDate, endDate } = req.query;
  
  // Calculate date range (default to current week)
  const start = startDate ? new Date(startDate) : getStartOfWeek();
  const end = endDate ? new Date(endDate) : getEndOfWeek();
  
  // Get all sales in date range
  const weekSales = sales.filter(sale => {
    const saleDate = new Date(sale.createdAt);
    return saleDate >= start && saleDate <= end;
  });
  
  // Calculate commissions by agent
  const payrollData = calculatePayroll(weekSales);
  
  if (format === 'csv') {
    const csv = generateCSV(payrollData);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=payroll.csv');
    res.send(csv);
  } else {
    res.json(payrollData);
  }
});

// Debug route to see all sales
router.get('/debug/sales', (req, res) => {
  res.json({
    totalSales: sales.length,
    sales: sales
  });
});

// Helper functions
function getStartOfWeek() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getEndOfWeek() {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay() + 7);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

function calculatePayroll(salesData) {
  const agentPayroll = {};
  
  salesData.forEach(sale => {
    if (!agentPayroll[sale.agentId]) {
      agentPayroll[sale.agentId] = {
        agentId: sale.agentId,
        totalSales: 0,
        totalPremium: 0,
        totalCommission: 0,
        sales: []
      };
    }
    
    const commission = sale.premium * 0.30;
    agentPayroll[sale.agentId].totalSales++;
    agentPayroll[sale.agentId].totalPremium += sale.premium;
    agentPayroll[sale.agentId].totalCommission += commission;
    agentPayroll[sale.agentId].sales.push({
      id: sale.id,
      customerName: sale.customerName,
      premium: sale.premium,
      commission: commission,
      date: sale.createdAt
    });
  });
  
  return Object.values(agentPayroll);
}

function generateCSV(payrollData) {
  const headers = 'Agent ID,Total Sales,Total Premium,Total Commission\n';
  const rows = payrollData.map(agent => 
    `${agent.agentId},${agent.totalSales},${agent.totalPremium.toFixed(2)},${agent.totalCommission.toFixed(2)}`
  ).join('\n');
  
  return headers + rows;
}

module.exports = router;