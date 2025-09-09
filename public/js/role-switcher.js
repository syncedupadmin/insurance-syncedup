(function () {
  const mount = document.getElementById('roleSwitcherMount');
  if (!mount) return;

  const map = {
    super_admin: '/super-admin',
    admin: '/admin',
    manager: '/manager',
    customer_service: '/customer-service',
    agent: '/agent'
  };
  const titleBy = {
    super_admin: 'Super Admin', admin: 'Admin', manager: 'Manager',
    customer_service: 'Customer Service', agent: 'Agent'
  };

  const getCookie = n => {
    const m = document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]+)'));
    return m ? decodeURIComponent(m[1]) : '';
  };
  const normalize = r => String(r||'').toLowerCase().replace(/[\s-]+/g,'_');

  // roles can be JSON or comma list
  let raw = getCookie('user_roles') || '[]';
  let roles = [];
  try { roles = Array.isArray(raw) ? raw : JSON.parse(raw); } catch { roles = String(raw).split(','); }
  roles = roles.map(normalize).filter(r => map[r]);

  if (!roles.length) roles = ['agent'];

  const current = normalize(getCookie('user_role')) || roles[0];

  // build UI
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.gap = '8px';
  wrap.style.alignItems = 'center';

  const label = document.createElement('span');
  label.textContent = 'Log in as:';

  const select = document.createElement('select');
  roles.forEach(r => {
    const o = document.createElement('option');
    o.value = r; o.textContent = titleBy[r];
    if (r === current) o.selected = true;
    select.appendChild(o);
  });

  const goBtn = document.createElement('button');
  goBtn.textContent = 'Go';
  goBtn.className = 'btn btn-sm';

  const homeBtn = document.createElement('button');
  homeBtn.textContent = 'Return to my home';
  homeBtn.className = 'btn btn-sm';

  wrap.append(label, select, goBtn, homeBtn);
  mount.innerHTML = '';
  mount.appendChild(wrap);

  goBtn.addEventListener('click', async () => {
    const role = select.value;
    const dest = map[role] || '/agent';
    await fetch('/api/auth/switch-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role, redirectTo: dest })
    });
    location.href = dest;
  });

  // highest role = last in hierarchy
  const order = ['agent','customer_service','manager','admin','super_admin'];
  const highest = roles.sort((a,b) => order.indexOf(a) - order.indexOf(b)).pop();
  homeBtn.addEventListener('click', async () => {
    await fetch('/api/auth/clear-role', { method: 'POST', credentials: 'include' });
    location.href = map[highest] || '/agent';
  });
})();