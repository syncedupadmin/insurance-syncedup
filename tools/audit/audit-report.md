# 🔍 Insurance Portal Audit Report

Generated: 9/22/2025, 10:39:29 PM

## 📊 Summary

| Metric | Value |
|--------|-------|
| Portals Checked | 7 |
| URLs Visited | 7 |
| **Total Errors** | **161** |
| Page Errors | 5 |
| Console Errors | 46 |
| Network Failures | 80 |
| Action Errors | 30 |

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
| `api/auth/verify` | 24 |  |
| `api/manager/dashboard` | 3 |  |
| `api/admin/leads` | 2 |  |
| `_admin/` | 2 | `_admin/:601` |
| `api/admin/commission-summary` | 2 |  |
| `api/super-admin/revenue-metrics` | 2 |  |
| `customer-service/components/global-header.js` | 1 |  |
| `customer-service/components/navigation.js` | 1 |  |
| `leaderboard/css/leaderboard-base.css` | 1 |  |
| `leaderboard/js/leaderboard-theme.js` | 1 |  |
| `api/leaderboard/global` | 1 |  |
| `_leaderboard/` | 1 | `_leaderboard/:186` |
| `leaderboard/css/themes/competition.css` | 1 |  |
| `manager/components/navigation.js` | 1 |  |
| `manager/components/global-header.js` | 1 |  |
| `_manager/` | 1 | `_manager/:187` |
| `_super-admin/js/main.js` | 1 | `_super-admin/js/main.js:2843` |
| `_admin/js/dashboard.js` | 1 | `_admin/js/dashboard.js:336` |
| `HTMLDocument.<anonymous> (http://localhost:3002/_customer-service/` | 1 | `HTMLDocument.<anonymous> (http://localhost:3002/_customer-service/:47` |
| `_manager/js/dashboard.js` | 1 | `_manager/js/dashboard.js:313` |
| `HTMLDocument.<anonymous> (http://localhost:3002/_manager/` | 1 | `HTMLDocument.<anonymous> (http://localhost:3002/_manager/:400` |

## ❌ Console Errors

| File:Line | Error Message |
|-----------|--------------|
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/manager/dashboard | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/manager/dashboard | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/admin/leads | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| `_admin/:601` | Error loading recent leads: Error: Failed to fetch recent leads
    at loadRecentLeads (http://local... |
| api/admin/commission-summary | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/admin/leads | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| `_admin/:601` | Error loading recent leads: Error: Failed to fetch recent leads
    at loadRecentLeads (http://local... |
| api/admin/commission-summary | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| customer-service/components/global-header.js | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| customer-service/components/navigation.js | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| leaderboard/css/leaderboard-base.css | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| leaderboard/js/leaderboard-theme.js | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/leaderboard/global | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| `_leaderboard/:186` | Error loading leaderboard: Error: HTTP 404: Failed to load leaderboard data
    at loadLeaderboardDa... |
| leaderboard/css/themes/competition.css | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| manager/components/navigation.js | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| manager/components/global-header.js | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/manager/dashboard | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| `_manager/:187` | Dashboard API: non-JSON... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/super-admin/revenue-metrics | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/auth/verify | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| api/super-admin/revenue-metrics | Failed to load resource: the server responded with a status of 404 (Not Found)... |
| `_super-admin/js/main.js:2843` | Silent fetch error: Error: HTTP error! status: 404
    at silentFetch (http://localhost:3002/_super-... |

## 🌐 Network Failures

| URL | Method | Status | Error |
|-----|--------|--------|-------|
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/manager/dashboard` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/api/manager/dashboard` | GET | - | - |
| `http://localhost:3002/api/manager/dashboard` | GET | 404 | Not Found |
| `http://localhost:3002/api/admin/leads?recent=true&limit=10` | GET | 404 | Not Found |
| `http://localhost:3002/api/admin/commission-summary` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/api/manager/dashboard` | GET | - | - |
| `http://localhost:3002/api/admin/leads?recent=true&limit=10` | GET | - | - |
| `http://localhost:3002/api/admin/commission-summary` | GET | - | - |
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/api/admin/leads?recent=true&limit=10` | GET | 404 | Not Found |
| `http://localhost:3002/api/admin/commission-summary` | GET | 404 | Not Found |
| `http://localhost:3002/api/admin/leads?recent=true&limit=10` | GET | - | - |
| `http://localhost:3002/api/admin/commission-summary` | GET | - | - |
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/customer-service/components/global-header.js` | GET | 404 | Not Found |
| `http://localhost:3002/customer-service/components/global-header.js` | GET | - | - |
| `http://localhost:3002/customer-service/components/navigation.js` | GET | 404 | Not Found |
| `http://localhost:3002/customer-service/components/navigation.js` | GET | - | - |
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/leaderboard/css/leaderboard-base.css` | GET | 404 | Not Found |
| `http://localhost:3002/leaderboard/css/leaderboard-base.css` | GET | - | - |
| `http://localhost:3002/leaderboard/js/leaderboard-theme.js` | GET | 404 | Not Found |
| `http://localhost:3002/leaderboard/js/leaderboard-theme.js` | GET | - | - |
| `http://localhost:3002/api/leaderboard/global` | GET | 404 | Not Found |
| `http://localhost:3002/leaderboard/css/themes/competition.css` | GET | 404 | Not Found |
| `http://localhost:3002/leaderboard/css/themes/competition.css` | GET | - | - |
| `http://localhost:3002/manager/components/navigation.js` | GET | 404 | Not Found |
| `http://localhost:3002/manager/components/navigation.js` | GET | - | - |
| `http://localhost:3002/manager/components/global-header.js` | GET | 404 | Not Found |
| `http://localhost:3002/manager/components/global-header.js` | GET | - | - |
| `https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.css` | GET | - | - |
| `http://localhost:3002/api/manager/dashboard?timeframe=month` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/super-admin/revenue-metrics` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/api/auth/verify` | GET | 404 | Not Found |
| `http://localhost:3002/api/auth/verify` | GET | - | - |
| `http://localhost:3002/api/super-admin/revenue-metrics` | GET | 404 | Not Found |
| `http://localhost:3002/api/super-admin/revenue-metrics` | GET | - | - |

## ⚠️ Page Errors

| Portal | File:Line | Error |
|--------|-----------|-------|
| - | `http://localhost:3002/_admin/js/dashboard.js:336` | updateRefreshInterval is not defined... |
| - | `HTMLDocument.<anonymous> (http://localhost:3002/_customer-service/:47` | CSHeader is not defined... |
| - | `http://localhost:3002/_manager/js/dashboard.js:313` | updateRefreshInterval is not defined... |
| - | `HTMLDocument.<anonymous> (http://localhost:3002/_manager/:400` | ManagerHeader is not defined... |
| Super Admin Portal | - | page.$$: Target page, context or browser has been closed... |

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
