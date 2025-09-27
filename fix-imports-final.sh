#!/bin/bash
for f in api/admin/leaderboard-settings.js api/admin/payroll-export.js api/admin/users-with-email.js api/admin/agents.js api/admin/bulk-upload.js api/admin/commission-overrides.js api/admin/leads-backup.js; do
  # Fix the broken import/require lines
  sed -i "s/import { requireAuth, logAction } ('/const { requireAuth, logAction } = require('/g" "$f"
  sed -i "s/import { requireAuth } ('/const { requireAuth } = require('/g" "$f"
  sed -i "s/const { requireAuth } = require ('/const { requireAuth } = require('/g" "$f"
  sed -i "s/import { createClient } from '@supabase\/supabase-js';/const { createClient } = require('@supabase\/supabase-js');/g" "$f"
  sed -i "s/import bcrypt from 'bcryptjs';/const bcrypt = require('bcryptjs');/g" "$f"
  echo "Fixed $f"
done
