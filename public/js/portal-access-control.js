/**
 * PRODUCTION PORTAL ACCESS CONTROL SYSTEM
 * Enforces role-based access and data isolation
 * CRITICAL: Prevents data breaches by wrong portal access
 */

class PortalAccessControl {
  constructor() {
    this.ACCESS_MATRIX = {
      'super_admin': {
        allowedPortals: ['/super-admin', '/admin', '/manager', '/agent', '/customer-service', '/leaderboard'],
        defaultPortal: '/super-admin',
        dataScope: 'ALL_AGENCIES'
      },
      'admin': {
        allowedPortals: ['/admin', '/manager', '/agent', '/customer-service', '/leaderboard'],
        defaultPortal: '/admin',
        dataScope: 'AGENCY_ONLY'
      },
      'manager': {
        allowedPortals: ['/manager', '/agent', '/leaderboard'],
        defaultPortal: '/manager',
        dataScope: 'AGENCY_ONLY'
      },
      'agent': {
        allowedPortals: ['/agent', '/leaderboard'],
        defaultPortal: '/agent',
        dataScope: 'SELF_ONLY'
      },
      'customer_service': {
        allowedPortals: ['/customer-service', '/leaderboard'],
        defaultPortal: '/customer-service',
        dataScope: 'AGENCY_CUSTOMERS_ONLY'
      }
    };

    this.currentUser = null;
    this.isInitialized = false;
  }

  /**
   * Initialize access control - MUST be called on every portal page
   */
  async initialize() {
    try {
      console.log('🔐 Initializing Portal Access Control');
      
      // Get current portal path
      const currentPortal = this.getCurrentPortal();
      console.log(`📍 Current portal: ${currentPortal}`);

      // Verify user authentication
      this.currentUser = await this.verifyAuthentication();
      if (!this.currentUser) {
        console.log('❌ Authentication failed - redirecting to login');
        this.redirectToLogin();
        return false;
      }

      console.log(`👤 User: ${this.currentUser.email} (${this.currentUser.role})`);
      console.log(`🏢 Agency: ${this.currentUser.agency_id}`);

      // Check portal access permissions
      if (!this.hasPortalAccess(this.currentUser.role, currentPortal)) {
        console.log(`❌ Access DENIED: Role '${this.currentUser.role}' cannot access '${currentPortal}'`);
        this.redirectToAuthorizedPortal(this.currentUser.role);
        return false;
      }

      console.log(`✅ Access GRANTED: Role '${this.currentUser.role}' can access '${currentPortal}'`);
      
      // Set up data isolation
      this.setupDataIsolation();
      
      this.isInitialized = true;
      return true;

    } catch (error) {
      console.error('🚨 Portal Access Control Error:', error);
      this.redirectToLogin();
      return false;
    }
  }

  /**
   * Get current portal path
   */
  getCurrentPortal() {
    const path = window.location.pathname;
    
    // Normalize portal paths
    if (path.startsWith('/super-admin')) return '/super-admin';
    if (path.startsWith('/admin')) return '/admin';
    if (path.startsWith('/manager')) return '/manager';
    if (path.startsWith('/agent')) return '/agent';
    if (path.startsWith('/customer-service')) return '/customer-service';
    if (path.startsWith('/leaderboard')) return '/leaderboard';
    
    return path;
  }

