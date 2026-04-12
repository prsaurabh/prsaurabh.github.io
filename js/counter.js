(function () {
  var NS = 'prsaurabh-portfolio-2026';
  var API = 'https://abacus.jasoncameron.dev';

  var params = new URLSearchParams(location.search);
  var ref = params.get('ref');

  if (location.hash === '#notrack') {
    try { localStorage.setItem('notrack', '1'); } catch (e) {}
  }
  var skip = false;
  try { skip = localStorage.getItem('notrack') === '1'; } catch (e) {}

  var path = location.pathname.replace(/\/+$/, '');
  var isHome = path === '' || /\/index\.html$/i.test(path);

  function call(action, key) {
    return fetch(API + '/' + action + '/' + NS + '/' + key)
      .then(function (r) { return r.json(); })
      .then(function (d) { return typeof d.value === 'number' ? d.value : null; })
      .catch(function () { return null; });
  }

  function fetchCounter(key, shouldIncrement) {
    return call(shouldIncrement && !skip ? 'hit' : 'get', key);
  }

  function render(total, li, cv) {
    var el = document.getElementById('vc');
    if (!el) return;
    var safe = function (v) { return (typeof v === 'number' && isFinite(v)) ? String(v) : '–'; };

    var sep = function () {
      var s = document.createElement('span');
      s.textContent = ' · ';
      s.style.color = 'currentColor';
      s.style.opacity = '0.5';
      return s;
    };
    var num = function (val, color) {
      var s = document.createElement('span');
      s.textContent = safe(val);
      s.style.color = color;
      return s;
    };

    el.textContent = '';
    el.appendChild(num(total, '#7d8590'));
    el.appendChild(sep());
    el.appendChild(num(li, '#0A66C2'));
    el.appendChild(sep());
    el.appendChild(num(cv, '#f0883e'));
  }

  Promise.all([
    fetchCounter('total', isHome),
    fetchCounter('linkedin', isHome && ref === 'linkedin'),
    fetchCounter('resume', isHome && ref === 'resume')
  ]).then(function (vals) {
    render(vals[0], vals[1], vals[2]);
  });
})();
