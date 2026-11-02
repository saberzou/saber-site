(function () {
  'use strict';

  var CELL = 248;
  function measure() {
    var next = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell')) || 248;
    if (next === CELL) return;
    CELL = next;
    pool.forEach(function (el) { el.remove(); });
    pool.clear();
  }
  var SPECS = window.RETRO_DEVICES;

  function mod(n, m) { return ((n % m) + m) % m; }

  var nodes = Array.prototype.slice.call(document.querySelectorAll('#catalog [data-item]'));
  var items = nodes.map(function (el) {
    return {
      name: (el.querySelector('strong') || el).textContent.trim(),
      desc: el.getAttribute('data-desc') || '',
      icon: el.getAttribute('data-icon') || '',
      href: el.getAttribute('href') || '',
      chat: el.hasAttribute('data-chat'),
      external: el.getAttribute('target') === '_blank'
    };
  });

  var view = document.getElementById('view');
  var world = document.createElement('div');
  world.className = 'world';
  view.insertAdjacentHTML('afterbegin', window.RETRO_DEFS);
  var grid = document.createElement('div');
  grid.className = 'grid';
  grid.setAttribute('aria-hidden', 'true');
  world.appendChild(grid);
  view.appendChild(world);

  var camX = 0, camY = 0;
  var pool = new Map();
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var scheduled = false;

  // A project is on the same device here as in the 3D room.
  function deviceFor(c, r, item) {
    var id = item && window.PROJECT_DEVICE && window.PROJECT_DEVICE[item.name];
    return (id && window.RETRO_BY_ID && window.RETRO_BY_ID[id]) || SPECS[mod(c * 3 + r * 2, SPECS.length)];
  }
  function itemFor(c, r) { return items[mod(c * 5 + r * 3, items.length)]; }
  function roleFor(c, r) {
    if (c === 0 && r === 0) return 'intro';
    if ((c === 1 && r === 0) || mod(c + r * 3, 13) === 0) return 'archer';
    return 'work';
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }

  var FISH = '<svg class="fish" viewBox="0 0 100 100" aria-hidden="true">' +
    '<path d="M25 48 C 17 49, 10 54, 8 62 C 15 64, 23 59, 28 55 Z" fill="#FF6A00"/>' +
    '<path d="M75 48 C 83 49, 90 54, 92 62 C 85 64, 77 59, 72 55 Z" fill="#FF6A00"/>' +
    '<rect x="20" y="28" width="60" height="46" rx="23" fill="#FF6A00"/>' +
    '<path d="M25 62 Q 50 76 75 62 Q 50 81 25 62 Z" fill="#D94B0F" opacity="0.45"/>' +
    '<rect x="28" y="38" width="44" height="17" rx="8.5" fill="#141414"/>' +
    '<rect x="38" y="42.5" width="5" height="8" rx="2.5" fill="#FFD966"/>' +
    '<rect x="57" y="42.5" width="5" height="8" rx="2.5" fill="#FFD966"/>' +
    '</svg>';

  function screenStyle(spec) {
    var s = spec.screen;
    var box = specBox(spec);
    return 'left:' + (s.x / box.w * 100) + '%;top:' + (s.y / box.h * 100) +
      '%;width:' + (s.w / box.w * 100) + '%;height:' + (s.h / box.h * 100) +
      '%;border-radius:' + (s.r / s.w * 100) + '% / ' + (s.r / s.h * 100) + '%';
  }

  function shell(spec, inner) {
    var size = spec.width ? ' style="width:' + spec.width + '%"' : '';
    // Wide screens put the icon beside the name, like the 3D room does.
    var wide = spec.screen.w / spec.screen.h >= 1.9 ? ' wide' : '';
    return '<div class="pop"><div class="dev dev-' + spec.id + '"' + size + '>' + spec.svg +
      '<div class="screen ' + spec.face + wide + '" style="' + screenStyle(spec) + '">' + inner + '</div></div></div>';
  }

  function workInner(item) {
    return '<img src="' + esc(item.icon) + '" alt=""><span>' + esc(item.name) + '</span>';
  }

  function introInner() {
    return '<h1>I\u2019m <em>Saber.</em></h1>' +
      '<p>I love making things. Apps, toys, little worlds.</p>' +
      '<p class="links"><a href="https://github.com/saberzou" target="_blank" rel="noopener noreferrer">GitHub</a>' +
      '<a href="mailto:saberzou@gmail.com">Email</a></p>';
  }

  function specBox(spec) {
    var m = spec.svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    return { w: parseFloat(m[1]), h: parseFloat(m[2]) };
  }

  function makeCell(c, r) {
    var role = roleFor(c, r);
    var el;
    if (role === 'intro') {
      el = document.createElement('div');
      el.className = 'cell';
      el.innerHTML = shell(window.INTRO_DEVICE, introInner());
    } else if (role === 'archer') {
      el = document.createElement('button');
      el.className = 'cell';
      el.type = 'button';
      el.setAttribute('data-chat', '');
      el.setAttribute('aria-label', 'Chat with Archer. A little guide who hangs out here.');
      el.tabIndex = -1;
      el.innerHTML = shell(window.ARCHER_DEVICE, FISH) + '<span class="blurb">A little guide who hangs out here.</span>';
    } else {
      var item = itemFor(c, r);
      var spec = deviceFor(c, r, item);
      el = document.createElement(item.chat ? 'button' : 'a');
      el.className = 'cell';
      if (item.chat) {
        el.type = 'button';
        el.setAttribute('data-chat', '');
      } else {
        el.href = item.href;
        if (item.external) { el.target = '_blank'; el.rel = 'noopener noreferrer'; }
      }
      el.setAttribute('aria-label', item.name + '. ' + item.desc);
      el.tabIndex = -1;
      el.innerHTML = shell(spec, workInner(item)) + '<span class="blurb">' + esc(item.desc) + '</span>';
    }
    el.style.left = (c * CELL) + 'px';
    el.style.top = (r * CELL) + 'px';
    el.dataset.home = c + ',' + r;
    return el;
  }

  var seen = new Set();
  var boot = true;

  function springFrames() {
    var frames = [];
    var zeta = 0.55;
    var wn = 14;
    var steps = 14;
    var w = wn * Math.sqrt(1 - zeta * zeta);
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var time = t * 0.86;
      var decay = Math.exp(-zeta * wn * time);
      var value = 1 - decay * Math.cos(w * time);
      var y = 18 * (1 - value);
      var scale = 0.6 + 0.4 * value;
      frames.push({
        transform: 'translate3d(0,' + y.toFixed(2) + 'px,0) scale(' + scale.toFixed(3) + ')',
        opacity: Math.max(0, Math.min(1, value * 1.7)),
        offset: t
      });
    }
    return frames;
  }
  var SPRING = springFrames();

  function popIn(el, delay) {
    var pop = el.querySelector('.pop');
    if (!pop) return;
    el.classList.remove('waiting');
    if (reduced) {
      pop.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 200,
        delay: delay,
        easing: 'ease-out',
        fill: 'both'
      });
      return;
    }
    pop.animate(SPRING, {
      duration: 860,
      delay: delay,
      easing: 'linear',
      fill: 'both'
    });
  }

  function inView(c, r, vw, vh) {
    var x = c * CELL - camX;
    var y = r * CELL - camY;
    return x < vw && y < vh && x + CELL > 0 && y + CELL > 0;
  }

  function apply() {
    measure();
    var vw = view.clientWidth, vh = view.clientHeight;
    var c0 = Math.floor(camX / CELL) - 1;
    var c1 = Math.floor((camX + vw) / CELL) + 1;
    var r0 = Math.floor(camY / CELL) - 1;
    var r1 = Math.floor((camY + vh) / CELL) + 1;
    var need = new Set();
    for (var r = r0; r <= r1; r++) {
      for (var c = c0; c <= c1; c++) {
        var key = c + ',' + r;
        need.add(key);
        if (!pool.has(key)) {
          var cell = makeCell(c, r);
          if (!seen.has(key)) cell.classList.add('waiting');
          pool.set(key, cell);
          world.appendChild(cell);
        }
      }
    }
    pool.forEach(function (el, key) {
      if (!need.has(key)) { el.remove(); pool.delete(key); }
    });
    var fresh = [];
    pool.forEach(function (el, key) {
      if (seen.has(key)) return;
      var parts = key.split(',');
      var c = +parts[0];
      var r = +parts[1];
      if (!inView(c, r, vw, vh)) return;
      var cx = c * CELL + CELL / 2 - camX;
      var cy = r * CELL + CELL / 2 - camY;
      fresh.push({ el: el, key: key, c: c, r: r, dist: Math.hypot(cx - vw / 2, cy - vh / 2) });
    });
    fresh.sort(function (a, b) {
      if (a.c === 0 && a.r === 0) return -1;
      if (b.c === 0 && b.r === 0) return 1;
      return a.dist - b.dist;
    });
    fresh.forEach(function (item, i) {
      seen.add(item.key);
      var delay = boot ? Math.round(item.dist / CELL * 50) : Math.min(i * 42, 420);
      popIn(item.el, delay);
    });
    if (boot) boot = false;
    grid.style.left = (c0 * CELL) + 'px';
    grid.style.top = (r0 * CELL) + 'px';
    grid.style.width = ((c1 - c0 + 2) * CELL) + 'px';
    grid.style.height = ((r1 - r0 + 2) * CELL) + 'px';
    world.style.transform = 'translate3d(' + (-camX) + 'px,' + (-camY) + 'px,0)';
  }

  function frame() { scheduled = false; apply(); }
  function request() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(frame); }
  }

  measure();
  camX = CELL / 2 - view.clientWidth / 2;
  camY = CELL / 2 - view.clientHeight / 2;
  apply();
  window.addEventListener('resize', request);

  var drag = null;
  var suppress = false;
  view.addEventListener('pointerdown', function (e) {
    if (e.button != null && e.button !== 0) return;
    if (e.target.closest('.screen.note a, .hud, .index')) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: camX, cy: camY, moved: false, cell: e.target.closest('.cell') };
    view.classList.add('dragging');
    try { view.setPointerCapture(e.pointerId); } catch (err) {}
  });
  view.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    drag.moved = true;
    camX = drag.cx - dx;
    camY = drag.cy - dy;
    request();
  });
  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var cell = drag.cell;
    var moved = drag.moved;
    drag = null;
    view.classList.remove('dragging');
    if (moved) {
      suppress = true;
      var hint = document.getElementById('drag-hint');
      if (hint) hint.classList.add('gone');
      return;
    }
    if (!cell) return;
    if (cell.hasAttribute('data-chat')) {
      var open = document.getElementById('archer-chat-open');
      if (open) open.click();
      suppress = true;
    }
  }
  view.addEventListener('pointerup', endDrag);
  view.addEventListener('pointercancel', endDrag);
  view.addEventListener('click', function (e) {
    if (!suppress) return;
    e.preventDefault();
    e.stopPropagation();
    suppress = false;
  }, true);

  view.addEventListener('wheel', function (e) {
    if (e.target.closest('.index')) return;
    e.preventDefault();
    camX += e.deltaX;
    camY += e.deltaY;
    request();
  }, { passive: false });

  view.addEventListener('keydown', function (e) {
    var step = e.shiftKey ? CELL : 80;
    if (e.key === 'ArrowLeft') { camX -= step; }
    else if (e.key === 'ArrowRight') { camX += step; }
    else if (e.key === 'ArrowUp') { camY -= step; }
    else if (e.key === 'ArrowDown') { camY += step; }
    else return;
    e.preventDefault();
    request();
  });

  var panel = document.getElementById('index');
  var toggle = document.getElementById('index-open');
  function setOpen(on) {
    panel.hidden = !on;
    toggle.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (on) {
      var first = panel.querySelector('a, button');
      if (first) first.focus();
    }
  }
  toggle.addEventListener('click', function () { setOpen(panel.hidden); });
  document.getElementById('index-close').addEventListener('click', function () { setOpen(false); toggle.focus(); });
  document.querySelector('.skip').addEventListener('click', function () { setOpen(true); });

  document.querySelectorAll('#catalog [data-chat]').forEach(function (el) {
    el.addEventListener('click', function () {
      var open = document.getElementById('archer-chat-open');
      if (open) open.click();
    });
  });

  if (reduced) view.classList.add('still');
})();
