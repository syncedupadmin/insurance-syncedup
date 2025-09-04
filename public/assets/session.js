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

  // Demo data for when API is not available
  const demoData = {
    users: [
      {"id":"u-agent-demo","email":"agent@demo.com","name":"Demo Agent","role":"agent","agencyId":"DEMO001","isDemoAccount":true},
      {"id":"u-manager-demo","email":"manager@demo.com","name":"Demo Manager","role":"manager","agencyId":"DEMO001","isDemoAccount":true},
      {"id":"u-admin-demo","email":"admin@demo.com","name":"Demo Admin","role":"admin","agencyId":"DEMO001","isDemoAccount":true},
      {"id":"u-cs-demo","email":"customerservice@demo.com","name":"Demo CS","role":"customerservice","agencyId":"DEMO001","isDemoAccount":true},
      {"id":"u-sa-demo","email":"superadmin@demo.com","name":"Demo SuperAdmin","role":"superadmin","agencyId":"DEMO001","isDemoAccount":true}
    ],
    agents: [
      {"id":"demo-agent-1","name":"Sarah Johnson","team":"alpha","status":"active","performance":92,"agencyId":"DEMO001","isDemoData":true},
      {"id":"demo-agent-2","name":"Mike Davis","team":"beta","status":"active","performance":88,"agencyId":"DEMO001","isDemoData":true}
    ],
    leads: [
      {"id":"DEMO-L-1001","name":"John Doe","phone":"5551234","type":"auto","status":"new","agentId":"demo-agent-1","agencyId":"DEMO001","isDemoData":true},
      {"id":"DEMO-L-1002","name":"Jane Smith","phone":"5555678","type":"home","status":"contacted","agentId":"demo-agent-2","agencyId":"DEMO001","isDemoData":true}
    ],
    vendors: [
      {"id":"demo-vendor-1","name":"Demo Vendor Co","cpl":20,"monthlyBudget":1000,"agencyId":"DEMO001","isDemoData":true}
    ],
    quotes: [],
    sales: [],
    goals: [
      {"id":"demo-goal-1","agentId":"demo-agent-1","type":"monthly-sales","target":30,"current":12,"agencyId":"DEMO001","isDemoData":true}
    ],
    commissions: [
      {"id":"demo-comm-1","agentId":"demo-agent-1","month":"2025-09","amount":24750,"agencyId":"DEMO001","isDemoData":true}
    ]
  };

  // API helper with fallback to demo data
  window.__api = async (path, opts={}) => {
    try {
      // Try to connect to API first (works in development)
      const response = await fetch(`http://localhost:5050${path}`, {
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
      // Fallback to demo data when API is not available (production)
      console.log('API not available, using demo data');
      
      if (opts.method === 'GET' || !opts.method) {
        const endpoint = path.replace('/', '');
        let data = demoData[endpoint] || [];
        
        // Handle specific ID requests
        if (path.includes('?')) {
          const [base, query] = path.split('?');
          const params = new URLSearchParams(query);
          const endpoint = base.replace('/', '');
          data = demoData[endpoint] || [];
          
          // Filter by query parameters
          params.forEach((value, key) => {
            data = data.filter(item => item[key] === value);
          });
        }
        
        return data;
      }
      
      // For POST/PUT/PATCH operations, return success response
      return { ok: true, json: () => Promise.resolve({ success: true }) };
    }
  };
})();