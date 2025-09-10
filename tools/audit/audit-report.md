# 🔍 Insurance Portal Audit Report

Generated: 9/10/2025, 1:49:58 PM

## 📊 Summary

| Metric | Value |
|--------|-------|
| Portals Checked | 7 |
| URLs Visited | 7 |
| **Total Errors** | **107** |
| Page Errors | 0 |
| Console Errors | 40 |
| Network Failures | 62 |
| Action Errors | 5 |

## 📍 Portal Status

| Portal | Path | Status |
|--------|------|--------|
| Login Portal | `/login.html` | ✅ Visited |
| Admin Portal | `/_admin/` | ✅ Visited |
| Agent Portal | `/_agent/` | ✅ Visited |
| Customer Service Portal | `/_customer-service/` | ✅ Visited |
| Leaderboard Portal | `/_leaderboard/` | ✅ Visited |
| Manager Portal | `/_manager/` | ✅ Visited |
| Super Admin Portal | `/_super-admin/` | ✅ Visited |

## 🔴 Suspect Files with Errors

| File | Errors | File:Line References |
|------|--------|---------------------|
| `api/super-admin/audit` | 7 |  |
| `_super-admin/` | 6 | `_super-admin/:949` |
| `api/auth/verify` | 4 |  |
| `api/manager/dashboard` | 3 |  |
| `api/admin/analytics` | 2 |  |
| `api/admin/user-management` | 2 |  |
| `api/admin/commission-settings` | 2 |  |
| `api/admin/api-keys` | 2 |  |
| `api/admin/leads` | 2 |  |
| `_admin/` | 2 | `_admin/:655` |
| `api/admin/commission-summary` | 2 |  |
| `leaderboard/css/leaderboard-base.css` | 1 |  |
| `leaderboard/js/leaderboard-theme.js` | 1 |  |
| `_manager/` | 1 | `_manager/:223` |
| `api/super-admin/health` | 1 |  |
| `api/super-admin/performance` | 1 |  |
| `api/super-admin/metrics` | 1 |  |

## ❌ Console Errors

