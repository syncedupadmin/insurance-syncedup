const { createClient } = require('@supabase/supabase-js')
const jwt = require('jsonwebtoken')

const PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY   = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const LEGACY_SECRET = process.env.JWT_SECRET

if (!PUBLIC_URL || !ANON_KEY) { throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY') }
if (!SERVICE_KEY) { console.warn('WARNING: SUPABASE_SERVICE_ROLE_KEY not set. Admin ops disabled.') }

const supabase = createClient(PUBLIC_URL, ANON_KEY)
const supabaseAdmin = SERVICE_KEY ? createClient(PUBLIC_URL, SERVICE_KEY, { auth:{ autoRefreshToken:false, persistSession:false } }) : null

function extractToken(req, cookieNames){
  if (!req) return null
  const hdr = req.headers?.authorization || req.headers?.Authorization
  if (hdr && /^Bearer\s+/i.test(hdr)) return hdr.replace(/^Bearer\s+/i,'')
  const cookies = req.cookies || {}
  for (const name of cookieNames||[]) if (cookies[name]) return cookies[name]
  return null
}
function mapSupabaseUser(u){
  return { id:u.id, sub:u.id, userId:u.id, email:u.email,
    role:u.user_metadata?.role ?? u.app_metadata?.role ?? 'agent',
    agency_id:u.user_metadata?.agency_id ?? u.app_metadata?.agency_id,
    agencyId:u.user_metadata?.agency_id ?? u.app_metadata?.agency_id }
}
async function verifyToken(tokenOrReq, cookieNames){
  const token = typeof tokenOrReq === 'string' ? tokenOrReq : extractToken(tokenOrReq, cookieNames)
  if (!token) return null
  try { const {data,error}=await supabase.auth.getUser(token); if (data?.user && !error) return mapSupabaseUser(data.user) } catch(_){}
  if (LEGACY_SECRET){ try{ const p=jwt.verify(token,LEGACY_SECRET); return { id:p.id??p.userId??p.user_id??p.sub, sub:p.user_id??p.sub??p.id, userId:p.id??p.userId??p.user_id??p.sub, email:p.email, role:p.role, agency_id:p.agency_id, agencyId:p.agency_id } } catch(_){} }
  return null
}
async function login(email,password){
  const {data,error}=await supabase.auth.signInWithPassword({email,password})
  if (error) throw new Error(error.message)
  return { token:data.session.access_token, user: mapSupabaseUser(data.user) }
}
async function upsertUser({email,password,role,agency_id}){
  if(!supabaseAdmin) throw new Error('No SUPABASE_SERVICE_ROLE_KEY configured')
  const list=await supabaseAdmin.auth.admin.listUsers({page:1,perPage:1,email})
  let user=list.data?.users?.[0]
  if(!user){ const r=await supabaseAdmin.auth.admin.createUser({email,password:password||undefined,email_confirm:true,app_metadata:{role,agency_id},user_metadata:{role,agency_id}}); if(r.error) throw r.error; user=r.data.user }
  else { const r=await supabaseAdmin.auth.admin.updateUserById(user.id,{password:password||undefined,app_metadata:{...(user.app_metadata||{}),role,agency_id},user_metadata:{...(user.user_metadata||{}),role,agency_id}}); if(r.error) throw r.error; user=r.data.user }
  return user
}
module.exports={ supabase, supabaseAdmin, verifyToken, login, upsertUser }
