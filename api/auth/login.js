// api/auth/login.js
// Production login: Supabase only. No fallbacks. No fairy dust.

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { setCORSHeaders, handleCORSPreflight } from '../_utils/cors.js';

// Required env vars in Vercel project settings
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_KEY; // needs RLS bypass for password_hash read
const AUTH_SECRET = process.env.JWT_SECRET; // for JWT signing - REQUIRED, NO FALLBACK

// Normalize role helper
const normalizeRole = (r) => String(r || '')
  .toLowerCase()
  .replace(/[\s-]+/g, '_');

function failIfMissingEnv() {
  const missing = [];
  if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_KEY');
  if (!AUTH_SECRET) missing.push('JWT_SECRET');
  if (missing.length) {
    const msg = `PRODUCTION ERROR: Missing critical environment variables: ${missing.join(', ')}. System cannot operate securely.`;
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
  // Handle CORS preflight
  if (handleCORSPreflight(req, res)) return;
  
  // Set secure CORS headers
  setCORSHeaders(req, res);
  
  if (req.method !== 'POST') return bad(res, 405, 'Method Not Allowed');

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const email = String(body.email || '').toLowerCase().trim();
    const password = String(body.password || '').trim();
    if (!email || !password) return bad(res, 400, 'Email and password are required');
    
    const normalizedEmail = email.toLowerCase().trim();

    // Ensure all required env vars are present
    failIfMissingEnv();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

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

    // Handle both database formats and normalize to underscore style
    const rawRole = String(userRow.role || '');
    const dbRole = normalizeRole(rawRole);
    
    // Allow both original database format and normalized format
    const allowed = new Set(['super_admin','admin','manager','agent','customer_service','super-admin','customer-service']);
    if (!allowed.has(rawRole) && !allowed.has(dbRole)) {
      console.log(`Login attempt failed - invalid role: ${rawRole}/${dbRole} for user: ${email}`);
      return bad(res, 403, 'Invalid role');
    }
    
    const displayName = userRow.full_name || userRow.name || userRow.email;

    const safeUser = {
      id: userRow.id,
      email: userRow.email,
      name: displayName,
      role: dbRole,
      agency_id: userRow.agency_id,
      is_active: !!userRow.is_active
    };

    const token = signJWT(
      { sub: safeUser.id, email: safeUser.email, role: dbRole, agency_id: safeUser.agency_id },
      AUTH_SECRET,
      8 * 60 * 60
    );

    const isProd = /syncedupsolutions\.com$/.test(req.headers.host || "");
    const baseFlags = [
      "Path=/",
      "SameSite=Lax",
      isProd ? "Secure" : "",
      "Max-Age=28800"
    ].filter(Boolean).join("; ");

    const authCookie = [
      `auth_token=${token}`,
      baseFlags,
      isProd ? "Domain=.syncedupsolutions.com" : "",
      isProd ? "HttpOnly" : "HttpOnly=false"
    ].filter(Boolean).join("; ");

    const roleCookie = [
      `user_role=${encodeURIComponent(safeUser.role || "unknown")}`,
      baseFlags,
      isProd ? "Domain=.syncedupsolutions.com" : ""
    ].filter(Boolean).join("; ");

    res.setHeader("Set-Cookie", [authCookie, roleCookie]);
    res.setHeader("Cache-Control", "no-store");

    // One authoritative redirect. No client script needed.
    const role = String(safeUser.role || "").toLowerCase();
    
    // Normalize role to match portal guard expectations
    const normalizedRole = role.replace(/[\s-]+/g, "_");
    
    const portal = normalizedRole === "super_admin" ? "/super-admin"
                : normalizedRole === "admin" ? "/admin"
                : normalizedRole === "manager" ? "/manager"
                : normalizedRole === "customer_service" ? "/customer-service"
                : "/agent";

    res.statusCode = 302;
    res.setHeader("Location", portal);
    res.end();
  } catch (err) {
    const code = err?.statusCode || 500;
    return bad(res, code, err?.message || 'Unexpected error');
  }
}

// Helper function to determine portal redirect based on role
function getPortalRedirect(role) {
  const redirects = {
    'super_admin': '/super-admin',
    'admin': '/admin',
    'manager': '/manager',
    'agent': '/agent',
    'customer_service': '/customer-service'
  };
  return redirects[role] || '/admin';
}