# Security Implementation Guide

## Overview
This document outlines the security measures implemented in the SyncedUp Insurance application.

## ✅ Completed Security Features

### 1. Environment Variables & Secrets Management
- **JWT_SECRET**: Cryptographically secure 64-byte random string
- **Database credentials**: Stored in environment variables
- **Admin tokens**: Configurable via environment variables
- All sensitive data removed from source code

### 2. Rate Limiting
- **Login endpoint**: 5 attempts per 15 minutes per IP+UserAgent
- **General API endpoints**: 100 requests per 15 minutes per IP
- **Sensitive operations**: 10 requests per 5 minutes per IP
- **Admin bypass**: Admin tokens skip rate limiting
- **Implementation**: `express-rate-limit` with custom fingerprinting

### 3. Row Level Security (RLS) in Supabase
- **SQL Script**: `supabase-rls-setup.sql` - Run this in Supabase SQL Editor
- **Tables protected**: sales, commissions, chargebacks
- **Policies implemented**:
  - Agents can only see their own data
  - Admins can see all data
  - User context set via JWT claims
- **Function**: `set_current_user_email()` for context setting

### 4. HttpOnly Cookies Authentication
- **Security benefits**:
  - XSS protection (JavaScript cannot access tokens)
  - CSRF protection with SameSite=Strict
  - Secure flag for HTTPS-only transmission
- **Token storage**: HttpOnly cookie with appropriate expiration
- **User data**: Separate cookie for client-side access (non-sensitive)
- **Logout**: Proper cookie clearing mechanism

## Implementation Details

### Rate Limiting Configuration
```javascript
// Login rate limiting
windowMs: 15 * 60 * 1000, // 15 minutes
max: 5, // 5 login attempts per window

// API rate limiting  
windowMs: 15 * 60 * 1000, // 15 minutes
max: 100, // 100 API requests per window
```

### Cookie Security Settings
```javascript
HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=<expiration>
```

### Row Level Security Policies
```sql
-- Agents see only their own sales
CREATE POLICY "Agents see own sales" ON sales
  FOR SELECT 
  USING (agent_id = current_user_id OR is_admin());
```

## Security Headers
The application sets the following security headers:
- `Set-Cookie` with security flags
- Rate limit headers (`RateLimit-*`)

## Authentication Flow
1. User submits login credentials
2. Rate limiting checks IP+UserAgent combination
3. Credentials verified against Supabase with bcrypt
4. JWT token generated with user claims
5. Token stored in HttpOnly cookie
6. User data stored in separate readable cookie
7. Subsequent requests include cookies automatically
8. Middleware validates JWT and sets RLS context

## API Protection
- All sensitive endpoints require authentication
- Admin endpoints require admin role
- Rate limiting applied per endpoint sensitivity
- CORS configured for production domains

## Database Security
- Row Level Security enabled on all sensitive tables
- User context set on each authenticated request
- Prepared statements prevent SQL injection
- Service key used for server-side operations only

## Client-Side Security
- No sensitive tokens in localStorage/sessionStorage
- Authentication utilities in `/auth-utils.js`
- Automatic redirect for unauthenticated users
- Role-based access control for admin areas

## Deployment Security
- Environment variables configured in Vercel
- HTTPS enforced in production
- Secure cookie flags active in production
- Database connection over SSL

## Next Steps for Production
1. Run the SQL script in `supabase-rls-setup.sql`
2. Update environment variables in Vercel dashboard
3. Configure proper domain for cookie security
4. Set up monitoring for rate limit violations
5. Implement audit logging for admin actions
6. Consider implementing 2FA for admin accounts

## Security Checklist
- [x] Secrets moved to environment variables
- [x] Rate limiting implemented
- [x] Row Level Security configured
- [x] HttpOnly cookies implemented
- [x] CSRF protection via SameSite cookies
- [x] XSS protection via HttpOnly cookies
- [x] SQL injection protection via prepared statements
- [x] Secure password hashing with bcrypt
- [x] JWT token security with proper expiration
- [x] Role-based access control
- [x] Authentication middleware for API protection