// Request password reset API endpoint
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

function failIfMissingEnv() {
  const missing = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const email = String(body.email || '').toLowerCase().trim();
    if (!email) return bad(res, 400, 'Email is required');

    // Look up user by email (avoid user enumeration by always returning ok)
    const { data: users, error } = await supabase
      .from('portal_users')
      .select('email, is_active')
      .or(`email.eq.${email},email_norm.eq.${email}`)
      .limit(1);

    if (error) {
      console.error('Database error during password reset request:', error);
      return ok(res, { ok: true }); // Don't reveal DB errors
    }

    const userRow = users?.[0];
    if (!userRow || userRow.is_active === false) {
      console.log(`Password reset requested for non-existent/inactive user: ${email}`);
      return ok(res, { ok: true }); // Don't reveal user existence
    }

    // Generate secure reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now

    // Store reset token
    const { error: insertError } = await supabase
      .from('password_resets')
      .insert({
        email: userRow.email,
        token,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (insertError) {
      console.error('Error creating password reset token:', insertError);
      return ok(res, { ok: true }); // Don't reveal DB errors
    }

    const resetLink = `https://insurance.syncedupsolutions.com/change-password?token=${token}`;
    
    if (RESEND_API_KEY) {
      // Send email with Resend
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'SyncedUp Insurance <noreply@syncedupsolutions.com>',
            to: [userRow.email],
            subject: 'Password Reset Request',
            html: `
              <h2>Password Reset Request</h2>
              <p>You requested a password reset for your SyncedUp Insurance account.</p>
              <p>Click the link below to reset your password (expires in 2 hours):</p>
              <a href="${resetLink}">Reset Password</a>
              <p>If you didn't request this, you can ignore this email.</p>
            `,
          }),
        });

        if (!emailResponse.ok) {
          console.error('Failed to send reset email:', await emailResponse.text());
        } else {
          console.log(`Password reset email sent to: ${email}`);
        }
      } catch (emailError) {
        console.error('Error sending reset email:', emailError);
      }
    } else {
      // Log reset link for development
      console.log(`\n=== PASSWORD RESET LINK ===`);
      console.log(`Email: ${email}`);
      console.log(`Link: ${resetLink}`);
      console.log(`Expires: ${expiresAt.toISOString()}`);
      console.log(`==========================\n`);
    }

    // Always return success to prevent user enumeration
    return ok(res, { ok: true });

  } catch (err) {
    console.error('Unexpected error in password reset request:', err);
    return ok(res, { ok: true }); // Don't reveal errors to user
  }
}