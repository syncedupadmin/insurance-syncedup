#!/bin/bash
# Fix environment variable names to match Vercel setup

echo "Fixing environment variable names..."

# Fix in all super-admin API files
find api/super-admin -name "*.js" -type f -exec sed -i \
  -e 's/process\.env\.SUPABASE_SERVICE_KEY/process.env.SUPABASE_SERVICE_ROLE_KEY/g' \
  {} +

echo "✅ Fixed SUPABASE_SERVICE_KEY -> SUPABASE_SERVICE_ROLE_KEY"

# Count how many files were updated
COUNT=$(grep -l "SUPABASE_SERVICE_ROLE_KEY" api/super-admin/*.js | wc -l)
echo "Updated $COUNT files"

echo "Done! Now deploy with: vercel --prod"