(function(){
  var sidebar = document.getElementById('sidebar');
  var btn = document.getElementById('menuBtn');

  // add mobile mask for drawer
  var mask = document.querySelector('.drawer-mask');
  if(!mask){ mask = document.createElement('div'); mask.className = 'drawer-mask'; document.body.appendChild(mask); }
  function toggle(){ var open = sidebar.classList.toggle('expanded'); mask.classList.toggle('show', open); }
  if (btn) btn.addEventListener('click', toggle);
  if (mask) mask.addEventListener('click', toggle);

  var tabs = document.querySelector('.tabs');
  var more = document.querySelector('.more');
  var menu = more ? more.querySelector('.menu') : null;

  function rebalance(){
    if(!tabs || !more || !menu) return;
    Array.from(menu.children).forEach(function(b){
      var id = b.getAttribute('data-el'), el = id && document.getElementById(id);
      if(el) tabs.insertBefore(el, more);
    });
    var avail = tabs.clientWidth - more.offsetWidth - 16;
    var used = 0, overflow = [];
    Array.from(tabs.querySelectorAll('.tab')).forEach(function(t){
      used += t.offsetWidth + 8; if(used > avail) overflow.push(t);
    });
    menu.innerHTML = '';
    if(!overflow.length){ more.style.display='none'; return; }
    more.style.display='block';
    overflow.forEach(function(t){
      if(!t.id) t.id = 'tab_'+Math.random().toString(36).slice(2);
      var b = document.createElement('button');
      b.className='tab'; b.textContent=t.textContent; b.setAttribute('data-el', t.id);
      b.addEventListener('click', function(){ t.click(); });
      menu.appendChild(b); t.remove();
    });
  }

  // run on first paint and after layout settles
  document.addEventListener('DOMContentLoaded', function(){
    rebalance();
    requestAnimationFrame(rebalance);
    setTimeout(rebalance, 200);
  });
  window.addEventListener('resize', rebalance);
})();