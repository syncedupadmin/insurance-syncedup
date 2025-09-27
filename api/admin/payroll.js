const { createClient } = require('@supabase/supabase-js');
const { getUserContext } = require('../utils/auth-helper.js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agencyId, role } = getUserContext(req);
    
    // Only admins and managers can access payroll reports
    if (!['admin', 'manager'].includes(role)) {
      return res.status(403).json({ error: 'Admin or manager access required' });
    }

    const { 
      start_date, 
      end_date, 
      agent_id,
      export_format = 'json',
      pay_period = 'monthly'
    } = req.query;

    // Calculate date range if not provided
    let startDate, endDate;
    const today = new Date();
    
    if (start_date && end_date) {
      startDate = new Date(start_date);
      endDate = new Date(end_date);
    } else {
      // Default to current month
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    // Build query for commission data
    let salesQuery = supabase
      .from('portal_sales')
      .select(`
        *,
        agent:portal_users!inner(
          id,
          name,
          email,
          hire_date,
          commission_rate,
          license_number
        )
      `)
      .eq('agency_id', agencyId)
      .gte('sale_date', startDate.toISOString().split('T')[0])
      .lte('sale_date', endDate.toISOString().split('T')[0]);

    // Filter by specific agent if provided
    if (agent_id) {
      salesQuery = salesQuery.eq('agent_id', agent_id);
    }

    const { data: sales, error: salesError } = await salesQuery;

    if (salesError) {
      throw salesError;
    }

    // Group sales by agent and calculate commissions
    const agentCommissions = {};
    const agentDetails = {};

    sales.forEach(sale => {
      const agentId = sale.agent_id;
      
      if (!agentCommissions[agentId]) {
        agentCommissions[agentId] = {
          total_sales: 0,
          total_premium: 0,
          total_commission: 0,
          sale_count: 0,
          sales: []
        };
        agentDetails[agentId] = sale.agent;
      }

      const commission = sale.commission || (sale.premium * (sale.agent.commission_rate || 0.05));
      
      agentCommissions[agentId].total_sales += 1;
      agentCommissions[agentId].total_premium += sale.premium || 0;
      agentCommissions[agentId].total_commission += commission;
      agentCommissions[agentId].sale_count += 1;
      agentCommissions[agentId].sales.push({
        id: sale.id,
        sale_date: sale.sale_date,
        policy_number: sale.policy_number,
        customer_name: sale.customer_name,
        premium: sale.premium,
        commission: commission,
        product_type: sale.product_type
      });
    });

    // Format payroll report
    const payrollReport = Object.keys(agentCommissions).map(agentId => {
      const agent = agentDetails[agentId];
      const commissions = agentCommissions[agentId];
      
      return {
        agent: {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          license_number: agent.license_number,
          hire_date: agent.hire_date,
          commission_rate: agent.commission_rate
        },
        period: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          pay_period
        },
        performance: {
          total_sales: commissions.total_sales,
          total_premium: parseFloat(commissions.total_premium.toFixed(2)),
          total_commission: parseFloat(commissions.total_commission.toFixed(2)),
          average_sale: commissions.total_sales > 0 
            ? parseFloat((commissions.total_premium / commissions.total_sales).toFixed(2))
            : 0,
          commission_percentage: commissions.total_premium > 0 
            ? parseFloat(((commissions.total_commission / commissions.total_premium) * 100).toFixed(2))
            : 0
        },
        sales_detail: commissions.sales
      };
    });

    // Calculate summary totals
    const summary = {
      total_agents: payrollReport.length,
      total_sales: payrollReport.reduce((sum, agent) => sum + agent.performance.total_sales, 0),
      total_premium: parseFloat(payrollReport.reduce((sum, agent) => sum + agent.performance.total_premium, 0).toFixed(2)),
      total_commissions: parseFloat(payrollReport.reduce((sum, agent) => sum + agent.performance.total_commission, 0).toFixed(2)),
      period: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        pay_period
      },
      generated_at: new Date().toISOString()
    };

    // Handle different export formats
    if (export_format === 'csv') {
      // Generate CSV format
      let csvData = 'Agent Name,Email,License Number,Total Sales,Total Premium,Total Commission,Commission Rate\n';
      
      payrollReport.forEach(agent => {
        csvData += `"${agent.agent.name}","${agent.agent.email}","${agent.agent.license_number}",${agent.performance.total_sales},${agent.performance.total_premium},${agent.performance.total_commission},${agent.agent.commission_rate}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="payroll-report-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv"`);
      return res.send(csvData);
    }

    // Default JSON response
    return res.status(200).json({
      success: true,
      summary,
      agents: payrollReport,
      filters: {
        agency_id: agencyId,
        agent_id: agent_id || 'all',
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        pay_period
      }
    });

  } catch (error) {
    console.error('Payroll API error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate payroll report', 
      details: error.message 
    });
  }
}
module.exports = handler;
