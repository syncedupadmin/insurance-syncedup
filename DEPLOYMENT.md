# Deployment Guide

## Vercel Deployment

### Prerequisites
1. Vercel account
2. Supabase project with the required tables
3. Environment variables ready

### Environment Variables
Set the following environment variables in your Vercel dashboard:

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Your Supabase service key
- `JWT_SECRET`: Secret for JWT token signing

**Optional (for full functionality):**
- `RESEND_API_KEY`: For email functionality
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`: For file uploads
- `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`: For payment processing

### Deployment Steps

#### Option 1: Using Vercel CLI
1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel --prod`

#### Option 2: GitHub Integration
1. Push code to GitHub repository
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push

### Post-Deployment Setup

1. **Configure Custom Domain** (if needed):
   - Add domain in Vercel dashboard
   - Update DNS settings

2. **Test Super Admin Access**:
   - Visit: `https://your-domain.vercel.app/login.html`
   - Login with: `admin@syncedupsolutions.com`
   - Password: `TestPassword123!` or `superadmin123` or `Admin123!`
   - Should redirect to `/super-admin/`

3. **Database Setup**:
   - Ensure Supabase tables are created
   - Run setup scripts if needed:
     - `/api/setup-super-admin` to create admin user
     - Database migration scripts as needed

### Troubleshooting

- **API Routes not working**: Check that `api/` folder structure is correct
- **Super Admin login failing**: Verify JWT_SECRET and Supabase credentials
- **CORS errors**: Check that environment variables are set in Vercel dashboard
- **404 errors**: Verify vercel.json rewrites are configured correctly

### Security Notes

- Never commit `.env` files with real credentials
- Use Vercel's environment variable system for sensitive data
- JWT_SECRET should be a strong, random string
- Regularly rotate API keys and secrets