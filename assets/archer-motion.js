(function () {
  'use strict';
  var source = document.getElementById('archer-svg');
  var avatar = document.querySelector('.archer-chat-avatar');
  if (!source || !avatar) return;
  // Let visitors see Archer's reactions while the modal covers the board.
  var portrait = source.cloneNode(true);
  portrait.removeAttribute('id');
  portrait.removeAttribute('style');
  portrait.classList.add('archer-chat-avatar');
  portrait.setAttribute('aria-hidden', 'true');
  portrait.querySelectorAll('[id]').forEach(function (el) {
    el.setAttribute('data-archer-part', el.id);
    el.removeAttribute('id');
  });
  avatar.replaceWith(portrait);
  if (!window.gsap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  function parts(id) {
    return [document.getElementById(id), portrait.querySelector('[data-archer-part="' + id + '"]')].filter(Boolean);
  }
  var left = parts('fin-left'), right = parts('fin-right');
  var torso = parts('archer-torso'), eyes = parts('archer-eyes');
  var fins = left.concat(right), timer, motion;
  gsap.set(left, { svgOrigin: '25 52' });
  gsap.set(right, { svgOrigin: '75 52' });
  // Fins rise with the body so their attachment points never drift apart.
  gsap.to(torso.concat(fins), { y: -2, duration: 1.7, ease: 'sine.inOut', repeat: -1, yoyo: true });
  gsap.to(eyes, { scaleY: 0.12, transformOrigin: '50% 50%', duration: 0.09, repeat: -1, repeatDelay: 4.1, yoyo: true });
  function idle() {
    clearTimeout(timer);
    var lift = 4 + Math.random() * 4;
    var duration = 0.65 + Math.random() * 0.3;
    motion = gsap.timeline({ onComplete: function () {
      timer = setTimeout(idle, 650 + Math.random() * 1700);
    } });
    motion.to(left, { rotation: -lift, duration: duration, ease: 'sine.inOut' }, 0)
      .to(right, { rotation: lift * 0.8, duration: duration * 1.12, ease: 'sine.inOut' }, 0.12)
      .to(left, { rotation: 0, duration: duration * 1.2, ease: 'sine.inOut' }, duration)
      .to(right, { rotation: 0, duration: duration * 1.25, ease: 'sine.inOut' }, duration + 0.2);
  }
  function react(name) {
    clearTimeout(timer);
    if (motion) motion.kill();
    // Blend from the current pose instead of snapping back to neutral.
    motion = gsap.timeline({ onComplete: idle });
    if (name === 'thinking') {
      motion = gsap.timeline({ repeat: -1 });
      motion.to(left, { rotation: -13, duration: 0.6, ease: 'sine.inOut' }, 0)
        .to(right, { rotation: -3, duration: 0.8, ease: 'sine.inOut' }, 0)
        .to(left, { rotation: -7, duration: 0.8, ease: 'sine.inOut' }, 0.7)
        .to(right, { rotation: 4, duration: 0.8, ease: 'sine.inOut' }, 0.9);
    } else if (name === 'greeting' || name === 'happy') {
      var angle = name === 'greeting' ? 27 : 18;
      motion.to(left, { rotation: -angle, duration: 0.25, ease: 'power2.out' }, 0)
        .to(right, { rotation: angle * 0.7, duration: 0.35, ease: 'power2.out' }, 0.08)
        .to(left, { rotation: -10, duration: 0.22, repeat: 3, yoyo: true, ease: 'sine.inOut' }, 0.25)
        .to(right, { rotation: 5, duration: 0.38, ease: 'sine.inOut' }, 0.5)
        .to(fins, { rotation: 0, duration: 0.6, ease: 'sine.inOut' });
    } else if (name === 'confused') {
      motion.to(left, { rotation: 8, duration: 0.45, ease: 'sine.inOut' }, 0)
        .to(right, { rotation: 23, duration: 0.45, ease: 'sine.inOut' }, 0.08)
        .to(fins, { rotation: 0, duration: 0.7, delay: 0.6, ease: 'sine.inOut' });
    } else {
      motion.to(fins, { rotation: 0, duration: 0.5, ease: 'sine.inOut' });
    }
  }
  document.addEventListener('archer-mood', function (event) { react(event.detail); });
  source.parentElement.addEventListener('mouseenter', function () { react('greeting'); });
  idle();
})();
