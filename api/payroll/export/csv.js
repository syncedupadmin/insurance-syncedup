import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../_middleware/adminAuth.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function getWeekWindowEnding(endDateStr) {
  const end = endDateStr ? new Date(endDateStr + 'T23:59:59Z') : new Date();
  const d = new Date(end);
  const day = d.getUTCDay();
  const base = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const saturday = new Date(base); saturday.setUTCDate(base.getUTCDate() - ((day + 1) % 7) + 6);
  const sunday = new Date(saturday); sunday.setUTCDate(saturday.getUTCDate() - 6);
  const isoStart = new Date(Date.UTC(sunday.getUTCFullYear(), sunday.getUTCMonth(), sunday.getUTCDate(), 0, 0, 0)).toISOString();
  const isoEnd   = new Date(Date.UTC(saturday.getUTCFullYear(), saturday.getUTCMonth(), saturday.getUTCDate(), 23, 59, 59)).toISOString();
  return { startISO: isoStart, endISO: isoEnd };
}

async function payrollHandler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('error,{"error":"Method not allowed"}');

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(500).send('error,{"error":"Missing Supabase env vars"}');
    }

    const { endDate } = req.query;
    const window = getWeekWindowEnding(endDate);

    const { data, error } = await supabase
      .from('sales')
      .select('agent_id, premium, monthly_recurring, created_at')
      .gte('created_at', window.startISO)
      .lte('created_at', window.endISO);

    if (error) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(500).send('error,{"error":"Database error: ' + error.message.replace(/"/g,"'") + '"}');
    }

    const byAgent = new Map();
    for (const row of data || []) {
      const agentId = row.agent_id || 'UNKNOWN';
      const base = Number(row.monthly_recurring) || Number(row.premium) || 0;
      const commission = base * 0.30;
      if (!byAgent.has(agentId)) byAgent.set(agentId, { agentId, totalSales: 0, totalCommission: 0 });
      const agg = byAgent.get(agentId);
      agg.totalSales += 1;
      agg.totalCommission += commission;
    }

    const rows = Array.from(byAgent.values()).map(r => ({
      agentId: r.agentId,
      totalSales: r.totalSales,
      totalCommission: r.totalCommission.toFixed(2)
    }));

    const header = 'agentId,totalSales,totalCommission';
    const body = rows.map(r => `${r.agentId},${r.totalSales},${r.totalCommission}`).join('\n');
    const csv = header + '\n' + body + '\n';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="payroll.csv"');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(csv);
  } catch (err) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(500).send('error,{"error":"' + String(err?.message || err).replace(/"/g,"'") + '"}');
  }
}

// Wrap with admin protection
export default requireAdmin(payrollHandler);