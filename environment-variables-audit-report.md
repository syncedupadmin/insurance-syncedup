# Environment Variables Audit Report - Insurance.SyncedUp

**Generated:** September 9, 2025  
**Analysis Scope:** 174 API files across the entire backend system

## Executive Summary

This comprehensive audit analyzed all environment variables used across the Insurance.SyncedUp platform's backend API layer. The analysis reveals **37 unique environment variables** used across **174 API files**, with database and authentication variables being the most critical for system operation.

### Critical Statistics
- **Total Environment Variables:** 37
- **Most Used Variable:** SUPABASE_SERVICE_KEY (154 occurrences across 149 files)
- **High-Risk Variables:** 15 (containing secrets/keys requiring secure configuration)
- **Files Analyzed:** 174 API endpoints

---

## 1. DATABASE CONFIGURATION (5 variables)

### SUPABASE_SERVICE_KEY ⚠️ CRITICAL
- **Usage:** 154 occurrences across 149 files
- **Purpose:** Backend service authentication with Supabase database
- **Risk Level:** HIGH - Full database access with elevated privileges
- **Example Files:** `/api/auth/login-secure.js`, `/api/admin/analytics.js`, `/api/dashboard.js`

### NEXT_PUBLIC_SUPABASE_URL
- **Usage:** 150 occurrences across 144 files
- **Purpose:** Public Supabase instance URL
- **Risk Level:** LOW - Public configuration
- **Example Files:** `/api/auth/login-secure.js`, `/api/create-subscription.js`

### SUPABASE_URL
- **Usage:** 28 occurrences across 28 files
- **Purpose:** Alternative Supabase URL configuration
- **Risk Level:** LOW - Configuration setting

### SUPABASE_SERVICE_ROLE_KEY ⚠️ CRITICAL
- **Usage:** 17 occurrences across 16 files
- **Purpose:** Service role key with elevated permissions
- **Risk Level:** HIGH - Administrative database access

### SUPABASE_ANON_KEY
- **Usage:** 7 occurrences across 7 files
- **Purpose:** Anonymous access key for public operations
- **Risk Level:** MEDIUM - Limited public access

---

## 2. AUTHENTICATION & SECURITY (4 variables)

### JWT_SECRET ⚠️ CRITICAL
- **Usage:** 42 occurrences across 38 files
- **Purpose:** JWT token signing and verification
- **Risk Level:** HIGH - Core authentication security
- **Critical Files:** `/api/auth/login-secure.js`, `/api/auth/verify.js`, `/api/portal-guard.js`

### AUTH_SECRET ⚠️ CRITICAL
- **Usage:** 4 occurrences across 4 files
- **Purpose:** Alternative authentication secret
- **Risk Level:** HIGH - Authentication security

### ENCRYPTION_MASTER_KEY ⚠️ CRITICAL
- **Usage:** 4 occurrences across 2 files
- **Purpose:** Master key for data encryption
- **Risk Level:** HIGH - Data protection security

### SUPABASE_JWT_SECRET ⚠️ CRITICAL
- **Usage:** 1 occurrence
- **Purpose:** Supabase-specific JWT secret
- **Risk Level:** HIGH - Database authentication

---

## 3. PAYMENT PROCESSING (2 variables)

### STRIPE_SECRET_KEY ⚠️ CRITICAL
- **Usage:** 3 occurrences across 3 files
- **Purpose:** Stripe payment processing
- **Risk Level:** HIGH - Financial transactions
- **Files:** `/api/create-checkout-session.js`, `/api/create-subscription.js`, `/api/stripe-webhook.js`

### STRIPE_WEBHOOK_SECRET ⚠️ CRITICAL
- **Usage:** 1 occurrence
- **Purpose:** Stripe webhook validation
- **Risk Level:** HIGH - Payment security

---

## 4. EMAIL SERVICES (4 variables)

### RESEND_API_KEY ⚠️ CRITICAL
- **Usage:** 8 occurrences across 6 files
- **Purpose:** Resend email service authentication
- **Risk Level:** MEDIUM - Email service access
- **Files:** `/api/email/send.js`, `/api/auth/reset-password.js`