| File:Line | Error Message |
|-----------|--------------|
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/manager/dashboard | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/admin/analytics | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/admin/user-management | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/admin/commission-settings | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/admin/api-keys | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/manager/dashboard | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/admin/analytics | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/admin/user-management | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/admin/commission-settings | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/admin/api-keys | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/admin/leads | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| `_admin/:655` | Error loading recent leads: Error: Failed to fetch recent leads
    at loadRecentLeads (http://local... |
| api/admin/commission-summary | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/admin/leads | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| `_admin/:655` | Error loading recent leads: Error: Failed to fetch recent leads
    at loadRecentLeads (http://local... |
| api/admin/commission-summary | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| leaderboard/css/leaderboard-base.css | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| leaderboard/js/leaderboard-theme.js | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/manager/dashboard | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| `_manager/:223` | Dashboard API: non-JSON... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/super-admin/audit | Failed to load resource: the server responded with a status of 405 (Method Not Allowed)... |
| `_super-admin/:949` | CRITICAL: Audit logging failed: Error: Audit logging failed: 405
    at logAdminAction (http://local... |
| api/super-admin/audit | Failed to load resource: the server responded with a status of 405 (Method Not Allowed)... |
| `_super-admin/:949` | CRITICAL: Audit logging failed: Error: Audit logging failed: 405
    at logAdminAction (http://local... |
| api/super-admin/health | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/super-admin/performance | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/super-admin/audit | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/super-admin/audit | Failed to load resource: the server responded with a status of 405 (Method Not Allowed)... |
| `_super-admin/:949` | CRITICAL: Audit logging failed: Error: Audit logging failed: 405
    at logAdminAction (http://local... |
| api/super-admin/metrics | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/super-admin/audit | Failed to load resource: the server responded with a status of 405 (Method Not Allowed)... |
| `_super-admin/:949` | CRITICAL: Audit logging failed: Error: Audit logging failed: 405
    at logAdminAction (http://local... |
| api/super-admin/audit | Failed to load resource: the server responded with a status of 405 (Method Not Allowed)... |
| `_super-admin/:949` | CRITICAL: Audit logging failed: Error: Audit logging failed: 405
    at logAdminAction (http://local... |
| api/super-admin/audit | Failed to load resource: the server responded with a status of 405 (Method Not Allowed)... |
| `_super-admin/:949` | CRITICAL: Audit logging failed: Error: Audit logging failed: 405
    at logAdminAction (http://local... |

## 🌐 Network Failures

| URL | Method | Status | Error |
|-----|--------|--------|-------|
| `http://localhost:3001/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3001/api/manager/dashboard` | GET | 404 | Not Found |
| `http://localhost:3001/api/admin/analytics?analytics_type=overview` | GET | 404 | Not Found |
| `http://localhost:3001/api/admin/user-management` | GET | 404 | Not Found |
| `http://localhost:3001/api/admin/commission-settings` | GET | 404 | Not Found |
| `http://localhost:3001/api/admin/api-keys` | GET | 404 | Not Found |
| `http://localhost:3001/api/auth/verify` | GET | - | - |
| `http://localhost:3001/api/manager/dashboard` | GET | - | - |
| `http://localhost:3001/api/manager/dashboard` | GET | 404 | Not Found |
| `http://localhost:3001/api/admin/analytics?analytics_type=overview` | GET | 404 | Not Found |
| `http://localhost:3001/api/admin/user-management` | GET | 404 | Not Found |
| `http://localhost:3001/api/admin/commission-settings` | GET | 404 | Not Found |
| `http://localhost:3001/api/admin/api-keys` | GET | 404 | Not Found |
| `http://localhost:3001/api/admin/analytics?analytics_type=overview` | GET | - | - |
| `http://localhost:3001/api/admin/user-management` | GET | - | - |
| `http://localhost:3001/api/admin/commission-settings` | GET | - | - |
| `http://localhost:3001/api/admin/api-keys` | GET | - | - |
| `http://localhost:3001/api/manager/dashboard` | GET | - | - |
| `http://localhost:3001/api/admin/analytics?analytics_type=overview` | GET | - | - |
| `http://localhost:3001/api/admin/user-management` | GET | - | - |
| `http://localhost:3001/api/admin/commission-settings` | GET | - | - |
| `http://localhost:3001/api/admin/api-keys` | GET | - | - |
| `http://localhost:3001/api/admin/leads?recent=true&limit=10` | GET | 404 | Not Found |
| `http://localhost:3001/api/admin/leads?recent=true&limit=10` | GET | - | - |
| `http://localhost:3001/api/admin/commission-summary` | GET | 404 | Not Found |
| `http://localhost:3001/api/admin/commission-summary` | GET | - | - |
| `http://localhost:3001/api/admin/leads?recent=true&limit=10` | GET | 404 | Not Found |
| `http://localhost:3001/api/admin/leads?recent=true&limit=10` | GET | - | - |
| `http://localhost:3001/api/admin/commission-summary` | GET | 404 | Not Found |
| `http://localhost:3001/api/admin/commission-summary` | GET | - | - |
| `http://localhost:3001/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3001/api/auth/verify` | GET | - | - |
| `http://localhost:3001/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3001/api/auth/verify` | GET | - | - |
| `http://localhost:3001/leaderboard/css/leaderboard-base.css` | GET | 404 | Not Found |
| `http://localhost:3001/leaderboard/css/leaderboard-base.css` | GET | - | - |
| `http://localhost:3001/leaderboard/js/leaderboard-theme.js` | GET | 404 | Not Found |
| `http://localhost:3001/leaderboard/js/leaderboard-theme.js` | GET | - | - |
| `https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.css` | GET | - | - |
| `http://localhost:3001/api/manager/dashboard?timeframe=month` | GET | 404 | Not Found |
| `http://localhost:3001/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3001/api/auth/verify` | GET | - | - |
| `http://localhost:3001/api/super-admin/audit` | POST | 405 | Method Not Allowed |
| `http://localhost:3001/api/super-admin/audit` | POST | - | - |
| `http://localhost:3001/api/super-admin/audit` | POST | 405 | Method Not Allowed |
| `http://localhost:3001/api/super-admin/audit` | POST | - | - |
| `http://localhost:3001/api/super-admin/health` | GET | 404 | Not Found |
| `http://localhost:3001/api/super-admin/health` | GET | - | - |
| `http://localhost:3001/api/super-admin/performance` | GET | 404 | Not Found |
| `http://localhost:3001/api/super-admin/audit?limit=10` | GET | 404 | Not Found |
| `http://localhost:3001/api/super-admin/performance` | GET | - | - |
| `http://localhost:3001/api/super-admin/audit?limit=10` | GET | - | - |
| `http://localhost:3001/api/super-admin/audit` | POST | 405 | Method Not Allowed |
| `http://localhost:3001/api/super-admin/metrics` | GET | 404 | Not Found |
| `http://localhost:3001/api/super-admin/audit` | POST | - | - |
| `http://localhost:3001/api/super-admin/metrics` | GET | - | - |
| `http://localhost:3001/api/super-admin/audit` | POST | 405 | Method Not Allowed |
| `http://localhost:3001/api/super-admin/audit` | POST | - | - |
| `http://localhost:3001/api/super-admin/audit` | POST | 405 | Method Not Allowed |
| `http://localhost:3001/api/super-admin/audit` | POST | - | - |
| `http://localhost:3001/api/super-admin/audit` | POST | 405 | Method Not Allowed |
| `http://localhost:3001/api/super-admin/audit` | POST | - | - |

## 🔧 Reproduction Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# In another terminal, run the audit
npm run audit

# Generate reports
npm run audit:report
```

## 🧪 Playwright Test Examples

Based on the errors found, here are Playwright tests to prevent regressions:

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Portal Accessibility', () => {

  test('Login Portal should load without errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    
    await page.goto('http://localhost:3001/login.html');
    await expect(page).toHaveTitle(/.*./);
    expect(consoleErrors).toHaveLength(0);
  });

  test('Admin Portal should load without errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    
    await page.goto('http://localhost:3001/_admin/');
    await expect(page).toHaveTitle(/.*./);
    expect(consoleErrors).toHaveLength(0);
  });

  test('Agent Portal should load without errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    
    await page.goto('http://localhost:3001/_agent/');
    await expect(page).toHaveTitle(/.*./);
    expect(consoleErrors).toHaveLength(0);
  });

  test('Customer Service Portal should load without errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    
    await page.goto('http://localhost:3001/_customer-service/');
    await expect(page).toHaveTitle(/.*./);
    expect(consoleErrors).toHaveLength(0);
  });

  test('Leaderboard Portal should load without errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    
    await page.goto('http://localhost:3001/_leaderboard/');
    await expect(page).toHaveTitle(/.*./);
    expect(consoleErrors).toHaveLength(0);
  });

  test('Manager Portal should load without errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    
    await page.goto('http://localhost:3001/_manager/');
    await expect(page).toHaveTitle(/.*./);
    expect(consoleErrors).toHaveLength(0);
  });

  test('Super Admin Portal should load without errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    
    await page.goto('http://localhost:3001/_super-admin/');
    await expect(page).toHaveTitle(/.*./);
    expect(consoleErrors).toHaveLength(0);
  });
});
```
