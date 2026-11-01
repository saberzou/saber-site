/* Loader for the 3D room. Runs before anything else so the first paint is
   never blank. proto.js reports real progress through window.roomLoader. */
(function () {
  'use strict';
  var root = document.getElementById('loader');
  if (!root) return;
  var fill = root.querySelector('#loader-fill');
  var line = root.querySelector('.loader-line');
  var count = root.querySelector('.loader-count');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var LINES = [
    'Rewinding side A…',
    'Dusting the CRT…',
    'Feeding the virtual pet…',
    'Threading the typewriter…',
    'Tuning the rabbit ears…',
    'Blowing on the cartridge…',
    'Warming up the tubes…',
    'Charging the pager…',
    'Calibrating the oscilloscope…',
    'Winding the watch…',
    'Finding the remote…',
    'Untangling the headphones…'
  ];
  var order = LINES.slice().sort(function () { return Math.random() - 0.5; });
  var at = 0;
  function nextLine() {
    if (!line) return;
    line.classList.add('swap');
    setTimeout(function () {
      line.textContent = order[at++ % order.length];
      line.classList.remove('swap');
    }, reduced ? 0 : 250);
  }
  nextLine();
  var ticker = setInterval(nextLine, 1500);

  // Until the scripts report in, creep toward 20% so the box is never still.
  var shown = 0;
  var real = 0;
  var loaded = 0, total = 0;
  var start = performance.now();
  function frame(now) {
    var waiting = Math.min(0.2, (now - start) / 6000);
    var goal = Math.max(real, waiting);
    shown += (goal - shown) * (reduced ? 1 : 0.12);
    var top = 124 - shown * 94;
    if (fill) { fill.setAttribute('y', top.toFixed(1)); fill.setAttribute('height', (124 - top + 2).toFixed(1)); }
    if (count) count.textContent = total ? (loaded + ' / ' + total) : Math.round(shown * 100) + '%';
    if (!root.classList.contains('done')) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.roomLoader = {
    progress: function (done, all) {
      loaded = done;
      total = all;
      // Scripts are in by now, so the files are the last 80%.
      real = 0.2 + 0.8 * (all ? done / all : 0);
    },
    done: function () {
      real = 1;
      clearInterval(ticker);
      if (line) line.textContent = 'Here we go.';
      setTimeout(function () { root.classList.add('done'); }, reduced ? 0 : 280);
      setTimeout(function () { root.remove(); }, 1000);
    }
  };
})();
