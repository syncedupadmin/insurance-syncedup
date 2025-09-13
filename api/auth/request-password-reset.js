// Request password reset API endpoint - Using Supabase Auth
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function failIfMissingEnv() {
  const missing = [];
  if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!SUPABASE_ANON_KEY) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (missing.length) {
    throw new Error(`Missing required env: ${missing.join(', ')}`);
  }
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
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const email = String(body.email || '').toLowerCase().trim();
    if (!email) return bad(res, 400, 'Email is required');

    // Use Supabase Auth to send password reset email
    // This automatically handles user lookup, token generation, and email sending
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://insurance.syncedupsolutions.com/reset-password.html',
    });

    if (error) {
      console.error('Supabase password reset error:', error);
      // Still return success to prevent user enumeration
      return ok(res, { ok: true });
    }

    console.log(`Password reset email sent via Supabase to: ${email}`);

    // Always return success to prevent user enumeration
    return ok(res, { ok: true });

  } catch (err) {
    console.error('Unexpected error in password reset request:', err);
    return ok(res, { ok: true }); // Don't reveal errors to user
  }
}