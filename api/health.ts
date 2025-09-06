// /api/health.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
export default function health(_req:VercelRequest,res:VercelResponse){
  res.status(200).json({
    ok:true,
    envs:{ SUPABASE_URL:!!process.env.SUPABASE_URL, SUPABASE_ANON_KEY:!!process.env.SUPABASE_ANON_KEY },
    time:new Date().toISOString()
  });
}