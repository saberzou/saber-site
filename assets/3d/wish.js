// The crystal ball's wish card. Type a wish, send it, and a little card turns
// over with a kind answer, like a page from a book of answers. Answers come
// from the same AI as Archer (the "oracle" character on saber-site-chat);
// if it can't be reached, the ball picks one of its own.

const ENDPOINT = 'https://saber-site-chat.vercel.app/api/chat';

const OWN = [
  'Yes, and sooner than you think.',
  'It’s already on its way to you.',
  'Trust the little steps.',
  'This is the year for it.',
  'Say yes to it.',
  'Someone is hoping the same for you.',
  'The answer is a gentle yes.',
  'Keep going. It’s closer than it looks.',
  'Make a little room. It’s coming.',
  'You already have what it takes.',
  'Follow the warm feeling.',
  'Let it surprise you.',
  'Begin, and the rest will follow.',
  'It will be worth the wait.',
  'Your future self is smiling.',
  'The stars are quietly on your side.',
  'Lovely things are lining up.',
  'Hold on to that thought. It’s a good one.'
];

const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l1.9 6.2 6.6.1-5.3 3.9 2 6.3L12 15.3 6.8 19l2-6.3-5.3-3.9 6.6-.1z" fill="currentColor"/></svg>';
const SEND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

let dialog = null;
let opts = {};

function build() {
  dialog = document.createElement('dialog');
  dialog.className = 'wish';
  dialog.setAttribute('aria-labelledby', 'wish-title');
  dialog.innerHTML =
    '<div class="wish-ask">' +
      '<button class="wish-close" type="button" aria-label="Close" data-close>' + CLOSE + '</button>' +
      '<p class="wish-kicker"><span class="wish-year"></span> &middot; Crystal ball</p>' +
      '<h2 id="wish-title">Make a <em>wish.</em></h2>' +
      '<p class="wish-sub">Tell the ball what you’re hoping for this year. It keeps secrets.</p>' +
      '<form class="wish-form">' +
        '<input class="wish-input" name="wish" maxlength="140" autocomplete="off" placeholder="I wish…" aria-label="Your wish">' +
        '<button class="wish-send" type="submit" aria-label="Send wish" disabled>' + SEND + '</button>' +
      '</form>' +
      '<p class="wish-thinking" hidden>The ball is looking</p>' +
    '</div>' +
    '<div class="wish-result" hidden>' +
      '<div class="wish-card" role="status">' +
        '<span class="wish-star">' + STAR + '</span>' +
        '<p class="wish-answer"></p>' +
        '<p class="wish-for"></p>' +
        '<p class="wish-foot"><span class="wish-year"></span> &middot; the crystal ball</p>' +
      '</div>' +
      '<div class="wish-actions">' +
        '<button type="button" class="wish-again">Make another wish</button>' +
        '<button type="button" class="wish-done" data-close>Close</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(dialog);

  const form = dialog.querySelector('.wish-form');
  const input = dialog.querySelector('.wish-input');
  const send = dialog.querySelector('.wish-send');
  input.addEventListener('input', function () { send.disabled = !input.value.trim(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const wish = input.value.trim();
    if (wish) ask(wish);
  });
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
  });
  dialog.querySelector('.wish-again').addEventListener('click', reset);
}

function reset() {
  dialog.classList.remove('answered');
  dialog.querySelector('.wish-ask').hidden = false;
  dialog.querySelector('.wish-result').hidden = true;
  dialog.querySelector('.wish-thinking').hidden = true;
  dialog.querySelector('.wish-form').hidden = false;
  const input = dialog.querySelector('.wish-input');
  input.value = '';
  input.disabled = false;
  dialog.querySelector('.wish-send').disabled = true;
  setTimeout(function () { input.focus(); }, 30);
}

async function answerFor(wish) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(function () { if (controller) controller.abort(); }, 9000);
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ character: 'oracle', messages: [{ sender: 'user', text: wish }], siteContext: 'wish' }),
      signal: controller ? controller.signal : undefined
    });
    const data = await response.json();
    let text = !data.error && typeof data.text === 'string' ? data.text.trim() : '';
    text = text.replace(/^["“”'‘’]+|["“”'‘’]+$/g, '').trim();
    if (text && text.length <= 160) return text;
  } catch (err) {
    // Fall through to one of the ball's own answers.
  } finally {
    clearTimeout(timer);
  }
  return OWN[Math.floor(Math.random() * OWN.length)];
}

async function ask(wish) {
  const input = dialog.querySelector('.wish-input');
  input.disabled = true;
  dialog.querySelector('.wish-send').disabled = true;
  dialog.querySelector('.wish-form').hidden = true;
  dialog.querySelector('.wish-thinking').hidden = false;
  if (opts.onWish) opts.onWish(wish);
  // A short pause, so the answer feels considered even when it's quick.
  const [answer] = await Promise.all([answerFor(wish), new Promise(function (r) { setTimeout(r, 1600); })]);
  if (!dialog.open) return;
  dialog.querySelector('.wish-answer').textContent = answer;
  dialog.querySelector('.wish-for').textContent = 'for “' + (wish.length > 60 ? wish.slice(0, 58) + '…' : wish) + '”';
  dialog.querySelector('.wish-ask').hidden = true;
  dialog.querySelector('.wish-result').hidden = false;
  dialog.classList.add('answered');
  if (opts.onAnswer) opts.onAnswer(answer);
  dialog.querySelector('.wish-again').focus();
}

export function openWish(options) {
  opts = options || {};
  if (!dialog) build();
  dialog.querySelectorAll('.wish-year').forEach(function (el) { el.textContent = String(opts.year || ''); });
  reset();
  if (typeof dialog.showModal === 'function') { if (!dialog.open) dialog.showModal(); } else dialog.setAttribute('open', '');
  dialog.querySelector('.wish-input').focus();
}
