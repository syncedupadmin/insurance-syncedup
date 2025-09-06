# Supabase Database Cleanup Plan
*Generated: 2025-09-04*

## Current Database Status

### ✅ Existing Tables (5):
1. **agencies** - 7 records, well-structured
2. **users** - 16 records, well-structured  
3. **portal_sales** - 0 records, empty table
4. **commissions** - 0 records, empty table
5. **audit_logs** - 6 records, well-structured

### ❌ Missing Tables (7):
- leads
- quotes
- customers
- performance_metrics
- user_sessions
- team_performance
- agent_performance

## Issues Identified

### 1. Naming Inconsistencies
- **agencies.settings** - Empty object, should contain plan_type, status, monthly_revenue
- **users.name** - Single field instead of firstName/lastName split
- **users.password_hash** - Should be just "password" for consistency
- **users.agency_id** - Good UUID relationship field

### 2. Missing Critical Tables
- **leads** - Referenced in manager portal but doesn't exist
- **quotes** - Referenced in agent portal but doesn't exist  
- **customers** - Referenced throughout but doesn't exist
- **performance_metrics** - Needed for analytics
- **user_sessions** - Needed for session management
- **team_performance** - Referenced in manager analytics
- **agent_performance** - Referenced in admin analytics

### 3. Empty Tables
- **portal_sales** - Exists but empty, needs proper schema
- **commissions** - Exists but empty, needs proper schema

### 4. Data Inconsistencies
- **agencies.settings** - All records have empty {} settings objects
- **users.agent_code** - Some empty strings vs nulls
- **users.commission_rate** - All null values

## Cleanup Actions Required

### Phase 1: Fix Existing Table Structures
1. **Update agencies.settings** - Populate with proper plan/status data
2. **Standardize users table** - Fix naming inconsistencies
3. **Define portal_sales schema** - Add proper columns
4. **Define commissions schema** - Add proper columns

### Phase 2: Create Missing Tables  
1. **leads** - Customer lead management
2. **quotes** - Insurance quote management
3. **customers** - Customer information management
4. **performance_metrics** - Agent/team performance tracking
5. **user_sessions** - Session management
6. **team_performance** - Team analytics
7. **agent_performance** - Individual agent analytics

### Phase 3: Data Migration & Cleanup
1. Migrate existing agency data to proper settings format
2. Clean up user data inconsistencies
3. Establish proper foreign key relationships
4. Add proper indexes for performance

### Phase 4: API & Frontend Updates
1. Update all API endpoints to match new schema
2. Update frontend components to use new field names
3. Update authentication and session handling
4. Test all CRUD operations

## Implementation Priority
1. **HIGH**: Fix agencies table settings structure (breaks agency creation)
2. **HIGH**: Create missing core tables (leads, quotes, customers)
3. **MEDIUM**: Standardize user table fields
4. **MEDIUM**: Define proper portal_sales/commissions schemas
5. **LOW**: Create analytics tables (performance metrics)