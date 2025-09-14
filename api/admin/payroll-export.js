// DISABLED: // DISABLED: import { requireAuth } from '../_middleware/authCheck.js';
import { createClient } from '@supabase/supabase-js';

async function payrollExportHandler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = req.supabase || createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { format = 'json', endDate } = req.query;

    // Calculate week window ending on specified date (or current week)
    function getWeekWindowEnding(endDateStr) {
      const end = endDateStr ? new Date(endDateStr + 'T23:59:59Z') : new Date();
      const d = new Date(end);
      const day = d.getUTCDay(); // 0..6
      const base = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const saturday = new Date(base);
      saturday.setUTCDate(base.getUTCDate() - ((day + 1) % 7) + 6);
      const sunday = new Date(saturday);
      sunday.setUTCDate(saturday.getUTCDate() - 6);

      const isoStart = new Date(Date.UTC(sunday.getUTCFullYear(), sunday.getUTCMonth(), sunday.getUTCDate(), 0, 0, 0)).toISOString();
      const isoEnd = new Date(Date.UTC(saturday.getUTCFullYear(), saturday.getUTCMonth(), saturday.getUTCDate(), 23, 59, 59)).toISOString();

      return { startISO: isoStart, endISO: isoEnd };
    }

    const window = getWeekWindowEnding(endDate);

    // Get sales data for the specified period
    let query = supabase
      .from('portal_sales')
      .select('agent_id, premium, monthly_recurring, created_at')
      .gte('created_at', window.startISO)
      .lte('created_at', window.endISO);

    // Filter by agency for non-super admins
    if (req.user.role !== 'super_admin') {
      query = query.eq('agency_id', req.user.agency_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Group by agent and calculate commissions
    const byAgent = new Map();
    for (const row of data || []) {
      const agentId = row.agent_id || 'UNKNOWN';
      const base = Number(row.monthly_recurring) || Number(row.premium) || 0;
      const commission = base * 0.30; // 30% commission rate
      
      if (!byAgent.has(agentId)) {
        byAgent.set(agentId, { agentId, totalSales: 0, totalCommission: 0 });
      }
      
      const agg = byAgent.get(agentId);
      agg.totalSales += 1;
      agg.totalCommission += commission;
    }

    const result = Array.from(byAgent.values()).map(r => ({
      agentId: r.agentId,
      totalSales: r.totalSales,
      totalCommission: Number(r.totalCommission.toFixed(2))
    }));

    if (format === 'csv') {
      const header = 'agentId,totalSales,totalCommission';
      const body = result.map(r => `${r.agentId},${r.totalSales},${r.totalCommission}`).join('\n');
      const csv = header + '\n' + body + '\n';

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="payroll.csv"');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(csv);
    } else {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(result);
    }
  } catch (error) {
    console.error('Payroll export error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// DISABLED: export default requireAuth.*Handler);
export default payrollExportHandler;
