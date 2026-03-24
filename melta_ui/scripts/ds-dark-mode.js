/* --- Dark Mode Toggle (shared) --- */
(function() {
  var darkToggle = document.getElementById('dark-mode-toggle');
  if (!darkToggle) return;

  var iconSun = document.getElementById('icon-sun');
  var iconMoon = document.getElementById('icon-moon');

  darkToggle.addEventListener('click', function() {
    var html = document.documentElement;
    var isDark = html.getAttribute('data-theme') === 'dark';
    if (isDark) {
      html.removeAttribute('data-theme');
      if (iconSun) iconSun.classList.remove('hidden');
      if (iconMoon) iconMoon.classList.add('hidden');
    } else {
      html.setAttribute('data-theme', 'dark');
      if (iconSun) iconSun.classList.add('hidden');
      if (iconMoon) iconMoon.classList.remove('hidden');
    }
  });
})();
