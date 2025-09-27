# Deployment Runbook
## Insurance.SyncedUp

### Pre-Deployment Checklist

#### 1. Code Readiness (15 minutes)
- [ ] All tests passing: `npm test`
- [ ] Linting clean: `npm run lint`
- [ ] CSS builds: `npm run build`
- [ ] No console.log in new code
- [ ] Code reviewed and approved
- [ ] CHANGELOG.md updated

#### 2. Environment Check (10 minutes)
- [ ] Staging deployment successful
- [ ] Staging smoke tests passed
- [ ] Environment variables verified in Vercel dashboard
- [ ] Database migrations tested in staging
- [ ] External service integrations tested (Supabase, S3, Stripe)

#### 3. Backup & Safety (10 minutes)
- [ ] Database backup created
- [ ] Git tag created: `git tag deploy-$(date +%Y%m%d-%H%M)`
- [ ] Rollback plan reviewed
- [ ] On-call engineer identified
- [ ] Incident channel ready (#incidents in Slack)

#### 4. Monitoring & Alerts (5 minutes)
- [ ] Sentry monitoring enabled
- [ ] Health check alerts configured
- [ ] Status page updated (if applicable)
- [ ] Log aggregation working

---

### Deployment Steps

#### Via Vercel Dashboard (Recommended)

**Step 1: Merge to Main**
```bash
git checkout main
git pull origin main
git merge --no-ff feature/your-branch
git push origin main
```

**Step 2: Monitor Auto-Deploy**
1. Go to Vercel dashboard
2. Watch deployment progress
3. Wait for "Ready" status
4. Note deployment URL

**Step 3: Verify Deployment**
```bash
# Test health endpoint
curl https://your-domain.com/api/health

# Expected response:
# {"status":"healthy","timestamp":"2025-09-26T..."}

# Test authentication
curl https://your-domain.com/api/auth/verify
```

**Step 4: Smoke Tests**
- [ ] Navigate to each portal: /agent, /admin, /manager, /customer-service, /super-admin
- [ ] Verify login works
- [ ] Create test quote (agent portal)
- [ ] Check dashboard loads (admin portal)
- [ ] Verify no console errors in browser

---

### Post-Deployment Verification (15 minutes)

#### Application Health
```bash
# Check health endpoints
curl https://your-domain.com/api/health
curl https://your-domain.com/api/ready

# Expected: Both return 200 OK
```

#### Key User Flows
1. **Authentication** (2 min)
   - Login as agent
   - Login as admin
   - Login as super admin

2. **Agent Portal** (3 min)
   - Create new quote
   - View dashboard
   - Check commission data

3. **Admin Portal** (3 min)
   - View analytics
   - Manage users
   - Run reports

4. **Database Connectivity** (2 min)
   - Verify queries execute
   - Check RLS policies active
   - Confirm data isolation

#### Error Monitoring
- [ ] Check Sentry for new errors (should be zero)
- [ ] Review Vercel logs for 5xx errors
- [ ] Verify no spike in error rate

#### Performance
- [ ] API response times < 500ms (p95)
- [ ] Portal load times < 2s
- [ ] Database query times normal

---

### Rollback Procedure

#### When to Rollback
- 5xx error rate > 5%
- Critical functionality broken
- Data integrity issues
- Security vulnerability discovered

#### Rollback Steps (5 minutes)

**Via Vercel Dashboard:**
1. Go to Deployments
2. Find last known good deployment (tagged)
3. Click "..." → "Redeploy"
4. Confirm redeployment
5. Wait for "Ready" status
6. Run verification steps

**Via CLI (if dashboard unavailable):**
```bash
# Install Vercel CLI
npm i -g vercel

# Redeploy previous version
vercel rollback

# Or specific deployment
vercel rollback [deployment-url]
```

#### Post-Rollback
1. Announce rollback in #incidents
2. Run smoke tests
3. Verify error rate returned to normal
4. Document incident
5. Schedule post-mortem

---

### Database Migration Deployment

**Pre-Deployment**
```bash
# Backup production database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M).sql

# Upload to S3 (if configured)
aws s3 cp backup-*.sql s3://your-backup-bucket/
```

**Execute Migration**
```bash
# In Supabase dashboard:
1. Go to SQL Editor
2. Paste migration SQL
3. Review carefully
4. Execute
5. Verify with SELECT queries

# Example verification:
SELECT * FROM information_schema.tables WHERE table_name = 'new_table';
```

**Rollback Migration**
```sql
-- Keep rollback scripts ready
-- Example:
DROP TABLE IF EXISTS new_table;
ALTER TABLE old_table ADD COLUMN reverted_column;
```

---

### Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| On-Call Engineer | TBD | Slack: @oncall |
| Platform Lead | TBD | Phone: TBD |
| Database Admin | TBD | Email: TBD |
| Vercel Support | Vercel | support@vercel.com |
| Supabase Support | Supabase | support@supabase.com |

---

### Incident Response

#### Severity Levels

**P0 - Critical (15 min response)**
- Complete service outage
- Data loss or corruption
- Security breach
- All users affected

**P1 - High (1 hour response)**
- Major feature broken
- Significant user subset affected
- Performance degradation >50%

**P2 - Medium (4 hour response)**
- Minor feature broken
- Small user subset affected
- Workaround available

**P3 - Low (24 hour response)**
- Cosmetic issues
- Enhancement requests
- No user impact

#### Incident Steps
1. **Detect**: Alert fires or user report
2. **Assess**: Determine severity and scope
3. **Communicate**: Update status page, notify stakeholders
4. **Mitigate**: Apply quick fix or rollback
5. **Resolve**: Permanent fix deployed
6. **Review**: Post-mortem within 48 hours

---

### Monitoring Dashboards

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| Vercel Deployments | vercel.com/your-project | Deployment status |
| Sentry Errors | sentry.io/your-org | Error tracking |
| Supabase | supabase.com/dashboard | Database monitoring |
| Uptime Monitor | TBD | Availability tracking |

---

### Common Issues & Solutions

#### Issue: "Error: JWT_SECRET not set"
**Cause:** Missing environment variable
**Fix:**
1. Go to Vercel dashboard → Settings → Environment Variables
2. Add `JWT_SECRET` with secure value
3. Redeploy

#### Issue: "Authentication failed"
**Cause:** Expired JWT or session
**Fix:**
1. Check JWT_SECRET matches across environments
2. Verify cookie settings (httpOnly, secure, sameSite)
3. Clear cookies and re-login

#### Issue: "Database connection failed"
**Cause:** Supabase credentials invalid or network issue
**Fix:**
1. Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
2. Check Supabase dashboard for service status
3. Test connection: `curl $SUPABASE_URL/rest/v1/`

#### Issue: "Rate limit exceeded"
**Cause:** Too many requests from single IP
**Fix:**
1. Check if legitimate traffic spike
2. Adjust rate limits in middleware
3. Block malicious IPs if attack

---

### Post-Deployment Tasks

**Immediate (within 1 hour)**
- [ ] Monitor error rate for 1 hour
- [ ] Check performance metrics
- [ ] Verify all portals accessible
- [ ] Update deployment log

**Within 24 hours**
- [ ] Review logs for anomalies
- [ ] Analyze user behavior changes
- [ ] Document any issues encountered
- [ ] Update runbook if needed

**Within 1 week**
- [ ] Review Sentry errors
- [ ] Analyze performance trends
- [ ] Gather user feedback
- [ ] Plan next deployment

---

**Last Updated:** 2025-09-26
**Maintained By:** Platform Team
**Review Frequency:** After each major deployment