  /**
   * Verify user authentication with server
   */
  async verifyAuthentication() {
    try {
      const token = localStorage.getItem('auth-token') || sessionStorage.getItem('auth-token');
      
      if (!token) {
        console.log('❌ No authentication token found');
        return null;
      }

      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.log(`❌ Token verification failed: ${response.status}`);
        return null;
      }

      const result = await response.json();
      
      if (!result.valid) {
        console.log('❌ Invalid token');
        return null;
      }

      return result.user;
      
    } catch (error) {
      console.error('❌ Authentication verification error:', error);
      return null;
    }
  }

  /**
   * Check if user role has access to specific portal
   */
  hasPortalAccess(userRole, portalPath) {
    const roleConfig = this.ACCESS_MATRIX[userRole];
    
    if (!roleConfig) {
      console.log(`❌ Unknown role: ${userRole}`);
      return false;
    }

    return roleConfig.allowedPortals.includes(portalPath);
  }

  /**
   * Get default portal for user role
   */
  getDefaultPortal(userRole) {
    const roleConfig = this.ACCESS_MATRIX[userRole];
    return roleConfig ? roleConfig.defaultPortal : '/login';
  }

  /**
   * Get data access scope for user role
   */
  getDataScope(userRole) {
    const roleConfig = this.ACCESS_MATRIX[userRole];
    return roleConfig ? roleConfig.dataScope : 'NONE';
  }

  /**
   * Redirect to user's authorized portal
   */
  redirectToAuthorizedPortal(userRole) {
    const defaultPortal = this.getDefaultPortal(userRole);
    console.log(`🔄 Redirecting to authorized portal: ${defaultPortal}`);
    
    // Show brief message before redirect
    this.showAccessDeniedMessage(defaultPortal);
    
    setTimeout(() => {
      window.location.href = defaultPortal;
    }, 2000);
  }

  /**
   * Redirect to login page
   */
  redirectToLogin() {
    console.log('🔄 Redirecting to login');
    
    // Clear any stored tokens
    localStorage.removeItem('auth-token');
    sessionStorage.removeItem('auth-token');
    
    window.location.href = '/login';
  }

  /**
   * Show access denied message
   */
  showAccessDeniedMessage(redirectPortal) {
    const messageDiv = document.createElement('div');
    messageDiv.innerHTML = `
      <div style="
        position: fixed; 
        top: 0; 
        left: 0; 
        width: 100%; 
        height: 100%; 
        background: rgba(0,0,0,0.8); 
        color: white; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        z-index: 10000;
        font-family: Arial, sans-serif;
      ">
        <div style="
          background: #dc3545; 
          padding: 30px; 
          border-radius: 8px; 
          text-align: center;
          max-width: 400px;
        ">
          <h2 style="margin: 0 0 15px 0;">🚫 Access Denied</h2>
          <p style="margin: 0 0 15px 0;">
            You don't have permission to access this portal.
          </p>
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">
            Redirecting to your authorized portal...
          </p>
        </div>
      </div>
    `;
    
    document.body.appendChild(messageDiv);
  }

  /**
   * Setup data isolation based on user role and agency
   */
  setupDataIsolation() {
    if (!this.currentUser) return;

    const dataScope = this.getDataScope(this.currentUser.role);
    
    // Store user context for API calls
    window.userContext = {
      userId: this.currentUser.id,
      email: this.currentUser.email,
      role: this.currentUser.role,
      agencyId: this.currentUser.agency_id,
      dataScope: dataScope
    };

    console.log(`🔒 Data isolation setup: ${dataScope} for agency ${this.currentUser.agency_id}`);
  }

  /**
   * Get filtered data scope for API calls
   */
  getDataFilters() {
    if (!this.currentUser) return {};

    const dataScope = this.getDataScope(this.currentUser.role);
    const filters = {};

    switch (dataScope) {
      case 'ALL_AGENCIES':
        // Super admin sees everything - no filters
        break;
        
      case 'AGENCY_ONLY':
        filters.agency_id = this.currentUser.agency_id;
        break;
        
      case 'SELF_ONLY':
        filters.agent_id = this.currentUser.id;
        filters.agency_id = this.currentUser.agency_id;
        break;
        
      case 'AGENCY_CUSTOMERS_ONLY':
        filters.agency_id = this.currentUser.agency_id;
        filters.resource_type = 'customers';
        break;
        
      default:
        // No access - return restrictive filter
        filters.access_denied = true;
        break;
    }

    return filters;
  }

  /**
   * Validate current access (call this periodically)
   */
  async validateAccess() {
    if (!this.isInitialized) return false;

    // Re-verify authentication
    const currentUser = await this.verifyAuthentication();
    if (!currentUser) {
      console.log('❌ Access validation failed - user no longer authenticated');
      this.redirectToLogin();
      return false;
    }

    // Check if user role or status changed
    if (currentUser.role !== this.currentUser.role || 
        currentUser.agency_id !== this.currentUser.agency_id) {
      console.log('⚠️ User context changed - reloading portal');
      window.location.reload();
      return false;
    }

    return true;
  }
}

// Global instance
window.portalAccessControl = new PortalAccessControl();

/**
 * Initialize portal access control when page loads
 * CRITICAL: This must run on every portal page
 */
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Portal page loaded - initializing access control');
  
  const accessGranted = await window.portalAccessControl.initialize();
  
  if (accessGranted) {
    console.log('✅ Portal access control initialized successfully');
    
    // Set up periodic validation (every 5 minutes)
    setInterval(() => {
      window.portalAccessControl.validateAccess();
    }, 5 * 60 * 1000);
    
  } else {
    console.log('❌ Portal access control initialization failed');
  }
});

/**
 * Helper function to make authenticated API calls with proper data filtering
 */
window.makeAuthenticatedRequest = async function(url, options = {}) {
  if (!window.portalAccessControl.isInitialized) {
    throw new Error('Portal access control not initialized');
  }

  const token = localStorage.getItem('auth-token') || sessionStorage.getItem('auth-token');
  const filters = window.portalAccessControl.getDataFilters();
  
  // Add authentication header
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Add data isolation filters to request
  if (options.method === 'GET' || !options.method) {
    const urlObj = new URL(url, window.location.origin);
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        urlObj.searchParams.append(key, filters[key]);
      }
    });
    url = urlObj.toString();
  } else if (options.body) {
    // Add filters to POST/PUT body
    const body = JSON.parse(options.body);
    Object.assign(body, filters);
    options.body = JSON.stringify(body);
  }

  return fetch(url, {
    ...options,
    headers
  });
};