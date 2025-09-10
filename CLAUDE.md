# Insurance.SyncedUp Project Documentation

## Project Overview
Multi-portal insurance management system with role-based access control and comprehensive database integration.

## Technology Stack
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Node.js with Express
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with server-side session management
- **Deployment**: Vercel
- **Version Control**: Git

## Project Structure
```
Insurance.SyncedUp/
├── public/                    # Frontend files
│   ├── admin/                # Admin portal
│   ├── agent/                # Agent portal
│   ├── customer-service/     # Customer service portal
│   ├── leaderboard/          # Leaderboard portal
│   ├── login/                # Login portal
│   ├── manager/              # Manager portal
│   ├── super-admin/          # Super admin portal
│   └── assets/               # Shared assets
├── server.js                  # Express server
├── package.json              # Node dependencies
├── vercel.json               # Vercel configuration
└── .env                      # Environment variables

```

## Database Schema

### Core Tables
- **profiles**: User profiles with role-based access
- **customers**: Customer information and policies
- **quotes**: Insurance quotes with status tracking
- **claims**: Insurance claims management
- **payments**: Payment records and history
- **commissions**: Agent commission tracking
- **activities**: System-wide activity logging
- **notifications**: User notifications
- **messages**: Internal messaging system

### Authentication & Security
- Server-side session management (no localStorage)
- Role-based access control (RBAC)
- Supabase Row Level Security (RLS) policies
- Secure API endpoints with authentication middleware

## Portal Access Levels
1. **Super Admin**: Full system access, user management, system configuration
2. **Admin**: Administrative functions, reporting, user oversight
3. **Manager**: Team management, performance tracking, approvals
4. **Agent**: Quote creation, customer management, commission tracking
5. **Customer Service**: Customer support, claim processing, inquiries
6. **Customer**: Self-service portal, policy viewing, claim submission

## Development Commands
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

## Environment Variables
Required in `.env`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
SESSION_SECRET=your_session_secret
PORT=3000
```

## API Endpoints
- `/api/auth/*` - Authentication endpoints
- `/api/users/*` - User management
- `/api/customers/*` - Customer operations
- `/api/quotes/*` - Quote management
- `/api/claims/*` - Claims processing
- `/api/payments/*` - Payment handling
- `/api/commissions/*` - Commission tracking
- `/api/reports/*` - Reporting endpoints

## Recent Updates
- Eliminated localStorage authentication in favor of server-side sessions
- Fixed critical JavaScript syntax errors across all portals
- Corrected CSS path issues for all dashboards
- Implemented comprehensive database schema with audit tables
- Added RLS policies for secure data access

## Testing & Quality Assurance
```bash
# Run linting (if configured)
npm run lint

# Run type checking (if TypeScript is configured)
npm run typecheck

# Run tests (if configured)
npm test
```

## Deployment
The application is deployed on Vercel with automatic deployments from the main branch.

Production URL: https://insurance.syncedupsolutions.com

## Security Considerations
- All sensitive operations require authentication
- Role-based access control enforced at API level
- Database RLS policies for additional security layer
- No client-side storage of sensitive data
- HTTPS enforced in production
- Environment variables for all secrets

## Known Issues & TODOs
- Monitor performance of complex queries
- Consider implementing caching for frequently accessed data
- Add comprehensive error logging
- Implement rate limiting on API endpoints
- Add automated testing suite

## Support & Maintenance
For issues or questions about this project:
- Check the recent commit history for context
- Review the database schema documentation
- Ensure all environment variables are properly configured
- Verify Supabase RLS policies are active

---
*Last Updated: 2025-09-09*
*Project maintained in: C:\Users\nicho\OneDrive\Desktop\Insurance.SyncedUp*