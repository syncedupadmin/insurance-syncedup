#!/bin/bash

# Add theme-switcher.js to files that are missing it

add_theme_switcher() {
    local file=$1
    
    # Check if file exists
    if [ ! -f "$file" ]; then
        echo "Skipping: $file (not found)"
        return
    fi
    
    # Check if already has theme-switcher
    if grep -q "theme-switcher.js" "$file"; then
        echo "Already has theme-switcher: $file"
        return
    fi
    
    # Add theme-switcher.js before </body>
    sed -i 's|</body>|    <script src="/js/theme-switcher.js"></script>\n</body>|' "$file"
    
    echo "Added theme-switcher.js to: $file"
}

echo "=== Adding theme-switcher.js to missing files ==="

# Manager portal - missing files
add_theme_switcher "public/manager/convoso.html"
add_theme_switcher "public/manager/convoso-leads.html"  
add_theme_switcher "public/manager/convoso-monitor.html"
add_theme_switcher "public/manager/goals.html"

# Customer service portal - missing files
add_theme_switcher "public/customer-service/index.html"
add_theme_switcher "public/customer-service/member-profile.html"
add_theme_switcher "public/customer-service/member-search.html"

# Leaderboard portal - missing files
add_theme_switcher "public/leaderboard/index.html"
add_theme_switcher "public/leaderboard/teams.html"
add_theme_switcher "public/leaderboard/test-independence.html"

echo -e "\n✅ Theme-switcher.js added to all missing files!"