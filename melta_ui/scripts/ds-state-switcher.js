// ds-state-switcher.js
// URL query parameters control DOM element visibility:
//   ?_tab=xxx  -> show elements with data-state="xxx", hide others
//   ?_v=xxx    -> show elements with data-variant="xxx", hide others
//   ?_p=xxx    -> show elements with data-pattern="xxx", hide others
(function () {
  var params = new URLSearchParams(window.location.search);
  var tab = params.get("_tab");
  var variant = params.get("_v");
  var pattern = params.get("_p");

  function toggle(attr, activeValue) {
    var els = document.querySelectorAll("[" + attr + "]");
    if (!activeValue || els.length === 0) return;
    els.forEach(function (el) {
      var val = el.getAttribute(attr);
      el.style.display = val === activeValue ? "" : "none";
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    toggle("data-state", tab);
    toggle("data-variant", variant);
    toggle("data-pattern", pattern);
  });
})();
