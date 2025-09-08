#!/bin/bash

# Function to add critical theme loader to HTML files
fix_theme_flash() {
    local file=$1
    
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
    
    # Add critical theme script right after <head>
    sed -i '/<head>/a\
    <!-- Critical Theme Flash Prevention -->\
    <script>\
    (function(){\
        var t=localStorage.getItem("selectedTheme")||"professional";\
        var h=document.documentElement;\
        if(t==="classic"){h.classList.add("classic-mode");h.style.backgroundColor="#008080";}\
        else if(t==="modern"){h.classList.add("modern-mode");h.style.background="linear-gradient(135deg,#667eea 0%,#764ba2 100%)";}\
        else{h.style.background="linear-gradient(135deg,#ff6b35 0%,#f72585 100%)";}\
        h.style.visibility="hidden";\
        setTimeout(function(){h.style.visibility="visible";h.style.transition="opacity 0.2s";h.style.opacity="1";},50);\
    })();\
    </script>' "$file"
    
    echo "Fixed: $file"
}

# Fix all admin pages
for file in public/admin/*.html; do
    fix_theme_flash "$file"
done

echo "Theme flash prevention added to all admin pages"