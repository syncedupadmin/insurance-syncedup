(function () {
  var sidebar = document.getElementById('sidebar');
  var btn = document.getElementById('menuBtn');
  if (btn && sidebar) {
    // Desktop: click to pin; Mobile: toggle drawer
    btn.addEventListener('click', function () {
      sidebar.classList.toggle('expanded');
      try { localStorage.setItem('ui.sidebar.expanded', sidebar.classList.contains('expanded') ? '1' : '0'); } catch {}
    });
    try {
      if (localStorage.getItem('ui.sidebar.expanded') === '1') sidebar.classList.add('expanded');
    } catch {}
  }

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