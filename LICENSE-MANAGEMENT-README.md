# License Management System Documentation

## Overview

The License Management system provides comprehensive tracking and compliance monitoring for insurance agent licenses with NIPR (National Insurance Producer Registry) integration.

## Features

### Core Functionality
- **License Tracking**: Complete license lifecycle management
- **NIPR Integration**: Sync with National Insurance Producer Registry
- **Compliance Monitoring**: Real-time compliance status tracking
- **Expiration Alerts**: Automated notifications for expiring licenses
- **Dashboard Integration**: License widgets in admin dashboard

### User Interface
- **Search & Filter**: Advanced filtering by state, type, status, agent
- **Sortable Columns**: Click column headers to sort data
- **Color-coded Rows**: Visual indication of license status
- **Bulk Actions**: Export, sync, and reminder features
- **Responsive Design**: Mobile and tablet optimized

## Database Schema

### Main Tables

#### `licenses` Table
```sql
- id: UUID (Primary Key)
- agent_id: UUID (Foreign Key to portal_users)
- agency_id: UUID (Foreign Key to agencies) 
- license_number: VARCHAR(100)
- state: VARCHAR(2)
- license_type: VARCHAR(50)
- issue_date: DATE
- expiration_date: DATE
- status: VARCHAR(20) ['Active', 'Expired', 'Suspended', 'Pending']
- nipr_id: VARCHAR(100)
- last_sync: TIMESTAMP
- metadata: JSONB
- notes: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `license_types` Table
```sql
- id: UUID (Primary Key)
- type_code: VARCHAR(20) (Unique)
- type_name: VARCHAR(100)
- description: TEXT
- is_active: BOOLEAN
```

#### `license_reminders` Table
```sql
- id: UUID (Primary Key)
- license_id: UUID (Foreign Key)
- reminder_date: DATE
- reminder_type: VARCHAR(20)
- status: VARCHAR(20)
- sent_at: TIMESTAMP
```

### Views

#### `license_summary` View
Comprehensive view combining license data with calculated fields:
- All license fields
- agent_name, agent_email (from portal_users)
- agency_name (from agencies)
- days_until_expiry (calculated)
- compliance_status (calculated)
- expiration_category (calculated)

## API Endpoints

### License Management
- `GET /api/admin/licenses` - Get licenses with filtering
- `POST /api/admin/licenses` - Create new license
- `PUT /api/admin/licenses?license_id={id}` - Update license
- `DELETE /api/admin/licenses?license_id={id}` - Delete license

### Special Actions
- `GET /api/admin/licenses?action=summary` - Get summary statistics
- `GET /api/admin/licenses?action=expiring` - Get expiring licenses
- `POST /api/admin/licenses?action=sync` - Sync with NIPR
- `POST /api/admin/licenses?action=reminder` - Send renewal reminders

### License Types
- `GET /api/admin/license-types` - Get available license types

### Dashboard Integration
- `GET /api/admin/dashboard-licenses` - Get dashboard widget data

## Query Parameters

### Filtering
- `search`: Search by agent name, license number, or state
- `state`: Filter by state (supports multiple: "TX,CA,FL")
- `license_type`: Filter by license type (supports multiple)
- `status`: Filter by status ("Active", "Expired", "Suspended")
- `agent_id`: Filter by specific agent
- `agency_id`: Filter by specific agency

### Sorting & Pagination
- `sort_by`: Field to sort by (default: "expiration_date")
- `sort_order`: "asc" or "desc" (default: "asc")
- `limit`: Number of results (default: 50, max: 100)
- `offset`: Results offset for pagination (default: 0)

## License Types

### Standard Types
- `LIFE`: Life Insurance
- `HEALTH`: Health Insurance  
- `PROP`: Property Insurance
- `CAS`: Casualty Insurance
- `LIFE_HEALTH`: Life & Health
- `PROP_CAS`: Property & Casualty
- `VAR_LIFE`: Variable Life
- `VAR_ANN`: Variable Annuities
- `SURPLUS`: Surplus Lines
- `ADJUSTER`: Claims Adjuster

## Color Coding System

### Row Colors (by expiration status)
- **Red**: Expired licenses
- **Yellow**: Expiring within 30 days
- **Orange**: Expiring within 60 days  
- **Green**: Valid (>60 days until expiration)

### Status Badges
- **Green**: Active licenses
- **Red**: Expired licenses
- **Gray**: Suspended licenses

## Installation & Setup

### 1. Database Setup
Run the database schema file:
```sql
-- Execute: database/licenses-schema.sql
```

### 2. Environment Variables
Ensure these are set in Vercel:
```
SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY
```

### 3. Navigation Integration
The navigation is automatically updated via `shared-nav.js` to include:
```javascript
{ href: '/admin/licenses', icon: 'shield-check', text: 'Licenses' }
```

### 4. Dashboard Widget Integration
To add the license widget to the admin dashboard:
```html
<!-- Include the widget component -->
<script src="/admin/components/license-widget.js"></script>

<!-- Add container -->
<div id="licenseWidget"></div>

