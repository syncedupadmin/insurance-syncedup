(async function(){
  // Find header elements (adapt to actual selectors in your HTML)
  const headerName = document.querySelector('#userName, .user-name, [data-user-name]');
  const roleBadge = document.querySelector('#userRole, .user-role, [data-user-role]');

  // Get user from session
  const userSession = sessionStorage.getItem('syncedup:user');
  if (!userSession) return;
  const user = JSON.parse(userSession);

  // Update header display
  if (headerName) headerName.textContent = user.name || 'User';
  if (roleBadge) roleBadge.textContent = (user.role || '').toUpperCase();

  // No demo data - system should use real database data only

  // API helper - no fallback to demo data
  window.__api = async (path, opts={}) => {
    try {
      const response = await fetch(`/api${path}`, {
        headers: {'Content-Type': 'application/json'}, 
        ...opts
      });
      
      if (opts.method === 'GET' || !opts.method) {
        const data = await response.json();
        // Filter based on user type
        if (user.isDemoAccount) {
          return Array.isArray(data) ? data.filter(item => item.isDemoData || item.agencyId === 'DEMO001') : data;
        } else {
          return Array.isArray(data) ? data.filter(item => !item.isDemoData && item.agencyId === user.agencyId) : data;
        }
      }
      return response;
    } catch (error) {
      // Log error and return empty data - no demo fallback
      console.error('API not available:', error);
      
      if (opts.method === 'GET' || !opts.method) {
        return [];
      }
      
      // For POST/PUT/PATCH operations, throw error
      throw error;
    }
  };
})();