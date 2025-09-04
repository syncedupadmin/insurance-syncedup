(async function(){
  const SUPABASE_URL = 'https://zgkszwkxibpnxhvlenct.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpna3N6d2t4aWJwbnhodmxlbmN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMTk3OTMsImV4cCI6MjA3MTg5NTc5M30.1n7a1TYOM2zWiCUfGFhQnfPb8fjvDkDa_ba3CKZEB98';
  
  // Check for session - look in the correct storage location
  const userSession = localStorage.getItem('syncedup_user') || 
                     sessionStorage.getItem('syncedup:user') ||
                     sessionStorage.getItem('syncedup_user');
  if (!userSession) return;
  
  const user = JSON.parse(userSession);
  
  // Update UI
  const headerName = document.querySelector('#userName, .user-name, [data-user-name]');
  const roleBadge = document.querySelector('#userRole, .user-role, [data-user-role]');
  
  if (headerName) headerName.textContent = user.full_name || user.name || user.email;
  if (roleBadge) roleBadge.textContent = (user.role || '').toUpperCase();
  
  // Production API helper
  window.__api = async (path, opts={}) => {
    const apiPath = path.startsWith('/') ? `/api${path}` : `/api/${path}`;
    
    try {
      const response = await fetch(apiPath, {
        headers: {
          'Content-Type': 'application/json',
          'X-Agency-ID': user.agency_id || 'PHS001'
        },
        ...opts
      });
      
      if (!response.ok) throw new Error('API Error');
      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      return [];
    }
  };
})();