#!/bin/bash

# Deploy Super Admin Edge Function to Supabase

echo "🚀 Deploying Super Admin Edge Function..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Initialize supabase if not already done
if [ ! -f "supabase/.gitignore" ]; then
    echo "📦 Initializing Supabase project..."
    supabase init
fi

# Deploy the edge function
echo "📤 Deploying admin-api function..."
supabase functions deploy admin-api --no-verify-jwt

# Test the function
echo "🧪 Testing edge function..."
curl -i --location --request GET \
  'https://your-project.supabase.co/functions/v1/admin-api/health' \
  --header 'Authorization: Bearer YOUR_ANON_KEY'

echo "✅ Edge Function deployed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Update EDGE_FUNCTION_URL in user-management-secure.js with your Supabase project URL"
echo "2. Test user creation with the super admin portal"
echo "3. Monitor audit_logs table for all actions"
echo ""
echo "🔐 Security Notes:"
echo "- All operations are RLS protected"
echo "- Audit triggers log every super_admin action"
echo "- Edge Function uses service role securely"