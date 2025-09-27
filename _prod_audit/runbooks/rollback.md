# Rollback Runbook
## Insurance.SyncedUp

### When to Execute Rollback

Execute rollback immediately if:
- ✅ 5xx error rate exceeds 5% for >2 minutes
- ✅ Critical feature completely broken (auth, quotes, commissions)
- ✅ Data corruption detected
- ✅ Security vulnerability actively exploited
- ✅ Performance degradation >70% for >5 minutes

**Do NOT rollback for:**
- ❌ Cosmetic issues
- ❌ Minor bugs with workarounds
- ❌ Single user complaints
- ❌ Non-critical feature issues

---

### Pre-Rollback Assessment (2 minutes)

1. **Confirm Issue**
   - Check error dashboards (Sentry)
   - Review recent deployment changes
   - Verify issue affects multiple users
   - Document symptoms

2. **Identify Last Known Good**
   ```bash
   # Find last successful deployment
   git log --oneline -10

   # Verify deployment tag
   git tag | grep deploy | tail -5
   ```

3. **Notify Stakeholders**
   - Post in #incidents: "Rolling back deployment due to [issue]"
   - Update status page (if exists)
   - Alert on-call engineer

---

### Application Rollback

#### Method 1: Vercel Dashboard (Fastest - 2 minutes)

**Steps:**
1. Open Vercel dashboard: https://vercel.com/your-project
2. Navigate to "Deployments" tab
3. Locate last successful deployment (marked "Production" before current)
4. Click "..." menu on that deployment
5. Click "Redeploy"
6. Confirm: "Yes, redeploy"
7. Wait for deployment status: "Ready"

**Verification:**
```bash
# Test health endpoint
curl https://your-domain.com/api/health

# Should return:
# {"status":"healthy","timestamp":"..."}
```

---

#### Method 2: Vercel CLI (If dashboard unavailable - 3 minutes)

**Prerequisites:**
```bash
npm install -g vercel
vercel login
```

**Rollback Steps:**
```bash
# List recent deployments
vercel list

# Output example:
# deployment-abc123.vercel.app (Production) - 5 min ago
# deployment-xyz789.vercel.app (Previous)  - 2 hours ago

# Rollback to previous
vercel rollback

# Or specific deployment
vercel rollback deployment-xyz789.vercel.app
```

**Monitor:**
```bash
# Watch deployment progress
vercel logs --follow

# Expected: No 5xx errors, normal traffic
```

---

#### Method 3: Git Revert + Redeploy (If Methods 1-2 fail - 5 minutes)

```bash
# 1. Identify bad commit
git log --oneline -5

# 2. Revert the commit (creates new commit)
git revert <commit-hash> --no-edit

# 3. Push to trigger deployment
git push origin main

# 4. Monitor Vercel auto-deploy
# Dashboard will show new deployment starting
```

---

### Database Rollback

**⚠️ WARNING:** Database rollback is high-risk. Only perform if absolutely necessary.

#### When Database Rollback is Needed
- Schema changes caused errors
- Data corruption from migration
- Irreversible data changes

#### Rollback Steps (10-15 minutes)

**Step 1: Stop Application (Optional but Recommended)**
```bash
# Temporarily redirect to maintenance page
# In Vercel dashboard: Set up redirect rule
# OR: Pause deployments
```

**Step 2: Restore from Backup**
```bash
# Locate backup file (created before deployment)
ls -lh backup-*.sql | tail -1

# Example: backup-20250926-1430.sql

# Restore via Supabase dashboard:
# 1. Go to Database → Backups
# 2. Upload backup file
# 3. Click "Restore"
# 4. Confirm restoration
```

**Alternative: Manual Restore**
```bash
# If backup was made via pg_dump
pg_restore --clean --no-owner --no-acl \
  -d $DATABASE_URL \
  backup-20250926-1430.sql

# Or for .sql format:
psql $DATABASE_URL < backup-20250926-1430.sql
```

**Step 3: Verify Data Integrity**
```sql
-- Check critical tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Verify row counts
SELECT
  'profiles' as table, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'quotes', COUNT(*) FROM quotes
UNION ALL
SELECT 'commissions', COUNT(*) FROM commissions;

-- Expected: Counts match pre-migration values
```

**Step 4: Test Queries**
```sql
-- Test authentication
SELECT id, email, role FROM profiles LIMIT 5;

-- Test agency isolation
SELECT * FROM profiles WHERE agency_id = 'test-agency';

-- Test RLS policies
SET app.user_id = 'test-user-id';
SELECT * FROM quotes WHERE agent_id = 'test-agent';
```

**Step 5: Resume Application**
```bash
# Trigger redeployment (if paused)
# Or remove maintenance redirect
```

---

### Verification After Rollback (10 minutes)

#### 1. Health Checks
```bash
# API health
curl https://your-domain.com/api/health
# Expected: 200 OK

# Readiness
curl https://your-domain.com/api/ready
# Expected: 200 OK
```

#### 2. Critical Workflows

**Authentication (2 min)**
- [ ] Login as agent → Success
- [ ] Login as admin → Success
- [ ] Logout → Success
- [ ] Invalid credentials rejected

**Agent Portal (3 min)**
- [ ] Dashboard loads
- [ ] Create quote works
- [ ] View commissions works
- [ ] Customer search works

