# Complete Test Environment Setup Instructions

## Overview
This guide will set up a complete test environment with a test agency, all user roles, and comprehensive test data.

## 🚀 Quick Setup

### Step 1: Database Setup
1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `setup-complete-test-environment.sql` 
4. Execute the entire script

### Step 2: Verify Setup
After running the SQL script, you should have:

#### ✅ Test Agency Created
- **Agency ID**: TEST-001  
- **Name**: Test Agency Inc
- **Status**: active
- **Plan**: enterprise

#### ✅ Test Users Created (Password: TestPass123!)

| Email | Role | Agency ID | UUID |
|-------|------|-----------|------|
| test-admin@test.com | admin | TEST-001 | 11111111-1111-1111-1111-111111111111 |
| test-manager@test.com | manager | TEST-001 | 22222222-2222-2222-2222-222222222222 |
| test-agent@test.com | agent | TEST-001 | 33333333-3333-3333-3333-333333333333 |
| test-cs@test.com | customer_service | TEST-001 | 44444444-4444-4444-4444-444444444444 |
| test-super@test.com | super_admin | (none) | 55555555-5555-5555-5555-555555555555 |

#### ✅ Test Data Created
- **5 Products** (Auto Basic, Auto Premium, Home, Life Term, Health)
- **10 Sales** ($24,350 total premium, $951 total commission)
- **10 Commissions** (some paid, some pending)
- **5 Customers** with complete contact info
- **10 Leads** from various sources
- **4 Goals** for agents and teams
- **3 Convoso leads** from campaigns
- **3 Customer service cases**
- **Sample settings and alerts**

#### ✅ Database Tables Created
All missing tables that APIs expected:
- ✅ `products`
- ✅ `commission_settings` 
- ✅ `portal_goals`
- ✅ `convoso_leads`
- ✅ `webhook_logs`
- ✅ `lead_analytics`
- ✅ `customer_service_cases`
- ✅ `portal_api_keys`
- ✅ `portal_settings`
- ✅ `system_alerts`
- ✅ `chargebacks` (real table, not mock data)
- ✅ `cancellations` (real table, not mock data)

## 🔐 Testing Login

### Updated Login Page
The login page now includes a "Quick Test Login" dropdown with all test accounts:

1. Go to `/login.html`
2. Click the flask icon to expand test accounts
3. Select any role from the dropdown
4. Credentials auto-fill (email + password)
5. Click "Sign In"

### Expected Behavior by Role

**Test Admin (test-admin@test.com)**
- Access to admin dashboard
- Can manage users, view analytics
- See all agency data

**Test Manager (test-manager@test.com)**  
- Access to manager dashboard
- Can view team performance
- See team sales and goals

**Test Agent (test-agent@test.com)**
- Access to agent dashboard
- Can view personal sales/commissions
- See assigned leads and goals

**Test Customer Service (test-cs@test.com)**
- Access to CS dashboard
- Can view customer service cases
- Handle customer inquiries

**Test Super Admin (test-super@test.com)**
- Access to super admin panel
- Can manage multiple agencies
- System-wide administration

## 📊 Verify Data with APIs

### Test API Endpoints
With your test data, you can now verify these APIs work:

```bash
# Dashboard data
GET /api/dashboard  (as test-agent@test.com)
GET /api/manager/dashboard  (as test-manager@test.com)

# Sales data  
GET /api/sales  (should show 10 sales)

# Commission data
GET /api/commissions  (should show commission records)

# User management
GET /api/admin/users  (as admin, should show 5 users)

# Agency data
GET /api/super-admin/agencies  (as super admin)
```

## 🔧 What Was Fixed

### Database Issues Resolved
1. **Table Name Conflicts**: Created proper tables that align with API usage
2. **Missing Tables**: Added all 12+ tables that APIs expected but didn't exist
3. **Mock Data**: Replaced mock data APIs with real database tables
4. **RLS Alignment**: Tables now match what RLS policies expect

### API-Database Mapping Now Working
Before:
- ❌ 15+ APIs querying non-existent tables
- ❌ Chargebacks/cancellations returning mock data only
- ❌ RLS policies for wrong table names

After:
- ✅ All API-referenced tables exist with proper schemas
- ✅ Real data persistence for all business functions
- ✅ Table names align between APIs and security policies

## 🎯 Next Steps

1. **Test Each Role**: Login with each test account and verify functionality
2. **API Testing**: Use the test data to verify all endpoints work
3. **Data Validation**: Ensure calculations (commissions, goals, etc.) are correct
4. **Error Handling**: Test edge cases with the new data structure
5. **Performance**: Monitor query performance with the new indexes

## 🚨 Production Notes

**IMPORTANT**: This is TEST DATA ONLY
- All test accounts use obvious test emails
- Passwords are the same for all test accounts
- Data is clearly marked as test data
- Remove or disable test accounts before production deployment

## 📋 Verification Checklist

- [ ] SQL script executed successfully
- [ ] All 5 test users can login
- [ ] Dashboard shows correct data for each role
- [ ] Sales API returns 10 test sales
- [ ] Commission calculations are correct
- [ ] Test account dropdown works on login page
- [ ] Role-based redirects work properly
- [ ] No API errors in browser console

---

**Success**: You now have a complete test environment with realistic data to verify all functionality works end-to-end! 🎉