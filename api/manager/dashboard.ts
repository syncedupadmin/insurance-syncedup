// /api/manager/dashboard.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

type KPIs = { activeAgents:number; mtdPremium:number; policies:number; avgSale:number };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ ok:false, reason:'method-not-allowed' });

    const timeframe = (req.query.timeframe as string) || 'month';
    const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i,'').trim();
    const cookieToken = readCookie(req.headers.cookie || 'session=').session || '';
    const authed = Boolean(bearer || cookieToken);

    const url = process.env.SUPABASE_URL || '';
    const key = process.env.SUPABASE_ANON_KEY || '';
    if (!url || !key) {
      console.warn('[dashboard] env-missing');
      return res.status(200).json(payload(false, 'env-missing', timeframe, authed, empty()));
    }

    // TODO: plug in real DB query; keep try/catch and return zeros on error.
    const kpis = await getKPIs(timeframe).catch((e)=>{ console.error('[dashboard] db', e); return empty(); });

    return res.status(200).json(payload(true, undefined, timeframe, authed, kpis));
  } catch (e:any) {
    console.error('[dashboard] exception', e?.stack || e);
    return res.status(200).json(payload(false, 'exception', (req.query.timeframe as string)||'month', false, empty()));
  }
}

function payload(ok:boolean, reason:string|undefined, timeframe:string, authed:boolean, kpis:KPIs){
  return { ok, reason, timeframe, authed, kpis, team_performance:{ top_performers:[] }, recent_activity:[] };
}
function empty():KPIs { return { activeAgents:0, mtdPremium:0, policies:0, avgSale:0 }; }
async function getKPIs(_tf:string):Promise<KPIs>{ return empty(); }
function readCookie(raw:string){ return raw.split(';').reduce((a,p)=>{const i=p.indexOf('='); if(i>0)a[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim()); return a;},{} as any); }