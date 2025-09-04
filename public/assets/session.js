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

  // API helper with demo data filtering
  window.__api = async (path, opts={}) => {
    const response = await fetch(`http://localhost:5050${path}`, {
      headers: {'Content-Type': 'application/json'}, 
      ...opts
    });
    
    if (opts.method === 'GET' || !opts.method) {
      const data = await response.json();
      // Filter based on user type
      if (user.isDemoAccount) {
        // Demo users see only demo data
        return Array.isArray(data) ? data.filter(item => item.isDemoData || item.agencyId === 'DEMO001') : data;
      } else {
        // Production users see only their agency's non-demo data
        return Array.isArray(data) ? data.filter(item => !item.isDemoData && item.agencyId === user.agencyId) : data;
      }
    }
    return response;
  };
})();