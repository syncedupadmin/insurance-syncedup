import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../_middleware/adminAuth.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Sunday..Saturday window ending on endDate (YYYY-MM-DD). If missing, use current week.
function getWeekWindowEnding(endDateStr) {
  const end = endDateStr ? new Date(endDateStr + 'T23:59:59Z') : new Date();
  const d = new Date(end);
  const day = d.getUTCDay(); // 0..6
  const base = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const saturday = new Date(base); saturday.setUTCDate(base.getUTCDate() - ((day + 1) % 7) + 6);
  const sunday = new Date(saturday); sunday.setUTCDate(saturday.getUTCDate() - 6);

  const isoStart = new Date(Date.UTC(sunday.getUTCFullYear(), sunday.getUTCMonth(), sunday.getUTCDate(), 0, 0, 0)).toISOString();
  const isoEnd   = new Date(Date.UTC(saturday.getUTCFullYear(), saturday.getUTCMonth(), saturday.getUTCDate(), 23, 59, 59)).toISOString();

  return { startISO: isoStart, endISO: isoEnd, startDate: isoStart.slice(0,10), endDate: isoEnd.slice(0,10) };
}

async function payrollHandler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY)' });
    }

    const { endDate } = req.query;
    const window = getWeekWindowEnding(endDate);

    const { data, error } = await supabase
      .from('sales')
      .select('agent_id, premium, monthly_recurring, created_at')
      .gte('created_at', window.startISO)
      .lte('created_at', window.endISO);

    if (error) return res.status(500).json({ error: 'Database error: ' + error.message });

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

    const result = Array.from(byAgent.values()).map(r => ({
      agentId: r.agentId,
      totalSales: r.totalSales,
      totalCommission: Number(r.totalCommission.toFixed(2))
    }));

    res.setHeader('X-Payroll-Period', `${window.startDate}..${window.endDate}`);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
}

// Wrap with admin protection
export default requireAdmin(payrollHandler);