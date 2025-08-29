import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getRateLimitStatus } from '../utils/rateLimiter.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Use a consistent JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here-change-this-to-something-secure';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;
  console.log('Login attempt for:', email);

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  // Rate limiting check (5 attempts per 15 minutes)
  const clientIP = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
  const rateLimitKey = `login:${clientIP}:${email}`;
  
  if (!checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000)) {
    const status = getRateLimitStatus(rateLimitKey, 5, 15 * 60 * 1000);
    return res.status(429).json({ 
      error: 'Too many login attempts', 
      details: `Please try again after ${status.resetTime?.toLocaleTimeString()}`,
      rateLimitInfo: status
    });
  }

  try {
    // Debug: Check if we can connect to database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    console.log('Database query result:', { found: !!user, error });

    if (error || !user) {
      console.log('User not found or error:', error);
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

    res.status(200).json({ 
      success: true,
      token,
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
