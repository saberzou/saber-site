/* Links marked data-fade fade the page out before leaving. Browsers that do
   cross-document view transitions handle the crossfade themselves. */
(function () {
  'use strict';
  var native = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('selector(::view-transition)') &&
    'onpagereveal' in window;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var veil = document.querySelector('.fade');

  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[data-fade]');
    if (!link || native || reduced || !veil) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    veil.classList.add('on');
    setTimeout(function () { window.location.href = link.href; }, 340);
  });

  // Coming back through the history cache: lift the veil again.
  window.addEventListener('pageshow', function () {
    if (veil) veil.classList.remove('on');
  });
})();
