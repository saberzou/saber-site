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
  var DEVICES = ['candy', 'flip', 'rotary', 'slab', 'game', 'pager', 'pda', 'mac', 'crt', 'imac', 'term', 'laptop'];

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
  view.appendChild(world);

  var camX = 0, camY = 0;
  var pool = new Map();
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var scheduled = false;

  function deviceFor(c, r) { return DEVICES[mod(c * 3 + r * 2, DEVICES.length)]; }
  function itemFor(c, r) { return items[mod(c * 5 + r * 3, items.length)]; }

  function screen(item, kind) {
    return '<div class="screen ' + kind + '"><img src="' + item.icon + '" alt=""><span>' + item.name + '</span></div>';
  }

  function shell(kind, item) {
    var s = screen(item, kind === 'term' ? 'phos' : (kind === 'slab' || kind === 'crt' ? 'dark' : ''));
    if (kind === 'candy') return '<div class="dev candy"><i class="ear"></i>' + s + '<i class="pad"></i></div>';
    if (kind === 'flip') return '<div class="dev flip"><div class="half">' + s + '</div><i class="hinge"></i><div class="half keys"></div></div>';
    if (kind === 'rotary') return '<div class="dev rotary"><i class="handset"></i><div class="base">' + s + '<i class="dial"></i></div></div>';
    if (kind === 'slab') return '<div class="dev slab">' + s + '<i class="home"></i></div>';
    if (kind === 'game') return '<div class="dev game">' + s + '<div class="controls"><i class="dpad"></i><i class="ab"></i></div></div>';
    if (kind === 'pager') return '<div class="dev pager">' + s + '<i class="led"></i></div>';
    if (kind === 'pda') return '<div class="dev pda">' + s + '<i class="pda-bar"></i></div>';
    if (kind === 'mac') return '<div class="dev mac"><div class="bezel">' + s + '</div><div class="chin"><i></i></div></div>';
    if (kind === 'crt') return '<div class="dev crt"><div class="tube">' + s + '</div><i class="neck"></i><i class="stand"></i></div>';
    if (kind === 'imac') return '<div class="dev imac"><div class="shell">' + s + '</div><i class="foot"></i></div>';
    if (kind === 'term') return '<div class="dev term">' + s + '<i class="board"></i></div>';
    return '<div class="dev laptop"><div class="lid">' + s + '</div><i class="deck"></i></div>';
  }

  function makeCell(c, r) {
    var item = itemFor(c, r);
    var kind = deviceFor(c, r);
    var el = document.createElement(item.chat ? 'button' : 'a');
    el.className = 'cell';
    el.style.left = (c * CELL) + 'px';
    el.style.top = (r * CELL) + 'px';
    el.dataset.home = c + ',' + r;
    if (item.chat) {
      el.type = 'button';
      el.setAttribute('data-chat', '');
    } else {
      el.href = item.href;
      if (item.external) { el.target = '_blank'; el.rel = 'noopener noreferrer'; }
    }
    el.setAttribute('aria-label', item.name + '. ' + item.desc);
    el.tabIndex = -1;
    el.innerHTML = shell(kind, item) + '<span class="blurb">' + item.desc + '</span>';
    return el;
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
          pool.set(key, cell);
          world.appendChild(cell);
        }
      }
    }
    pool.forEach(function (el, key) {
      if (!need.has(key)) { el.remove(); pool.delete(key); }
    });
    world.style.transform = 'translate3d(' + (-camX) + 'px,' + (-camY) + 'px,0)';
  }

  function frame() { scheduled = false; apply(); }
  function request() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(frame); }
  }

  camX = CELL * 0.35 - view.clientWidth / 2 + 80;
  camY = CELL * 0.15 - view.clientHeight / 2 + 40;
  apply();
  window.addEventListener('resize', request);

  var drag = null;
  var suppress = false;
  view.addEventListener('pointerdown', function (e) {
    if (e.button != null && e.button !== 0) return;
    if (e.target.closest('.mark, .index')) return;
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
    if (moved) { suppress = true; return; }
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
