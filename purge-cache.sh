#!/bin/bash
# Purge Vercel cache by adding a dummy file to force new build hash
echo "// Cache bust $(date +%s)" >> public/_admin/cache-bust-$(date +%s).txt
