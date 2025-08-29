import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { loginRateLimit, applyRateLimit } from '../_middleware/rateLimiter.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  // Apply rate limiting
  try {
    await applyRateLimit(loginRateLimit)(req, res);
  } catch (error) {
    return; // Rate limit response already sent
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;
  console.log('Login attempt for:', email);
  console.log('JWT_SECRET:', JWT_SECRET ? 'Present' : 'Missing');

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    console.log('User found:', !!user);
    console.log('Database error:', error);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    console.log('Password valid:', passwordValid);
    
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: user.role === 'admin' ? '2h' : '8h' }
    );

    // Set httpOnly cookie for security
    res.setHeader('Set-Cookie', [
      `token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${user.role === 'admin' ? 7200 : 28800}`, // 2h or 8h in seconds
      `user=${encodeURIComponent(JSON.stringify({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      }))}; Secure; SameSite=Strict; Path=/; Max-Age=${user.role === 'admin' ? 7200 : 28800}`
    ]);

    res.status(200).json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