### SENDGRID_API_KEY ⚠️ CRITICAL
- **Usage:** 1 occurrence
- **Purpose:** SendGrid email service (alternative)
- **Risk Level:** MEDIUM - Email service access

### MAILGUN_API_KEY ⚠️ CRITICAL
- **Usage:** 1 occurrence
- **Purpose:** Mailgun email service (alternative)
- **Risk Level:** MEDIUM - Email service access

### EMAIL_PROVIDER
- **Usage:** 1 occurrence
- **Purpose:** Email provider configuration
- **Risk Level:** LOW - Configuration setting

---

## 5. SMTP CONFIGURATION (4 variables)

### SMTP_HOST
- **Usage:** 2 occurrences
- **Purpose:** SMTP server hostname
- **Risk Level:** LOW - Configuration setting

### SMTP_PORT
- **Usage:** 2 occurrences
- **Purpose:** SMTP server port
- **Risk Level:** LOW - Configuration setting

### SMTP_USER
- **Usage:** 1 occurrence
- **Purpose:** SMTP authentication username
- **Risk Level:** MEDIUM - Authentication credential

### SMTP_PASS ⚠️ CRITICAL
- **Usage:** 1 occurrence
- **Purpose:** SMTP authentication password
- **Risk Level:** HIGH - Authentication credential

---

## 6. FILE STORAGE (7 variables)

### R2_ENDPOINT
- **Usage:** 5 occurrences across 3 files
- **Purpose:** Cloudflare R2 storage endpoint
- **Risk Level:** LOW - Configuration setting

### R2_ACCESS_KEY_ID ⚠️ CRITICAL
- **Usage:** 4 occurrences across 3 files
- **Purpose:** R2 storage access key ID
- **Risk Level:** HIGH - Storage service access

### R2_SECRET_ACCESS_KEY ⚠️ CRITICAL
- **Usage:** 3 occurrences across 3 files
- **Purpose:** R2 storage secret access key
- **Risk Level:** HIGH - Storage service access

### R2_BUCKET_NAME
- **Usage:** 3 occurrences
- **Purpose:** R2 storage bucket name
- **Risk Level:** LOW - Configuration setting

### R2_WORKER_URL
- **Usage:** 1 occurrence
- **Purpose:** R2 worker service URL
- **Risk Level:** LOW - Configuration setting

### UPLOAD_SECRET ⚠️ CRITICAL
- **Usage:** 2 occurrences
- **Purpose:** File upload authentication secret
- **Risk Level:** HIGH - Upload security

### ENCRYPTION_KEY ⚠️ CRITICAL
- **Usage:** 1 occurrence
- **Purpose:** File encryption key
- **Risk Level:** HIGH - Data encryption

---

## 7. EXTERNAL INTEGRATIONS (4 variables)

### CONVOSO_API_KEY ⚠️ CRITICAL
- **Usage:** 2 occurrences
- **Purpose:** Convoso CRM integration
- **Risk Level:** HIGH - Third-party API access

### CONVOSO_TOKEN ⚠️ CRITICAL
- **Usage:** 1 occurrence
- **Purpose:** Convoso authentication token
- **Risk Level:** HIGH - Third-party authentication

### CONVOSO_BASE_URL
- **Usage:** 1 occurrence
- **Purpose:** Convoso API base URL
- **Risk Level:** LOW - Configuration setting

### NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ⚠️ CRITICAL
- **Usage:** 1 occurrence
- **Purpose:** Google Maps API integration
- **Risk Level:** MEDIUM - Third-party API access

---

## 8. APPLICATION CONFIGURATION (6 variables)

### NODE_ENV
- **Usage:** 15 occurrences across 11 files
- **Purpose:** Environment detection (development/production)
- **Risk Level:** LOW - Configuration setting

### APP_URL
- **Usage:** 10 occurrences across 6 files
- **Purpose:** Application base URL for callbacks and redirects
- **Risk Level:** LOW - Configuration setting

