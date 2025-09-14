# Deploy Full Multi-Route Edge Function

Please deploy the full multi-route version of admin-gateway with:

## Required Routes:
1. **POST /admin-gateway/reset-password** - Reset user password (already exists)
2. **POST /admin-gateway/users** - Handle create/invite/set_role/set_agency/delete actions
3. **GET /admin-gateway/tables** - List database tables
4. **POST /admin-gateway/table-info** - Get table information
5. **POST /admin-gateway/table-ddl** - Get table DDL
6. **POST /admin-gateway/sql** - Execute DDL-only SQL queries
7. **GET /admin-gateway/stats** - Get system statistics

## Requirements:
- Keep `verify_jwt: true` (require Bearer token)
- Add super_admin middleware to verify role
- Add CORS headers for origin: https://insurance.syncedupsolutions.com
- Handle OPTIONS preflight requests

## CORS Headers Needed:
```
Access-Control-Allow-Origin: https://insurance.syncedupsolutions.com
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
```

Please deploy this now so all dashboard features work properly.