// api/auth/login.js
// Production login: Supabase only. No fallbacks. No fairy dust.

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

// Required env vars in Vercel project settings
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // needs RLS bypass for password_hash read
const AUTH_SECRET = process.env.AUTH_SECRET; // for JWT signing

function failIfMissingEnv() {
  const missing = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!AUTH_SECRET) missing.push('AUTH_SECRET');
  if (missing.length) {
    const msg = `Missing required env: ${missing.join(', ')}`;
    const err = new Error(msg);
    err.statusCode = 500;
    throw err;
  }
}

function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function signJWT(payload, secret, expSeconds = 8 * 60 * 60) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, exp: now + expSeconds, ...payload };
  const h = base64url(JSON.stringify(header));
  const b = base64url(JSON.stringify(body));
  const data = `${h}.${b}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest();
  return `${data}.${base64url(sig)}`;
}

function ok(res, json) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).end(JSON.stringify(json));
}
function bad(res, code, msg) {
  res.setHeader('Content-Type', 'application/json');
  res.status(code).end(JSON.stringify({ error: msg }));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return bad(res, 405, 'Method Not Allowed');

  try {
    failIfMissingEnv();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const email = String(body.email || '').toLowerCase().trim();
    const password = String(body.password || '').trim();
    if (!email || !password) return bad(res, 400, 'Email and password are required');

    // Fetch exact user from portal_users; email_norm or email
    // We select password_hash for server-side bcrypt check. Requires service role or a secure RPC.
    const { data: users, error } = await supabase
      .from('portal_users')
      .select('id, email, email_norm, full_name, name, role, agency_id, is_active, password_hash')
      .or(`email.eq.${email},email_norm.eq.${email}`)
      .limit(1);

    if (error) {
      console.error('Database error during login:', error);
      return bad(res, 500, 'Database error');
    }
    
    const userRow = users?.[0];
    if (!userRow) {
      console.log(`Login attempt failed - no user found for email: ${email}`);
      res.setHeader('Content-Type', 'application/json');
      return res.status(401).end(JSON.stringify({ error: 'invalid_credentials', reason: 'no_user' }));
    }
    
    if (userRow.is_active === false) {
      console.log(`Login attempt failed - inactive user: ${email}`);
      res.setHeader('Content-Type', 'application/json');
      return res.status(401).end(JSON.stringify({ error: 'invalid_credentials', reason: 'inactive_user' }));
    }

    const hash = userRow.password_hash;
    if (!hash || hash.length < 20) {
      console.log(`Login attempt failed - no valid password hash for user: ${email}`);
      res.setHeader('Content-Type', 'application/json');
      return res.status(401).end(JSON.stringify({ error: 'invalid_credentials', reason: 'no_user' }));
    }

    const okPass = await bcrypt.compare(password, hash);
    if (!okPass) {
      console.log(`Login attempt failed - wrong password for user: ${email}`);
      res.setHeader('Content-Type', 'application/json');
      return res.status(401).end(JSON.stringify({ error: 'invalid_credentials', reason: 'wrong_password' }));
    }

    // Normalize role to underscore style expected by front end
    const role = String(userRow.role || '').toLowerCase().replace(/[\s-]+/g, '_');
    const allowed = new Set(['super_admin','admin','manager','agent','customer_service']);
    if (!allowed.has(role)) {
      console.log(`Login attempt failed - invalid role: ${role} for user: ${email}`);
      return bad(res, 403, 'Invalid role');
    }
    
    const displayName = userRow.full_name || userRow.name || userRow.email;

    const user = {
      id: userRow.id,
      email: userRow.email,
      name: displayName,
      role,
      agency_id: userRow.agency_id,
      is_active: true,
      must_change_password: false // set real flag if you have it
    };

    const token = signJWT(
      { sub: user.id, role: user.role, agency_id: user.agency_id },
      AUTH_SECRET,
      8 * 60 * 60
    );

    return ok(res, { token, user });
  } catch (err) {
    const code = err?.statusCode || 500;
    return bad(res, code, err?.message || 'Unexpected error');
  }
}