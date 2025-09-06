(function () {
  var sidebar = document.getElementById('sidebar');
  var btn = document.getElementById('menuBtn');

  // add mask for mobile
  var mask = document.querySelector('.drawer-mask');
  if(!mask){
    mask = document.createElement('div');
    mask.className = 'drawer-mask';
    document.body.appendChild(mask);
  }

  function toggle() {
    if (btn && sidebar) {
      var isExpanded = sidebar.classList.toggle('expanded');
      mask.classList.toggle('show', isExpanded);
      try { 
        localStorage.setItem('ui.sidebar.expanded', isExpanded ? '1' : '0'); 
      } catch {}
    }
  }

  if (btn) btn.addEventListener('click', toggle);
  if (mask) mask.addEventListener('click', toggle);

  // Restore sidebar state on desktop
  try {
    if (window.innerWidth > 680 && localStorage.getItem('ui.sidebar.expanded') === '1') {
      sidebar.classList.add('expanded');
    }
  } catch {}

  // Optional: tabs overflow "More"
  var tabs = document.querySelector('.tabs');
  var more = document.querySelector('.more');
  var menu = more ? more.querySelector('.menu') : null;

  function rebalance() {
    if (!tabs || !more || !menu) return;
    // move items back first
    Array.from(menu.children).forEach(function (b) {
      var id = b.getAttribute('data-el');
      var el = id && document.getElementById(id);
      if (el) tabs.insertBefore(el, more);
    });
    var avail = tabs.clientWidth - more.offsetWidth - 16;
    var used = 0, overflow = [];
    Array.from(tabs.querySelectorAll('.tab')).forEach(function (t) {
      used += t.offsetWidth + 8;
      if (used > avail) overflow.push(t);
    });
    menu.innerHTML = '';
    if (!overflow.length) { more.style.display = 'none'; return; }
    more.style.display = 'block';
    overflow.forEach(function (t) {
      if (!t.id) t.id = 'tab_' + Math.random().toString(36).slice(2);
      var b = document.createElement('button');
      b.className = 'tab';
      b.textContent = t.textContent;
      b.setAttribute('data-el', t.id);
      b.addEventListener('click', function () { t.click(); });
      menu.appendChild(b);
      t.remove();
    });
  }
  window.addEventListener('resize', rebalance);
  rebalance();

  // Focus ring for keyboard users only
  document.body.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') document.documentElement.classList.add('kbd');
  }, { once: true });
})();