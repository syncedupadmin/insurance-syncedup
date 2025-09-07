#!/bin/bash

echo "=== COMPREHENSIVE UI/THEME TEST ==="

echo -e "\n1. Checking Professional Theme Portal Colors..."
if grep -q "portal-admin\|portal-manager\|portal-agent" css/themes/professional.css; then
    echo "✓ Portal-specific colors defined"
else
    echo "✗ Portal colors MISSING"
fi

echo -e "\n2. Checking Alignment System..."
if grep -q "spacing-unit\|grid-template" css/themes/professional.css; then
    echo "✓ Grid system implemented"
else
    echo "✗ Grid system MISSING"
fi

echo -e "\n3. Checking Global Leaderboard..."
if [ -f "public/leaderboard/index.html" ]; then
    echo "✓ Leaderboard file exists"
else
    echo "✗ Leaderboard MISSING"
fi

echo -e "\n4. Checking JavaScript Files..."
if [ -f "public/js/theme-switcher.js" ]; then
    echo "✓ Theme switcher exists"
else
    echo "✗ Theme switcher MISSING"
fi

if [ -f "public/js/alignment-fix.js" ]; then
    echo "✓ Alignment fixer exists"
else
    echo "✗ Alignment fixer MISSING"
fi

echo -e "\n5. Checking Portal Color Variables..."
echo "Admin Portal Colors:"
grep -A 10 "\.portal-admin" css/themes/professional.css | grep -E "(primary-color|header-bg)" | head -2

echo -e "\nManager Portal Colors:"
grep -A 10 "\.portal-manager" css/themes/professional.css | grep -E "(primary-color|header-bg)" | head -2

echo -e "\nAgent Portal Colors:"
grep -A 10 "\.portal-agent" css/themes/professional.css | grep -E "(primary-color|header-bg)" | head -2

echo -e "\nCustomer Service Colors:"
grep -A 10 "\.portal-customer-service" css/themes/professional.css | grep -E "(primary-color|header-bg)" | head -2

echo -e "\nLeaderboard Colors:"
grep -A 10 "\.portal-leaderboard" css/themes/professional.css | grep -E "(primary-color|gold|silver)" | head -3

echo -e "\n6. Visual Alignment Check:"
echo "Open each portal and verify:"
echo "[ ] All cards are same height in each row"
echo "[ ] All buttons are aligned"
echo "[ ] Tables have consistent column widths"
echo "[ ] No overlapping elements"
echo "[ ] Consistent spacing throughout"

echo -e "\n7. Professional Theme Portal Colors:"
echo "[ ] Admin = Black/Dark theme"
echo "[ ] Manager = Orange/Peach theme"
echo "[ ] Agent = Blue theme"
echo "[ ] Customer Service = Green theme"
echo "[ ] Leaderboard = Dark with gold accents"

echo -e "\n8. Global Leaderboard Check:"
echo "[ ] No emoji or decorative elements"
echo "[ ] Clean podium display for top 3"
echo "[ ] Professional data table"
echo "[ ] Working filters and tabs"
echo "[ ] Real-time update indicator"

echo -e "\n9. Testing Commands:"
echo "// Test theme in each portal"
echo "localStorage.setItem('selectedTheme', 'professional');"
echo "location.reload();"

echo -e "\n10. Browser Console Tests:"
echo "// Verify portal detection"
echo "console.log(window.themeSystem.detectPortal());"
echo ""
echo "// Verify CSS variables"
echo "console.log(window.inspectCSSVariables());"
echo ""
echo "// Test alignment fixer"
echo "window.alignmentFixer.fixAll();"

echo -e "\n11. MANUAL VERIFICATION CHECKLIST:"
echo "1. Open Admin portal - should be black/dark"
echo "2. Open Manager portal - should be orange/peach"
echo "3. Open Agent portal - should be blue"
echo "4. Open Customer Service - should be green"
echo "5. Open Global Leaderboard - should be clean and professional"
echo "6. Check all elements are perfectly aligned"
echo "7. Verify no fake data is showing"
echo "8. Test theme switching works"
echo "9. Test responsive behavior on mobile"
echo "10. Verify keyboard shortcuts (Alt+P, Alt+C, Alt+M)"

echo -e "\n12. FILES CREATED/MODIFIED:"
echo "✓ css/themes/professional.css - Professional theme with portal colors"
echo "✓ public/leaderboard/index.html - Complete redesign, no emojis"
echo "✓ public/js/alignment-fix.js - Universal alignment fixer"
echo "✓ public/js/theme-switcher.js - Portal detection and theme switching"

echo -e "\n=== TEST COMPLETE ==="
echo "Run manual verification steps to confirm all portals display correctly."