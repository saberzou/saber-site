/* Loader for the 3D room: the room's cassette player, winding its tape from
   the left reel to the right as the room loads. Runs before anything else so
   the first paint is never blank. proto.js reports real progress through
   window.roomLoader. */
(function () {
  'use strict';
  var root = document.getElementById('loader');
  if (!root) return;
  var line = root.querySelector('.loader-line');
  var count = document.getElementById('loader-count');
  var tapeL = document.getElementById('tape-l');
  var tapeR = document.getElementById('tape-r');
  var reelL = document.getElementById('reel-l');
  var reelR = document.getElementById('reel-r');
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
  var ticker = setInterval(nextLine, 1600);

  // Tape pack radius in millimetres: full reel 24, empty hub 12.
  var FULL = 24, EMPTY = 12;
  var shown = 0, real = 0;
  var angleL = 0, angleR = 0;
  var start = performance.now(), last = start;

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // Until the scripts report in, creep toward 20% so the tape always moves.
    var goal = Math.max(real, Math.min(0.2, (now - start) / 6000));
    shown += (goal - shown) * (reduced ? 1 : 0.1);
    // Tape area moves across, so radii follow the square root.
    var rL = Math.sqrt(EMPTY * EMPTY + (FULL * FULL - EMPTY * EMPTY) * (1 - shown));
    var rR = Math.sqrt(EMPTY * EMPTY + (FULL * FULL - EMPTY * EMPTY) * shown);
    if (tapeL) tapeL.setAttribute('r', rL.toFixed(2));
    if (tapeR) tapeR.setAttribute('r', rR.toFixed(2));
    if (!reduced) {
      // Same tape speed on both reels: the smaller pack spins faster.
      var speed = 260;
      angleL -= speed * dt * (FULL / rL);
      angleR -= speed * dt * (FULL / rR);
      if (reelL) reelL.setAttribute('transform', 'rotate(' + angleL.toFixed(1) + ')');
      if (reelR) reelR.setAttribute('transform', 'rotate(' + angleR.toFixed(1) + ')');
    }
    if (count) count.textContent = Math.round(shown * 100) + '%';
    if (!root.classList.contains('done')) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.roomLoader = {
    progress: function (done, all) {
      // Scripts are in by now, so the files are the last 80%.
      real = 0.2 + 0.8 * (all ? done / all : 0);
    },
    done: function () {
      real = 1;
      clearInterval(ticker);
      if (line) line.textContent = 'Here we go.';
      setTimeout(function () { root.classList.add('done'); }, reduced ? 0 : 320);
      setTimeout(function () { root.remove(); }, 1100);
    }
  };
})();
