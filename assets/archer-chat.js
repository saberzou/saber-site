(function () {
  'use strict';
  var endpoint = 'https://saber-site-chat.vercel.app/api/chat';
  var history = [], busy = false;
  var dialog = document.createElement('dialog');
  dialog.id = 'archer-chat';
  dialog.className = 'archer-chat';
  dialog.setAttribute('aria-labelledby', 'archer-chat-title');
  dialog.innerHTML = '<header class="archer-chat-header"><img class="archer-chat-avatar" src="images/archer-avatar.jpg" alt=""><div><h2 id="archer-chat-title">Hey, I’m Archer.</h2><p class="archer-chat-subtitle">Your little guide to Saber’s world</p></div><button type="button" class="archer-chat-close" aria-label="Close chat">×</button></header><div class="archer-chat-messages" role="log" aria-label="Conversation with Archer" aria-live="polite" aria-relevant="additions"></div><form class="archer-chat-form"><input class="archer-chat-input" aria-label="Message Archer" placeholder="Ask me anything…" maxlength="2000" autocomplete="off"><button class="archer-chat-send" type="submit" disabled>Send</button></form><p class="archer-chat-note">Archer is an AI guide. Messages are sent to an AI service; replies may be imperfect.</p>';
  document.body.appendChild(dialog);
  var list = dialog.querySelector('.archer-chat-messages');
  var input = dialog.querySelector('input');
  var send = dialog.querySelector('.archer-chat-send');
  var suggestions;
  // Render replies as text, allowing only safe web links (including Markdown links).
  function message(text, sender) {
    var el = document.createElement('div');
    el.className = 'archer-chat-message' + (sender === 'user' ? ' user' : '');
    var pattern = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>]+)/g;
    var last = 0, match;
    while ((match = pattern.exec(text))) {
      el.appendChild(document.createTextNode(text.slice(last, match.index)));
      var a = document.createElement('a');
      a.href = match[2] || match[3];
      a.textContent = match[1] || match[3];
      a.target = '_blank'; a.rel = 'noopener noreferrer';
      el.appendChild(a); last = pattern.lastIndex;
    }
    el.appendChild(document.createTextNode(text.slice(last)));
    list.appendChild(el); list.scrollTop = list.scrollHeight;
  }
  function mood(name) { document.dispatchEvent(new CustomEvent('archer-mood', { detail: name })); }
  function sync() { send.disabled = busy || !input.value.trim(); }
  async function reply() {
    if (busy) return;
    busy = true; sync(); mood('thinking');
    list.querySelectorAll('.archer-chat-status').forEach(function (el) { el.remove(); });
    var status = document.createElement('div');
    status.className = 'archer-chat-status'; status.textContent = 'Archer is thinking…';
    list.appendChild(status); list.scrollTop = list.scrollHeight;
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 25000);
    try {
      var response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ character: 'archer', chatId: 'archer', messages: history.slice(-10), siteContext: 'sticker-board' })
      });
      if (!response.ok) throw new Error('Chat unavailable');
      var data = await response.json();
      if (typeof data.text !== 'string' || !data.text.trim()) throw new Error('Empty reply');
      status.remove(); message(data.text, 'archer'); mood('happy');
      history.push({ sender: 'archer', text: data.text });
      history = history.slice(-20);
    } catch (error) {
      mood('confused');
      status.textContent = 'I lost my connection. Want to try that again? ';
      var retry = document.createElement('button');
      retry.type = 'button'; retry.className = 'archer-chat-retry'; retry.textContent = 'Retry';
      retry.addEventListener('click', reply); status.appendChild(retry);
    } finally { clearTimeout(timeout); busy = false; sync(); }
  }
  function submit(text) {
    if (busy || !text.trim()) return;
    list.querySelectorAll('.archer-chat-status').forEach(function (el) { el.remove(); });
    // A new question replaces an unanswered failed turn rather than duplicating it.
    if (history.length && history[history.length - 1].sender === 'user') history.pop();
    if (suggestions) suggestions.remove();
    message(text, 'user'); history.push({ sender: 'user', text: text }); input.value = ''; reply();
  }
  function open() {
    if (dialog.open) return;
    dialog.showModal(); mood('greeting');
    document.body.style.overflow = 'hidden';
    input.focus();
  }
  dialog.addEventListener('close', function () { document.body.style.overflow = ''; mood('idle'); });
  dialog.querySelector('.archer-chat-close').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (e) {
    var r = dialog.getBoundingClientRect();
    if (e.target === dialog && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) dialog.close();
  });
  document.getElementById('archer').addEventListener('click', open);
  document.getElementById('archer').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });
  document.getElementById('archer-chat-open').addEventListener('click', open);
  input.addEventListener('input', sync);
  dialog.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); submit(input.value.trim()); });
  message('Hey! I’m Archer 👋 I hang out here with Saber’s experiments. Curious about him, looking for something to explore, or just saying hi?', 'archer');
  suggestions = document.createElement('div'); suggestions.className = 'archer-chat-suggestions';
  ['Who is Saber?', 'What should I explore first?', 'Tell me about this site'].forEach(function (text) {
    var button = document.createElement('button'); button.type = 'button'; button.textContent = text;
    button.addEventListener('click', function () { submit(text); }); suggestions.appendChild(button);
  });
  list.appendChild(suggestions);
})();
