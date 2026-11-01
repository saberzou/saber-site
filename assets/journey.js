(function () {
  'use strict';
  if (!document.documentElement.classList.contains('motion')) return;

  var journey = document.getElementById('journey');
  var worlds = Array.prototype.slice.call(document.querySelectorAll('.world'));
  var veil = document.getElementById('veil');
  var clouds = document.getElementById('clouds');
  var hint = document.getElementById('hint');
  var dotsWrap = document.getElementById('dots');
  var n = worlds.length;
  var active = -1;
  var ticking = false;

  worlds.forEach(function (world, i) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'dot';
    button.setAttribute('aria-label', world.getAttribute('data-label') || ('Place ' + (i + 1)));
    button.addEventListener('click', function () {
      var scrollable = journey.offsetHeight - window.innerHeight;
      var top = journey.offsetTop + (n < 2 ? 0 : (i / (n - 1)) * scrollable);
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
    dotsWrap.appendChild(button);
  });
  var dots = dotsWrap.querySelectorAll('.dot');

  function applyActive(index) {
    var previous = document.activeElement;
    var moveFocus = previous && previous.classList && previous.classList.contains('caption') &&
      previous.closest('.world') !== worlds[index];
    worlds.forEach(function (world, i) {
      var on = i === index;
      world.classList.toggle('is-active', on);
      world.setAttribute('aria-hidden', on ? 'false' : 'true');
      var link = world.querySelector('a.caption');
      if (link) link.tabIndex = on ? 0 : -1;
    });
    dots.forEach(function (dot, i) {
      var on = i === index;
      dot.classList.toggle('is-on', on);
      if (on) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    if (moveFocus) {
      var next = worlds[index].querySelector('a.caption');
      if (next) next.focus({ preventScroll: true });
    }
  }

  function frame() {
    ticking = false;
    var rect = journey.getBoundingClientRect();
    var scrollable = Math.max(journey.offsetHeight - window.innerHeight, 1);
    var passed = Math.min(Math.max(-rect.top, 0), scrollable);
    var progress = passed / scrollable;
    var x = progress * (n - 1);
    var nearest = Math.max(0, Math.min(n - 1, Math.round(x)));

    if (nearest !== active) {
      active = nearest;
      applyActive(nearest);
    }

    var frac = x - Math.floor(x);
    var gap = Math.min(frac, 1 - frac);
    var veilOpacity = gap <= 0.16 ? 0 : gap >= 0.4 ? 1 : (gap - 0.16) / 0.24;

    worlds.forEach(function (world, i) {
      var dist = x - i;
      var ad = Math.abs(dist);
      var opacity = ad <= 0.34 ? 1 : ad >= 0.7 ? 0 : 1 - (ad - 0.34) / 0.36;
      world.style.opacity = opacity.toFixed(3);
      var cap = world.querySelector('.caption');
      if (cap) cap.style.opacity = (i === nearest) ? (1 - veilOpacity).toFixed(3) : '0';
      var far = world.querySelector('.layer-far');
      var near = world.querySelector('.layer-near');
      if (far) far.style.transform = 'translate3d(' + (dist * -26).toFixed(1) + 'px,' + (dist * -40).toFixed(1) + 'px,0)';
      if (near) near.style.transform = 'translate3d(' + (dist * 16).toFixed(1) + 'px,' + (dist * -72).toFixed(1) + 'px,0)';
    });

    if (veil) veil.style.opacity = veilOpacity.toFixed(3);
    if (clouds) {
      clouds.style.transform = 'translate3d(' + (progress * -140).toFixed(1) + 'px,' + (Math.sin(progress * Math.PI * 2) * 10).toFixed(1) + 'px,0)';
    }
    if (hint) hint.style.opacity = progress > 0.02 ? '0' : '1';
  }

  function request() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(frame);
    }
  }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  frame();
})();
