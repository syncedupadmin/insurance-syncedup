// /api/health.ts
export default function health(_req: any, res: any) {
  res.status(200).json({
    ok:true,
    envs:{ SUPABASE_URL:!!process.env.SUPABASE_URL, SUPABASE_ANON_KEY:!!process.env.SUPABASE_ANON_KEY },
    time:new Date().toISOString()
  });
}