<!-- Initialize -->
<script>
const licenseWidget = new LicenseWidget('licenseWidget');
</script>
```

## Usage Guide

### Accessing License Management
1. Login to admin portal with admin/manager credentials
2. Click "Licenses" in the navigation menu
3. View dashboard summary cards at the top

### Managing Licenses
1. **View All Licenses**: Default view shows all licenses in a sortable table
2. **Search**: Use the search box to find specific licenses
3. **Filter**: Use dropdown filters for state, type, and status
4. **Sort**: Click column headers to sort by that field
5. **Actions**: Click the action button (⋯) for individual license options

### Bulk Operations
1. **Sync with NIPR**: Click "Sync with NIPR" button to update license data
2. **Export CSV**: Click "Export CSV" to download license data
3. **Clear Filters**: Click "Clear" to reset all filters

### Dashboard Integration
The license widget shows:
- Summary statistics (total, active, expired, expiring soon)
- License alerts for expired and expiring licenses
- List of upcoming license expirations
- Compliance rate and issues

## NIPR Integration

### Sync Process
The NIPR sync functionality is currently implemented as a placeholder that:
1. Simulates API delay (2 seconds)
2. Updates the `last_sync` timestamp
3. Returns sync statistics

### Implementation Notes
To integrate with actual NIPR API:
1. Obtain NIPR API credentials
2. Update the `syncWithNIPR` function in `/api/admin/licenses.js`
3. Add environment variables for NIPR API access
4. Implement proper error handling for NIPR API responses

### Sample NIPR Integration
```javascript
async function syncWithNIPR(req, res) {
  try {
    // Actual NIPR API call would look like:
    const niprResponse = await fetch('https://nipr-api.example.com/licenses', {
      headers: {
        'Authorization': `Bearer ${process.env.NIPR_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const licenseData = await niprResponse.json();
    
    // Process and update licenses in database
    // ... implementation details
    
  } catch (error) {
    // Handle NIPR API errors
  }
}
```

## Compliance Monitoring

### Compliance Rate Calculation
```javascript
const complianceRate = ((activeLicenses - expiredLicenses) / totalLicenses) * 100;
```

### Alert Thresholds
- **High Priority**: Expired licenses, compliance rate < 70%
- **Medium Priority**: Expiring within 30 days, compliance rate < 90%
- **Low Priority**: Expiring within 60 days

### Automated Reminders
Future enhancement to send automated email reminders:
- 90 days before expiration
- 60 days before expiration
- 30 days before expiration
- 7 days before expiration
- Day of expiration

## Security Features

### Row Level Security (RLS)
- Enabled on all license tables
- Users can only view licenses for their agency
- Admins can view all licenses
- Super admins have full access

### Authentication
- JWT token-based authentication
- Role-based access control
- Admin/Manager/Super-admin access required

## Performance Optimizations

### Database Indexes
- `idx_licenses_agent_id`: Fast agent lookups
- `idx_licenses_agency_id`: Fast agency lookups
- `idx_licenses_expiration_date`: Fast expiration queries
- `idx_licenses_status`: Fast status filtering
- `idx_licenses_state`: Fast state filtering

### Caching
- License types cached in memory
- Dashboard widgets cache results for 5 minutes
- Summary statistics cached per request

## Troubleshooting

### Common Issues

#### "No token provided" Error
- Ensure user is logged in with admin credentials
- Check that JWT token is properly stored in localStorage

#### "Table doesn't exist" Error
- Run the database schema creation script
- Verify Supabase connection and permissions

#### License data not syncing
- Check NIPR API credentials (when implemented)
- Verify network connectivity
- Check API rate limits

#### Dashboard widget not loading
- Ensure license-widget.js is included
- Check browser console for JavaScript errors
- Verify API endpoints are accessible

### Debug Mode
Enable debug logging by adding to console:
```javascript
localStorage.setItem('debug', 'license-management');
```

## Future Enhancements

### Planned Features
1. **Document Upload**: Attach license documents and certificates
2. **Renewal Tracking**: Track renewal applications and status
3. **CE Credit Tracking**: Monitor continuing education requirements
4. **Mobile App**: Native mobile app for license management
5. **Advanced Reporting**: Custom reports and analytics
6. **Bulk Import**: CSV import for existing license data
7. **API Webhooks**: Real-time notifications for license changes

### Integration Opportunities
1. **Email Service**: Automated renewal reminders via SendGrid/Mailgun
2. **Calendar Integration**: License expiration calendar events
3. **CRM Integration**: Sync license data with CRM systems
4. **Accounting Integration**: Link license costs with accounting
5. **Compliance Reporting**: Generate regulatory compliance reports

## Support

For technical support or questions:
1. Check the troubleshooting section above
2. Review API endpoint documentation
3. Check browser console for error messages
4. Verify database schema and permissions

## Version History

### v1.0.0 (Initial Release)
- Complete license management system
- NIPR integration framework
- Dashboard widgets
- Search and filtering
- Export functionality
- Compliance monitoring
- Responsive design