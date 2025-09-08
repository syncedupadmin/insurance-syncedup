#!/bin/bash

echo "=== Fixing Admin Portal Colors ==="

# Fix the admin portal professional theme colors in all admin files
for file in public/admin/*.html; do
    if [ -f "$file" ]; then
        # Replace the incorrect orange gradient with correct purple gradient
        sed -i 's/linear-gradient(135deg,#ff6b35 0%,#f72585 100%)/linear-gradient(-45deg,#4c1d95,#5b21b6,#6d28d9,#7c3aed)/g' "$file"
        echo "Fixed colors in: $(basename "$file")"
    fi
done

echo -e "\n✅ All admin portal files now have correct purple gradient!"
echo "Professional theme: Purple gradient (#4c1d95 → #7c3aed)"