**Admin Portal (2 min)**
- [ ] Analytics load
- [ ] User management accessible
- [ ] Reports generate

**Database Queries (2 min)**
```bash
# Test API endpoints that hit database
curl -H "Cookie: auth-token=..." \
  https://your-domain.com/api/agent/dashboard

# Expected: 200 OK with data
```

#### 3. Error Rate
- [ ] Sentry error count dropped to pre-deployment levels
- [ ] Vercel logs show no 5xx spikes
- [ ] No user reports of continued issues

#### 4. Performance
- [ ] API response times p95 < 500ms
- [ ] Portal load times < 2s
- [ ] Database query times normal

---

### Post-Rollback Actions

#### Immediate (0-30 minutes)
1. **Announce Resolution**
   ```
   #incidents channel:
   "Rollback complete. Service restored to stable state.
   Issue: [describe]
   Root cause: [if known]
   Monitoring: [dashboard links]"
   ```

2. **Monitor Closely**
   - Watch error dashboards for 30 minutes
   - Check user reports
   - Verify metrics stable

3. **Update Status Page**
   - Mark incident as resolved
   - Post timeline of events

#### Within 2 Hours
4. **Document Incident**
   ```markdown
   ## Incident Report: [Date] [Time]

   **Severity:** P0/P1/P2
   **Duration:** [start] to [end]
   **Impact:** [users affected, features broken]

   ### Timeline
   - 14:30 - Deployment started
   - 14:35 - Error rate spike detected
   - 14:37 - Rollback initiated
   - 14:40 - Rollback complete
   - 14:45 - Service verified stable

   ### Root Cause
   [What went wrong]

   ### Resolution
   [What was done]

   ### Action Items
   - [ ] Fix underlying bug
   - [ ] Add test coverage
   - [ ] Update deployment checklist
   ```

5. **Create Bug Ticket**
   - Document exact error
   - Include logs/screenshots
   - Assign to responsible team

#### Within 24 Hours
6. **Post-Mortem Meeting**
   - Review incident timeline
   - Identify root cause
   - Create action items to prevent recurrence

7. **Update Runbooks**
   - Document new failure mode
   - Add detection steps
   - Improve rollback procedures

---

### Rollback Failure Scenarios

#### Scenario 1: Vercel Deployment Stuck

**Symptoms:** Deployment says "Building..." for >10 minutes

**Actions:**
1. Cancel deployment in Vercel dashboard
2. Try Method 2 (CLI rollback)
3. Contact Vercel support if issue persists
4. Use git revert + manual redeploy

#### Scenario 2: Database Restore Fails

**Symptoms:** pg_restore returns errors

**Actions:**
1. Check backup file integrity: `pg_restore --list backup.sql`
2. Try alternative backup (if multiple exist)
3. Restore specific tables only (if full restore fails)
4. Contact Supabase support for assistance

**Partial Restore:**
```bash
# Restore specific tables
pg_restore -t profiles -t quotes backup.sql
```

#### Scenario 3: Both App and Database Need Rollback

**Order of Operations:**
1. Rollback application FIRST (stops bad code from running)
2. Assess database state
3. Rollback database SECOND (if needed)
4. Test thoroughly before resuming

#### Scenario 4: Can't Access Vercel Dashboard

**Actions:**
1. Use Vercel CLI (Method 2)
2. Use git revert (Method 3)
3. Contact Vercel support via email
4. Check Vercel status page: https://www.vercel-status.com/

---

### Prevention Checklist

To reduce need for rollbacks:
- [ ] Always deploy to staging first
- [ ] Run comprehensive tests before production
- [ ] Use feature flags for risky changes
- [ ] Deploy during low-traffic windows
- [ ] Have on-call engineer ready
- [ ] Keep recent backups (automated)
- [ ] Monitor error rates during deployment
- [ ] Use canary deployments (gradual rollout)

---

### Rollback Decision Matrix

| Error Rate | User Impact | Action |
|------------|-------------|--------|
| <1% | Low | Monitor, patch forward |
| 1-5% | Medium | Consider rollback, investigate |
| 5-10% | High | **Rollback immediately** |
| >10% | Critical | **Rollback immediately** + incident |

| Feature | Severity | Action |
|---------|----------|--------|
| Cosmetic bug | Low | Patch forward |
| Minor feature broken | Medium | Rollback if quick, else hotfix |
| Major feature broken | High | **Rollback immediately** |
| Authentication broken | Critical | **Rollback immediately** |
| Data corruption | Critical | **Rollback immediately** + DB restore |

---

### Contact Information

| Emergency | Contact |
|-----------|---------|
| On-Call Engineer | Slack: @oncall |
| Platform Lead | [Phone] |
| Vercel Support | support@vercel.com |
| Supabase Support | support@supabase.com |

---

### Appendix: Quick Commands

```bash
# Health check
curl https://your-domain.com/api/health

# Check recent deployments
vercel list

# Rollback via CLI
vercel rollback

# View logs
vercel logs --follow

# Git revert
git revert <commit-hash>
git push origin main

# Database backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M).sql

# Database restore
psql $DATABASE_URL < backup.sql
```

---

**Last Updated:** 2025-09-26
**Owner:** Platform Team
**Review:** After each rollback event