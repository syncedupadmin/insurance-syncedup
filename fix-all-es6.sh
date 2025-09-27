#!/bin/bash

# Fix all ES6 module syntax in api directory
for file in api/admin/*.js api/manager/*.js; do
  if [ -f "$file" ]; then
    # Replace ES6 imports with CommonJS require
    sed -i "s/import { \(.*\) } from '\(.*\)';/const { \1 } = require('\2');/g" "$file"
    sed -i 's/import { \(.*\) } from "\(.*\)";/const { \1 } = require("\2");/g' "$file"
    
    # Replace export default with module.exports
    sed -i 's/export default async function handler/async function handler/g' "$file"
    sed -i 's/export default function handler/function handler/g' "$file"
    
    # Add module.exports at end if handler exists but no export
    if grep -q "async function handler\|function handler" "$file" && ! grep -q "module.exports" "$file"; then
      echo "" >> "$file"
      echo "module.exports = handler;" >> "$file"
    fi
  fi
done

echo "Fixed ES6 syntax in API files"
