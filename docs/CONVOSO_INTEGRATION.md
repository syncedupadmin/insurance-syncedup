# Bulletproof Convoso Integration

This integration provides a production-ready connection to Convoso with comprehensive error handling and automatic agency discovery.

## 🚀 Quick Start

### 1. Database Setup
Run the SQL schema in Supabase:
```bash
# Execute the schema file
psql -h your-supabase-host -d postgres -f database/convoso-schema.sql
```

### 2. Environment Variables
Add to your `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
NEXT_PUBLIC_URL=https://your-domain.com
```

### 3. Test the Integration
```bash
chmod +x scripts/test-convoso-integration.sh
./scripts/test-convoso-integration.sh
```

## 📋 API Endpoints

### Agency Onboarding
**POST** `/api/admin/onboard-agency`

Discovers and configures a new agency's Convoso setup automatically.

```json
{
  "agency_name": "My Insurance Agency",
  "convoso_token": "your_convoso_auth_token"
}
```

**Response:**
```json
{
  "success": true,
  "agency": {
    "id": "uuid",
    "name": "My Insurance Agency",
    "webhook_url": "https://yourapp.com/api/convoso-webhook/my-insurance-agency"
  },
  "discovered": {
    "campaigns": 3,
    "lists": 12,
    "queues": 2
  },
  "instructions": {
    "convoso_connect": "Add this webhook URL to Convoso Connect: https://...",
    "test_command": "curl -X POST ...",
    "next_steps": [...]
  }
}
```

### Smart Lead Insertion
**POST** `/api/convoso/smart-lead-insert`

Intelligently selects the best list and inserts leads with full validation.

```json
{
  "agency_id": "agency-uuid",
  "lead_data": {
    "phone": "818-555-1234",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "currently_insured": "Yes",
    "household_income": 50000,
    "state": "CA",
    "city": "Los Angeles",
    "zip": "90210"
  }
}
```

## 🎯 Intelligent List Selection

The system automatically selects the best list based on:

1. **Transfer calls** → Lists with "CALL", "Transfer", or "Warm"
2. **Carrier-specific** → Lists matching the lead's current carrier
3. **State-specific** → Lists matching the lead's state
4. **Data lists** → Default data processing lists
5. **Active lists** → Any active list as fallback

## 🛡️ Error Handling

### Comprehensive Coverage
- **Network timeouts** (10-second limit with retries)
- **Invalid tokens** (validated before processing)
- **Duplicate leads** (409 status with clear message)
- **Missing data** (field validation and sanitization)
- **API failures** (exponential backoff retry logic)

### Error Responses
```json
{
  "error": "Descriptive error message",
  "details": "Technical details for debugging"
}
```

## 📊 Database Schema

### Agencies Table
Stores Convoso configuration for each agency:
- Authentication tokens
- Discovered campaigns, lists, queues
- Field mappings
- Webhook URLs

### Convoso Leads Table
Tracks all leads sent to Convoso:
- Links internal leads to Convoso lead IDs
- Campaign and list assignments
- Status tracking

### Convoso Calls Table
Stores call data from webhooks:
- Call duration and disposition
- Agent information
- Recording URLs

## 🔧 Configuration

### Field Mappings
Standard insurance field mappings are automatically configured:

```javascript
{
  phone_number: 'phone',
  first_name: 'firstName',
  last_name: 'lastName',
  currently_insured: 'currentlyInsured',
  household_income: 'householdIncome',
  // ... and many more
}
```

### Custom Mappings
Override default mappings by updating the agency record:

```sql
UPDATE agencies 
SET field_mappings = '{"custom_field": "internal_field"}'
WHERE id = 'agency-uuid';
```

## 🧪 Testing

### Manual Testing
```bash
# Test onboarding
curl -X POST http://localhost:3000/api/admin/onboard-agency \
  -H 'Content-Type: application/json' \
  -d '{"agency_name": "TEST_AGENCY", "convoso_token": "YOUR_TOKEN"}'

# Test lead insertion
curl -X POST http://localhost:3000/api/convoso/smart-lead-insert \
  -H 'Content-Type: application/json' \
  -d '{"agency_id": "UUID", "lead_data": {"phone": "818-555-1234", "first_name": "Test"}}'
```

### Automated Testing
Use the provided test script for comprehensive testing:
```bash
./scripts/test-convoso-integration.sh
```

## 🚨 Production Checklist

- [ ] Database schema deployed to Supabase
- [ ] Environment variables configured
- [ ] Convoso auth tokens secured
- [ ] Webhook endpoints configured in Convoso
- [ ] Error monitoring set up (Sentry, etc.)
- [ ] Rate limiting implemented
- [ ] SSL certificates valid
- [ ] Backup strategy in place

## 📈 Monitoring

### Key Metrics to Track
- Lead insertion success rate
- API response times
- Error rates by type
- Database query performance
- Webhook delivery success

### Logging
All operations are logged with:
- Timestamp and request ID
- Agency identification
- Operation type and parameters
- Success/failure status
- Error details and stack traces

## 🔒 Security

### Data Protection
- Auth tokens encrypted in database
- Input validation and sanitization
- SQL injection prevention
- Rate limiting on endpoints
- CORS configuration

### Access Control
- Service-level authentication required
- Agency isolation enforced
- Audit trail for all operations

## 🤝 Support

### Common Issues

**"Invalid token" error:**
- Verify token is active in Convoso
- Check token permissions
- Ensure API access is enabled

**"No suitable list found":**
- Verify agency has active lists in Convoso
- Check list naming conventions
- Review discovery logs

**Timeout errors:**
- Check network connectivity
- Verify Convoso API status
- Review retry logic configuration