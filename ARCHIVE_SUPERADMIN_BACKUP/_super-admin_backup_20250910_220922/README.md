# Super Admin Console

## Overview
The Super Admin Console provides comprehensive system administration capabilities for the SyncedUp Insurance platform. This includes user management, security monitoring, and system-wide controls.

## Pages

### User Management (`/super-admin/user-management`)
- **Purpose**: Comprehensive user administration and access control
- **Features**:
  - View all users across all agencies
  - Create, edit, and manage user accounts
  - Role-based access control
  - User status management (active/inactive)
  - Password reset functionality
  - 2FA management
  - Bulk user operations
  - Advanced search and filtering

### Security Dashboard (`/super-admin/security-dashboard`)
- **Purpose**: Real-time security monitoring and threat management
- **Features**:
  - Security threat level monitoring
  - Active security alerts management
  - User session monitoring and termination
  - System metrics and health monitoring
  - Security event logging
  - Threat level adjustment
  - Security report generation

## Access Control
- **Authentication**: Super admin role required (`super_admin`)
- **Authorization**: Verified through secure token-based authentication
- **Session Management**: Automatic session validation and timeout

## Security Features
- Role-based access control
- Audit logging for all administrative actions
- IP address tracking
- Session management with forced termination capabilities
- Real-time threat monitoring
- Comprehensive security alerting system

## Navigation
Access these features from the main Super Admin Console:
- **User Administration** → **User Management**
- **System Configuration** → **Security Dashboard**

## Technical Details
- **Frontend**: Vanilla JavaScript with modern ES6+ features
- **Styling**: Custom CSS with glassmorphism design matching super admin theme
- **API Integration**: RESTful APIs with comprehensive error handling
- **Real-time Updates**: Periodic data refresh and live session monitoring
- **Responsive Design**: Mobile and desktop compatible

## Demo Data
When API endpoints are unavailable, the system falls back to realistic demo data to demonstrate functionality without requiring backend services.

## Development
- Files are located in `/public/super-admin/`
- JavaScript modules in `/public/super-admin/js/`
- Styling integrated within HTML files using CSS variables
- API endpoints: `/api/admin/users` and `/api/admin/security`