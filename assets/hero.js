(function () {
  'use strict';
  var time = document.getElementById('bj-time');
  if (time) {
    var fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    });
    var paint = function () { time.textContent = fmt.format(new Date()); time.dateTime = time.textContent; };
    paint();
    setInterval(paint, 30000);
  }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrow = window.matchMedia('(max-width: 860px)').matches;
  if (reduced || narrow) return;

  var stage = document.getElementById('hero');
  var pieces = stage.querySelectorAll('[data-d]');
  stage.addEventListener('pointermove', function (e) {
    var box = stage.getBoundingClientRect();
    var x = (e.clientX - box.left) / box.width - 0.5;
    var y = (e.clientY - box.top) / box.height - 0.5;
    pieces.forEach(function (el) {
      var d = parseFloat(el.getAttribute('data-d')) || 1;
      el.style.setProperty('--px', (x * d * 16).toFixed(1) + 'px');
      el.style.setProperty('--py', (y * d * 10).toFixed(1) + 'px');
    });
  });
  stage.addEventListener('pointerleave', function () {
    pieces.forEach(function (el) {
      el.style.setProperty('--px', '0px');
      el.style.setProperty('--py', '0px');
    });
  });
})();
