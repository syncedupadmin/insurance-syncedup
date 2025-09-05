# Current Supabase Database Tables & Contents
*Updated: September 4, 2025*

## 📊 EXISTING TABLES (5 Active)

### 1. **agencies** - 7 records ✅ ACTIVE & FIXED
**Purpose**: Store agency information and settings
**Structure**:
```sql
- id (UUID, Primary Key)
- name (VARCHAR) - Agency name
- code (VARCHAR) - Unique agency identifier  
- admin_email (VARCHAR) - Admin contact email
- is_active (BOOLEAN) - Active status
- settings (JSONB) - Plan, billing, features [RECENTLY FIXED]
- features (JSONB) - Feature flags
- commission_split (INTEGER) - Commission percentage (default: 20)
- pay_period (VARCHAR) - Payment frequency (monthly)
- pay_day (INTEGER) - Payment day (1-31)
- api_credentials (JSONB) - API configuration
- commission_structure (JSONB) - Commission rules
- participate_global_leaderboard (BOOLEAN) - Leaderboard participation
- is_demo (BOOLEAN) - Demo agency flag
- created_at (TIMESTAMP) - Creation date
```

**Current Records (7)**:
1. **Test Agency** (TEST001) - Professional, Active, $199/mo
2. **ABC Insurance** (ABC001) - Professional, Active, $199/mo
3. **Demo Insurance** (DEMO001) - Basic, Trial, $99/mo
4. **Perfect Agency** (PERFECTAGE) - Professional, Active, $199/mo
5. **Final Test Agency** (FINALTESTA) - Professional, Suspended, $199/mo
6. **Complete Demo Agency** (COMPLETEDE) - Basic, Trial, $99/mo
7. **Working Agency** (WORKINGAGE) - Professional, Active, $199/mo

### 2. **users** - 16 records ✅ ACTIVE & GOOD
**Purpose**: Store all user accounts across roles
**Structure**:
```sql
- id (UUID, Primary Key)
- email (VARCHAR) - Login email
- password_hash (VARCHAR) - Hashed password
- name (VARCHAR) - Full name
- role (VARCHAR) - User role (super_admin, admin, manager, customer-service, agent)
- agency_id (UUID) - Foreign key to agencies table
- agent_code (VARCHAR) - Agent identifier
- partner_id (UUID) - Partner reference
- is_active (BOOLEAN) - Active status
- commission_rate (DECIMAL) - Individual commission rate
- must_change_password (BOOLEAN) - Force password change
- login_count (INTEGER) - Login tracking
- last_login (TIMESTAMP) - Last login time
- last_password_change (TIMESTAMP) - Password change tracking
- show_on_global_leaderboard (BOOLEAN) - Leaderboard visibility
- personal_dashboard (BOOLEAN) - Personal dashboard access
- is_demo (BOOLEAN) - Demo user flag
- created_at (TIMESTAMP) - Creation date
```

**User Breakdown by Role**:
- **1 super_admin**: super@syncedup.com (Super Admin)
- **3+ admin**: Various agency admins
- **1+ manager**: Management level users
- **1+ customer-service**: Customer service reps
- **8+ agent**: Sales agents
- **1+ other**: Various test accounts

### 3. **portal_sales** - 0 records ⚠️ EMPTY TABLE
**Purpose**: Store sales transactions from the portal
**Current Status**: EXISTS BUT NO SCHEMA DEFINED
**Schema Needed**:
```sql
- id (UUID, Primary Key) - MISSING
- agency_id (UUID, FK to agencies) - MISSING  
- agent_id (UUID, FK to users) - MISSING
- customer_id (UUID, FK to customers) - MISSING
- sale_number (VARCHAR) - MISSING
- product_type (VARCHAR) - MISSING
- premium_amount (DECIMAL) - MISSING
- commission_amount (DECIMAL) - MISSING
- sale_date (DATE) - MISSING
- policy_number (VARCHAR) - MISSING
- customer_name (VARCHAR) - MISSING
- status (VARCHAR) - MISSING
- created_at (TIMESTAMP) - MISSING
```
**Action Required**: Add columns to define proper schema

