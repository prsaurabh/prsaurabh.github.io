// Theme toggle — shared across all pages
(function() {
    var saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
})();

function toggleTheme() {
    var html = document.documentElement;
    var current = html.getAttribute('data-theme');
    var next = current === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    var btns = document.querySelectorAll('.theme-toggle');
    btns.forEach(function(btn) {
        btn.innerHTML = next === 'light' ? '&#9728;' : '&#9790;';
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Inject toggle button into nav if not already present
    var nav = document.querySelector('.nav-links');
    if (nav && !nav.querySelector('.theme-toggle')) {
        var btn = document.createElement('button');
        btn.className = 'theme-toggle';
        btn.title = 'Toggle theme';
        btn.onclick = toggleTheme;
        var saved = localStorage.getItem('theme') || 'dark';
        btn.innerHTML = saved === 'light' ? '&#9728;' : '&#9790;';
        nav.appendChild(btn);
    }

    // Lightbox for diagram images
    var overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.onclick = function() { overlay.classList.remove('active'); };
    document.body.appendChild(overlay);

    var diagrams = document.querySelectorAll('.dd-diagram img, .diagram img');
    diagrams.forEach(function(img) {
        img.addEventListener('click', function() {
            var clone = img.cloneNode();
            clone.style.cursor = 'zoom-out';
            overlay.innerHTML = '';
            overlay.appendChild(clone);
            overlay.classList.add('active');
        });
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') overlay.classList.remove('active');
    });
});
