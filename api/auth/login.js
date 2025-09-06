import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { securityMiddleware, isDemoAccount } from '../_middleware/security.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
const JWT_EXPIRES_IN = '1h'; // Token expires in 1 hour

async function loginHandler(req, res) {
  // CORS headers (correct, cache-safe)
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Invalid input format' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Fetch fields we actually use - check both tables
    let dbUser, queryError;
    
    // Try portal_users first (main table)
    const { data: portalUser, error: portalError } = await supabase
      .from('portal_users')
      .select('id,email,full_name,name,role,agency_id,must_change_password,is_active,password_hash')
      .eq('email', email.toLowerCase())
      .single();
      
    if (portalUser) {
      dbUser = {
        ...portalUser,
        name: portalUser.name || portalUser.full_name,
        login_count: 0
      };
    } else {
      // Fallback to legacy users table
      const { data: legacyUser, error: legacyError } = await supabase
        .from('users')
        .select('id,email,name,role,agency_id,must_change_password,is_active,login_count,password_hash')
        .eq('email', email.toLowerCase())
        .single();
        
      dbUser = legacyUser;
      queryError = legacyError;
    }

    let user;
    if (queryError || !dbUser) {
      // Fallback for demo and system users if they don't exist in database
      const demoUsers = {
        'admin@demo.com': { id: 'demo-admin', email: 'admin@demo.com', name: 'Admin User', role: 'admin', agency_id: 'DEMO001', is_active: true, must_change_password: false, login_count: 0 },
        'manager@demo.com': { id: 'demo-manager', email: 'manager@demo.com', name: 'Manager User', role: 'manager', agency_id: 'DEMO001', is_active: true, must_change_password: false, login_count: 0 },
        'agent@demo.com': { id: 'demo-agent', email: 'agent@demo.com', name: 'Agent User', role: 'agent', agency_id: 'DEMO001', is_active: true, must_change_password: false, login_count: 0 },
        'super@demo.com': { id: 'demo-super', email: 'super@demo.com', name: 'Super Admin', role: 'super-admin', agency_id: 'DEMO001', is_active: true, must_change_password: false, login_count: 0 },
        'service@demo.com': { id: 'demo-service', email: 'service@demo.com', name: 'Customer Service', role: 'customer-service', agency_id: 'DEMO001', is_active: true, must_change_password: false, login_count: 0 },
        'admin@syncedupsolutions.com': { id: 'super-admin-main', email: 'admin@syncedupsolutions.com', name: 'Super Administrator', role: 'super_admin', agency_id: 'SYSTEM', is_active: true, must_change_password: false, login_count: 0 }
      };
      
      const demoUser = demoUsers[email.toLowerCase()];
      if (demoUser) {
        user = demoUser;
      } else {
        await new Promise(r => setTimeout(r, 100)); // user enumeration hardening
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    } else {
      user = dbUser;
    }

    // Production super admin must be properly registered in database
    // Removed hardcoded override for security

    if (!user.is_active) return res.status(401).json({ error: 'Account is not active' });

    // Password validation
    let isValidPassword = false;
    
    // If user has password_hash, use bcrypt to verify
    if (user.password_hash) {
        isValidPassword = await bcrypt.compare(password, user.password_hash);
    } else {
        // Demo accounts only - removed production account
        const validPasswords = {
            'admin@demo.com': ['demo123!', 'demo123'],
            'manager@demo.com': ['demo123!', 'demo123'],
            'agent@demo.com': ['demo123!', 'demo123'],
            'super@demo.com': ['demo123!', 'demo123'],
            'service@demo.com': ['demo123!', 'demo123']
        };
        
        const allowedPasswords = validPasswords[email.toLowerCase()] || [];
        isValidPassword = allowedPasswords.includes(password);
    }
    
    if (!isValidPassword) {
        await new Promise(r => setTimeout(r, 100)); // timing attack mitigation
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Best-effort login stats (non-fatal)
    try {
      await supabase
        .from('users')
        .update({
          login_count: (user.login_count || 0) + 1,
          last_login: new Date().toISOString()
        })
        .eq('id', user.id);
    } catch (_) {}

    // Create JWT
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      agency_id: user.agency_id,
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'syncedup-auth',
      audience: 'syncedup-app'
    });

    // Response user shape (normalize role)
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.name?.split(' ')[0] || 'User',
      lastName: user.name?.split(' ').slice(1).join(' ') || '',
      role: user.role.replace('-', '_'), // Normalize role format for API consistency
      agency_id: user.agency_id,
      mustChangePassword: user.must_change_password || false,
      loginCount: (user.login_count || 0) + 1,
      isDemoAccount: isDemoAccount(user.email)
    };

    const response = {
      success: true,
      user: userData,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    };

    // Add demo warning for demo accounts
    if (isDemoAccount(user.email)) {
      response._demo = true;
      response._demoMessage = 'Demo account - some features may be limited';
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Apply security middleware with authentication rate limiting
const securityWrapper = securityMiddleware({ 
  rateLimitType: 'auth',
  applyHeaders: true 
});

export default async function handler(req, res) {
  return new Promise((resolve, reject) => {
    securityWrapper(req, res, (err) => {
      if (err) {
        reject(err);
      } else {
        loginHandler(req, res).then(resolve).catch(reject);
      }
    });
  });
}