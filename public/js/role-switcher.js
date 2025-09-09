async function getUser() {
  try {
    const r = await fetch('/api/auth/verify', { credentials: 'include' });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

function homeFor(role) {
  switch (role) {
    case 'super_admin': return '/super-admin';
    case 'admin': return '/admin';
    case 'manager': return '/manager';
    case 'customer_service': return '/customer-service';
    default: return '/agent';
  }
}

async function assume(role) {
  const r = await fetch('/api/auth/switch-role', {
    method:'POST',
    credentials:'include',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ role })
  });
  try { const j = await r.json(); if (j.redirect) location.href = j.redirect; } catch {}
}

async function clearAssume() {
  const r = await fetch('/api/auth/clear-role', { method:'POST', credentials:'include' });
  try { const j = await r.json(); location.href = j.redirect || '/'; } catch { location.href = '/'; }
}

function renderSwitcher(containerId, options) {
  const el = document.getElementById(containerId); if (!el) return;
  el.innerHTML = `<div class="role-switcher" style="display:flex;align-items:center;gap:8px;">
      <label>Log in as:</label>
      <select id="roleSelect">
        ${options.map(o =>`<option value="${o.value}">${o.label}</option>`).join('')}
      </select>
      <button id="roleGo">Go</button>
      <button id="roleHome">Return to my dashboard</button>
    </div>`;
  document.getElementById('roleGo').onclick = () =>
    assume(document.getElementById('roleSelect').value);
  document.getElementById('roleHome').onclick = () => clearAssume();
}

window.RoleSwitcher = { renderSwitcher, homeFor, assume, clearAssume, getUser };