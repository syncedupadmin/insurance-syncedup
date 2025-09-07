// Agency-specific configurations
const agencyConfigs = {
  'PHS Insurance Agency': {
    primaryColor: '#1e40af',
    secondaryColor: '#3b82f6',
    logo: '/images/phs-logo.png',
    companyName: 'PHS Insurance Agency',
    welcomeMessage: 'Welcome to PHS Insurance Platform',
    features: {
      globalLeaderboard: true,
      convoso: true,
      commissions: true,
      analytics: true,
      userManagement: true
    },
    branding: {
      showAgencyName: true,
      customHeaderColor: '#1e40af',
      customBackground: 'linear-gradient(-45deg, #1e3a8a, #1e40af, #3b82f6, #60a5fa)'
    }
  },
  'SyncedUp Solutions': {
    primaryColor: '#7c3aed',
    secondaryColor: '#a855f7',
    logo: '/images/syncedup-logo.png',
    companyName: 'SyncedUp Solutions',
    welcomeMessage: 'System Administration Portal',
    features: {
      globalLeaderboard: true,
      convoso: true,
      commissions: true,
      analytics: true,
      userManagement: true,
      systemAdmin: true
    },
    branding: {
      showAgencyName: true,
      customHeaderColor: '#7c3aed',
      customBackground: 'linear-gradient(-45deg, #4c1d95, #5b21b6, #6d28d9, #7c3aed, #8b5cf6, #a855f7, #c084fc, #ddd6fe)'
    }
  },
  'Demo Agency': {
    primaryColor: '#7c3aed',
    secondaryColor: '#a855f7', 
    logo: '/images/demo-logo.png',
    companyName: 'Demo Agency',
    welcomeMessage: 'Demo Environment - Test Features Here',
    features: {
      globalLeaderboard: true,
      convoso: false,
      commissions: true,
      analytics: true,
      userManagement: false
    },
    branding: {
      showAgencyName: true,
      customHeaderColor: '#7c3aed',
      customBackground: 'linear-gradient(-45deg, #4c1d95, #5b21b6, #6d28d9, #7c3aed, #8b5cf6, #a855f7, #c084fc, #ddd6fe)'
    }
  }
};

// Apply agency customization on page load
function applyAgencyCustomizations() {
  const user = JSON.parse(localStorage.getItem('syncedup_user') || '{}');
  const agency = user.agency || 'Demo Agency';
  const config = agencyConfigs[agency] || agencyConfigs['Demo Agency'];
  
  console.log('Applying customizations for agency:', agency);
  
  // Apply custom colors to CSS variables
  if (config.primaryColor) {
    document.documentElement.style.setProperty('--agency-primary', config.primaryColor);
  }
  
  if (config.secondaryColor) {
    document.documentElement.style.setProperty('--agency-secondary', config.secondaryColor);
  }
  
  // Apply custom background
  if (config.branding.customBackground) {
    document.body.style.background = config.branding.customBackground;
    document.body.style.backgroundSize = '400% 400%';
    document.body.style.animation = 'gradient 15s ease infinite';
  }
  
  // Update agency logos
  if (config.logo) {
    const logos = document.querySelectorAll('.agency-logo');
    logos.forEach(logo => {
      logo.src = config.logo;
      logo.alt = config.companyName;
    });
  }
  
  // Update company names
  if (config.companyName) {
    const titles = document.querySelectorAll('.agency-name');
    titles.forEach(title => title.textContent = config.companyName);
    
    // Update page titles
    const pageTitles = document.querySelectorAll('.page-title');
    pageTitles.forEach(title => {
      const currentText = title.textContent;
      if (!currentText.includes(config.companyName)) {
        title.textContent = `${currentText} - ${config.companyName}`;
      }
    });
  }
  
  // Update welcome messages
  if (config.welcomeMessage) {
    const welcomeElements = document.querySelectorAll('.welcome-message');
    welcomeElements.forEach(el => el.textContent = config.welcomeMessage);
  }
  
  // Show/hide features based on agency config
  applyFeatureVisibility(config.features);
}

function applyFeatureVisibility(features) {
  // Hide Convoso features if not enabled
  if (!features.convoso) {
    const convosoElements = document.querySelectorAll('.convoso-feature, a[href*="convoso"]');
    convosoElements.forEach(el => {
      el.style.display = 'none';
      el.setAttribute('data-hidden', 'true');
    });
  }
  
  // Hide user management if not enabled
  if (!features.userManagement) {
    const userMgmtElements = document.querySelectorAll('.user-management-feature, a[href*="users"], a[href*="user-management"]');
    userMgmtElements.forEach(el => {
      el.style.display = 'none';
      el.setAttribute('data-hidden', 'true');
    });
  }
  
  // Hide global leaderboard if not enabled
  if (!features.globalLeaderboard) {
    const leaderboardElements = document.querySelectorAll('.leaderboard-feature, a[href*="leaderboard"]');
    leaderboardElements.forEach(el => {
      el.style.display = 'none';
      el.setAttribute('data-hidden', 'true');
    });
  }
  
  // Hide commissions if not enabled
  if (!features.commissions) {
    const commissionElements = document.querySelectorAll('.commission-feature, a[href*="commission"]');
    commissionElements.forEach(el => {
      el.style.display = 'none';
      el.setAttribute('data-hidden', 'true');
    });
  }
}

// Get current agency configuration
function getCurrentAgencyConfig() {
  const user = JSON.parse(localStorage.getItem('syncedup_user') || '{}');
  const agency = user.agency || 'Demo Agency';
  return agencyConfigs[agency] || agencyConfigs['Demo Agency'];
}

// Check if feature is enabled for current agency
function isFeatureEnabled(featureName) {
  const config = getCurrentAgencyConfig();
  return config.features[featureName] || false;
}

// Initialize agency customizations when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure user data is available
  setTimeout(applyAgencyCustomizations, 100);
});

// Re-apply customizations when user data changes
window.addEventListener('storage', (e) => {
  if (e.key === 'syncedup_user') {
    setTimeout(applyAgencyCustomizations, 100);
  }
});

// Export functions for use in other scripts
window.agencyConfig = {
  apply: applyAgencyCustomizations,
  getCurrent: getCurrentAgencyConfig,
  isFeatureEnabled: isFeatureEnabled
};