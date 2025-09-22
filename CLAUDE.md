# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Build Tailwind CSS
npm run build         # Production build
npm run build:watch   # Watch mode for development

# Run development server
npm run dev          # Starts http-server on port 3001

# Audit tools (Playwright-based crawler)
npm run audit        # Run the portal crawler
npm run audit:report # Generate audit report
npm run audit:full   # Run crawler and generate report

# Playwright tests
npm run playwright:install  # Install Playwright browsers
npm run playwright:test    # Run Playwright tests
```

## High-Level Architecture

### Portal System
Multi-portal insurance management system with role-based isolation:
- Each portal is in `public/_[portal-name]/` (e.g., `_agent`, `_admin`, `_super-admin`)
- Vercel rewrites map clean URLs (e.g., `/agent`) to portal directories
- Portal isolation enforced through server-side authentication
- No localStorage authentication - all auth is server-side session-based

### API Structure
- **API Routes**: Located in `/api/` directory, organized by functionality
- **Role-gated endpoints**: Each portal has dedicated API endpoints (e.g., `/api/super-admin/*`)
- **Middleware**: Authentication checks in `/api/_middleware/authCheck.js`
- **Utils**: Shared utilities in `/api/_utils/` and `/api/utils/`

### Database Architecture
- **Supabase PostgreSQL** with Row Level Security (RLS)
- **Agency isolation**: Multi-tenant architecture with `agency_id` filtering
- **Core tables**: profiles, customers, quotes, claims, payments, commissions
- **Audit tables**: activities, notifications, messages for tracking

### Authentication Flow
1. Login via `/api/auth/login-secure.js` endpoint
2. Server creates secure session cookie
3. All API calls validate session server-side
4. Role-based access control enforced at API level
5. No client-side auth state storage

## Portal Access Levels
- **Super Admin**: System-wide control, agency management, platform monitoring
- **Admin**: Agency administration, reporting, user management within agency
- **Manager**: Team oversight, performance tracking, approvals
- **Agent**: Quote creation, customer management, commission tracking
- **Customer Service**: Support tickets, claim processing, customer inquiries

## Important Patterns

### Frontend JavaScript
- Vanilla JavaScript (no framework)
- API calls use fetch with credentials: 'include' for cookies
- Error handling with user-friendly messages
- Dynamic content loading without page refresh

### CSS Organization
- Tailwind CSS for styling
- Main CSS file: `/public/css/main.css` (generated from `/styles/tailwind.css`)
- Portal-specific styles inline or in portal directories

### Security Headers
- CSP configured in vercel.json
- CORS handled at API level
- Authentication cookies with httpOnly, secure, sameSite flags