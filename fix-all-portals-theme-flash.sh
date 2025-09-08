#!/bin/bash

# Portal-specific theme flash prevention for all portals

fix_portal_theme_flash() {
    local file=$1
    local portal_type=$2
    
    # Check if file exists
    if [ ! -f "$file" ]; then
        echo "Skipping: $file (not found)"
        return
    fi
    
    # Check if already has critical theme
    if grep -q "Critical Theme Flash Prevention" "$file"; then
        echo "Already fixed: $file"
        return
    fi
    
    # Set portal-specific colors for professional theme
    local professional_bg=""
    case $portal_type in
        "admin")
            professional_bg="linear-gradient(135deg,#ff6b35 0%,#f72585 100%)"
            ;;
        "manager") 
            professional_bg="linear-gradient(-45deg,#c2410c,#ea580c,#fb923c,#fed7aa)"
            ;;
        "agent")
            professional_bg="linear-gradient(-45deg,#059669,#10b981,#34d399,#a7f3d0)"
            ;;
        "customer-service")
            professional_bg="linear-gradient(-45deg,#1e3a8a,#3b82f6,#60a5fa,#dbeafe)"
            ;;
        "leaderboard")
            professional_bg="linear-gradient(135deg,#667eea 0%,#764ba2 100%)"
            ;;
    esac
    
    # Add critical theme script with portal-specific colors
    sed -i "/<head>/a\\
    <!-- Critical Theme Flash Prevention -->\\
    <script>\\
    (function(){\\
        var t=localStorage.getItem(\"selectedTheme\")||\"professional\";\\
        var h=document.documentElement;\\
        if(t===\"classic\"){h.classList.add(\"classic-mode\");h.style.backgroundColor=\"#008080\";}\\
        else if(t===\"modern\"){h.classList.add(\"modern-mode\");h.style.background=\"linear-gradient(135deg,#667eea 0%,#764ba2 100%)\";}\\
        else{h.style.background=\"$professional_bg\";}\\
        h.style.visibility=\"hidden\";\\
        setTimeout(function(){h.style.visibility=\"visible\";h.style.transition=\"opacity 0.2s\";h.style.opacity=\"1\";},50);\\
    })();\\
    </script>" "$file"
    
    echo "Fixed: $file ($portal_type portal)"
}

# Fix manager portal
echo "=== Fixing Manager Portal ==="
for file in public/manager/*.html; do
    fix_portal_theme_flash "$file" "manager"
done

# Fix agent portal  
echo -e "\n=== Fixing Agent Portal ==="
for file in public/agent/*.html; do
    fix_portal_theme_flash "$file" "agent"
done

# Fix customer service portal
echo -e "\n=== Fixing Customer Service Portal ==="
for file in public/customer-service/*.html; do
    fix_portal_theme_flash "$file" "customer-service"
done

# Fix leaderboard portal
echo -e "\n=== Fixing Leaderboard Portal ==="
for file in public/leaderboard/*.html; do
    fix_portal_theme_flash "$file" "leaderboard"
done

echo -e "\n✅ Theme flash prevention added to ALL portals!"