### NEXT_PUBLIC_URL
- **Usage:** 4 occurrences across 3 files
- **Purpose:** Public application URL
- **Risk Level:** LOW - Configuration setting

### VERCEL_URL
- **Usage:** 2 occurrences
- **Purpose:** Vercel deployment URL
- **Risk Level:** LOW - Configuration setting

### VERCEL
- **Usage:** 2 occurrences
- **Purpose:** Vercel platform detection
- **Risk Level:** LOW - Configuration setting

### WS_PORT
- **Usage:** 1 occurrence
- **Purpose:** WebSocket server port
- **Risk Level:** LOW - Configuration setting

---

## 9. SECURITY & ACCESS CONTROL (1 variable)

### ALLOWED_ORIGINS
- **Usage:** 5 occurrences across 5 files
- **Purpose:** CORS allowed origins configuration
- **Risk Level:** MEDIUM - Security configuration

---

## CRITICAL SECURITY ANALYSIS

### High-Risk Variables (Require Immediate Attention)
1. **SUPABASE_SERVICE_KEY** - 154 uses - Complete database access
2. **JWT_SECRET** - 42 uses - Authentication foundation
3. **ENCRYPTION_MASTER_KEY** - 4 uses - Data encryption security
4. **STRIPE_SECRET_KEY** - 3 uses - Financial transaction access
5. **R2_SECRET_ACCESS_KEY** - 3 uses - File storage access
6. **SUPABASE_SERVICE_ROLE_KEY** - 17 uses - Administrative database access

### Most Critical API Files
1. `/api/auth/login-secure.js` - Multiple critical variables (JWT, Supabase)
2. `/api/create-subscription.js` - Payment processing (Stripe keys)
3. `/api/email/send.js` - Email service integration
4. `/api/storage/upload-url.js` - File storage security
5. `/api/portal-guard.js` - Authentication middleware

### Missing from Current .env.example Files
Based on our analysis, the following variables are used in code but missing from documentation:
- `AUTH_SECRET`
- `SUPABASE_JWT_SECRET`
- `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- `UPLOAD_SECRET`
- `CONVOSO_API_KEY`, `CONVOSO_TOKEN`, `CONVOSO_BASE_URL`
- `SENDGRID_API_KEY`, `MAILGUN_API_KEY`
- `ALLOWED_ORIGINS`
- `WS_PORT`

---

## RECOMMENDATIONS

### Immediate Actions Required

1. **Environment Variable Documentation**
   - Update `.env.example` to include all 37 variables
   - Add proper comments explaining each variable's purpose
   - Document which variables are required vs optional

2. **Security Hardening**
   - Implement validation for all critical environment variables at startup
   - Use secrets management service (AWS Secrets Manager, Azure Key Vault) for production
   - Implement proper key rotation procedures for all API keys

3. **Configuration Management**
   - Create environment-specific configurations (dev/staging/prod)
   - Implement fallback mechanisms for non-critical variables
   - Add runtime checks to ensure all required variables are present

4. **Monitoring & Auditing**
   - Implement logging for environment variable access
   - Set up alerts for missing critical variables
   - Regular security audits of environment variable usage

### Long-term Improvements

1. **Centralized Configuration**
   - Consider implementing a configuration service
   - Use encrypted configuration files for sensitive settings
   - Implement configuration validation schemas

2. **Development Process**
   - Add pre-commit hooks to check for hardcoded secrets
   - Implement automated scanning for environment variable usage
   - Document environment variable changes in deployment procedures

---

## CONCLUSION

The Insurance.SyncedUp platform uses 37 environment variables across 174 API files, with 15 variables containing sensitive information requiring secure configuration. The database and authentication variables are the most critical, with `SUPABASE_SERVICE_KEY` being used in 85% of all API files.

**Immediate attention is required** to properly secure and document all environment variables, particularly those handling database access, authentication, and payment processing. The current `.env.example` files are incomplete and missing several variables that are actively used in the codebase.

Proper environment variable management is crucial for the security and reliability of the Insurance.SyncedUp platform, especially given its multi-tenant architecture and handling of sensitive insurance and financial data.