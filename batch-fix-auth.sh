#!/bin/bash

# List of files that need auth fixes
FILES=(
  "activity-chart.js"
  "agency-management.js"
  "agency-stats.js"
  "audit-logs.js"
  "create-agency.js"
  "debug-create-agency.js"
  "demo-login.js"
  "endpoint-chart.js"
  "enhanced-dashboard.js"
  "financial-stats.js"
  "forecast-chart.js"
  "global-leaderboard.js"
  "ip-rules.js"
  "notifications.js"
  "performance.js"
  "performance-chart.js"
  "production-cleanup.js"
  "realtime-metrics.js"
  "reset-password.js"
  "response-time-chart.js"
  "revenue-chart.js"
  "revenue-management.js"
  "security-events.js"
  "security-settings.js"
  "security-stats.js"
  "setup-demo-data.js"
  "simple-create-agency.js"
  "system-alerts.js"
  "system-events.js"
  "system-metrics.js"
  "system-settings.js"
  "system-stats.js"
  "test-agency-only.js"
  "user-administration.js"
  "user-stats.js"
  "verify-production.js"
)

cd api/super-admin

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    
    # Check if file uses import or require
    if grep -q "^import " "$file"; then
      # ES6 imports
      # Add import if not present
      if ! grep -q "verifySuperAdmin" "$file"; then
        # Add import after first import statement
        sed -i '0,/^import .*$/a\import { verifySuperAdmin } from '"'"'./auth-middleware.js'"'"';' "$file"
      fi
    else
      # CommonJS requires
      if ! grep -q "verifySuperAdmin" "$file"; then
        # Add require at the top
        sed -i '1s/^/const { verifySuperAdmin } = require('"'"'.\/auth-middleware'"'"');\n/' "$file"
      fi
    fi
    
    echo "✓ Updated $file"
  fi
done

echo "Batch update complete!"