### 4. **commissions** - 0 records ⚠️ EMPTY TABLE
**Purpose**: Track commission calculations and payments
**Current Status**: EXISTS BUT NO SCHEMA DEFINED  
**Schema Needed**:
```sql
- id (UUID, Primary Key) - MISSING
- agency_id (UUID, FK to agencies) - MISSING
- agent_id (UUID, FK to users) - MISSING
- sale_id (UUID, FK to portal_sales) - MISSING
- commission_type (VARCHAR) - MISSING
- base_amount (DECIMAL) - MISSING
- commission_rate (DECIMAL) - MISSING
- commission_amount (DECIMAL) - MISSING
- status (VARCHAR) - MISSING
- payment_date (DATE) - MISSING
- created_at (TIMESTAMP) - MISSING
```
**Action Required**: Add columns to define proper schema

### 5. **audit_logs** - 6 records ✅ ACTIVE & GOOD
**Purpose**: Track system activities and changes
**Structure**:
```sql
- id (UUID, Primary Key)
- agency_id (UUID, FK to agencies) - Agency context
- user_id (UUID, FK to users) - Acting user
- action (VARCHAR) - Action performed (CREATE, UPDATE, DELETE)
- resource_type (VARCHAR) - Affected resource type (agency, user, etc.)
- resource_id (UUID) - Affected resource identifier
- changes (JSONB) - Details of changes made
- ip_address (VARCHAR) - Request IP address
- user_agent (TEXT) - Browser/client info
- created_at (TIMESTAMP) - Activity timestamp
```

**Current Records (6)**:
- 3 agency creation logs
- 3 user creation logs
- All from August 29, 2025 (initial system setup)

## ❌ MISSING TABLES (7) - DESIGNED BUT NOT CREATED

### Critical Missing Tables:
1. **leads** - Customer lead management
2. **quotes** - Insurance quote management  
3. **customers** - Customer information storage

### Analytics Missing Tables:
4. **performance_metrics** - General performance tracking
5. **user_sessions** - Session management and tracking
6. **team_performance** - Team-level analytics
7. **agent_performance** - Individual agent analytics

**Status**: Complete SQL schema available in `database-schema-updates.sql`

## 🔗 TABLE RELATIONSHIPS

### Current Relationships:
- **users.agency_id** → **agencies.id** (Many users per agency)
- **audit_logs.agency_id** → **agencies.id** (Audit trail per agency)
- **audit_logs.user_id** → **users.id** (Track acting user)

### Missing Relationships (When Tables Created):
- **leads.agency_id** → **agencies.id**
- **quotes.agency_id** → **agencies.id**
- **customers.agency_id** → **agencies.id**
- **portal_sales.agency_id** → **agencies.id**
- **commissions.agency_id** → **agencies.id**

## 📈 TABLE USAGE STATISTICS

### Active Tables (Contains Data):
- **agencies**: 7 records - ACTIVELY USED ✅
- **users**: 16 records - ACTIVELY USED ✅  
- **audit_logs**: 6 records - ACTIVELY USED ✅

### Inactive Tables (No Data):
- **portal_sales**: 0 records - NEEDS SCHEMA ⚠️
- **commissions**: 0 records - NEEDS SCHEMA ⚠️

### Missing Tables:
- **leads**: NOT CREATED ❌
- **quotes**: NOT CREATED ❌
- **customers**: NOT CREATED ❌
- **performance_metrics**: NOT CREATED ❌
- **user_sessions**: NOT CREATED ❌
- **team_performance**: NOT CREATED ❌
- **agent_performance**: NOT CREATED ❌

## 🎯 SUMMARY

**Total Tables**: 5 exist, 7 missing
**Active Tables**: 3 with data
**Empty Tables**: 2 (need schema)
**Records Total**: 29 records across active tables

**Key Status**: 
- ✅ Core functionality working (agencies, users, audit_logs)
- ⚠️ Sales tracking incomplete (portal_sales, commissions need schema)
- ❌ Lead management missing (leads, quotes, customers not created)
- ❌ Analytics missing (performance tables not created)