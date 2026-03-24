/* --- ScrollSpy + Nav Group Toggle (shared) --- */
(function() {
  var navLinks = document.querySelectorAll('.ds-sidebar a[data-nav]');
  var sections = document.querySelectorAll('[data-section]');
  var HEADER_HEIGHT = 72;

  // ScrollSpy — skip if no sidebar nav links
  if (navLinks.length && sections.length) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var id = entry.target.getAttribute('data-section');
          navLinks.forEach(function(link) {
            var wasActive = link.classList.contains('active');
            link.classList.remove('active');
            link.removeAttribute('aria-current');
            if (wasActive) link.classList.add('ds-visited');
            if (link.getAttribute('data-nav') === id) {
              link.classList.add('active');
              link.setAttribute('aria-current', 'page');
              // Scroll active link into view in sidebar
              var nav = link.closest('nav');
              if (nav) {
                var linkRect = link.getBoundingClientRect();
                var navRect = nav.getBoundingClientRect();
                if (linkRect.top < navRect.top || linkRect.bottom > navRect.bottom) {
                  link.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
              }
            }
          });
        }
      });
    }, { rootMargin: '-' + (HEADER_HEIGHT + 8) + 'px 0px -60% 0px', threshold: 0 });

    sections.forEach(function(s) { observer.observe(s); });

    // Smooth scroll for sidebar links with header offset
    navLinks.forEach(function(a) {
      a.addEventListener('click', function(e) {
        var href = a.getAttribute('href');
        if (href && href.charAt(0) === '#') {
          e.preventDefault();
          var target = document.querySelector(href);
          if (target) {
            var top = target.getBoundingClientRect().top + window.pageYOffset - HEADER_HEIGHT;
            window.scrollTo({ top: top, behavior: 'smooth' });
          }
        }
      });
    });
  }

  // --- Scroll Progress Bar + Header Scroll State ---
  var progressBar = document.getElementById('scroll-progress');
  var header = document.getElementById('showcase-header');
  if (progressBar || header) {
    window.addEventListener('scroll', function() {
      var h = document.documentElement;
      var scrollTop = h.scrollTop || document.body.scrollTop;
      if (progressBar) {
        var scrollHeight = h.scrollHeight - h.clientHeight;
        var pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        progressBar.style.width = pct + '%';
      }
      if (header) {
        if (scrollTop > 20) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      }
    }, { passive: true });
  }

  // --- Section Enter Animation (IntersectionObserver) ---
  // --- Section Enter Animation (IntersectionObserver) ---
  // First add ds-anim-ready to enable opacity:0, then observe for ds-visible.
  // Without JS, sections stay fully visible (progressive enhancement).
  var animSections = document.querySelectorAll('.ds-section-animate');
  if (animSections.length) {
    animSections.forEach(function(s) { s.classList.add('ds-anim-ready'); });
    var animObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('ds-visible');
          animObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -60px 0px', threshold: 0.01 });
    animSections.forEach(function(s) { animObserver.observe(s); });
  }
})();

/* --- Nav Group Toggle --- */
function toggleNavGroup(btn) {
  var items = btn.nextElementSibling;
  var arrow = btn.lastElementChild;
  items.classList.toggle('open');
  if (arrow) arrow.style.transform = items.classList.contains('open') ? '' : 'rotate(-90deg)';
}

/* --- Sidebar Search Filter --- */
function filterSidebarNav() {
  var input = document.getElementById('sidebar-search');
  if (!input) return;
  var query = input.value.toLowerCase().trim();
  var links = document.querySelectorAll('.ds-sidebar a[data-nav]');
  var groups = document.querySelectorAll('.ds-nav-group-items');

  links.forEach(function(link) {
    var text = link.textContent.toLowerCase();
    var nav = link.getAttribute('data-nav').toLowerCase();
    var match = !query || text.indexOf(query) !== -1 || nav.indexOf(query) !== -1;
    link.style.display = match ? '' : 'none';
  });

  // Show group if any child is visible when searching
  groups.forEach(function(group) {
    if (query) {
      group.classList.add('open');
    }
  });
}
