// ---------------- SHAKIL DEV AI ASSISTANT ----------------
const botHistory = [];

function getBotUid() {
  const key = 'shakilDevBotUid';
  try {
    let uid = localStorage.getItem(key);
    if (!uid) {
      uid = 'visitor-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
      localStorage.setItem(key, uid);
    }
    return uid;
  } catch {
    return 'visitor-' + Date.now().toString(36);
  }
}

function addBotMessage(text, sender) {
  const messages = document.getElementById('bot-messages');
  if (!messages) return null;
  const emptyState = document.getElementById('bot-empty-state');
  if (emptyState) emptyState.remove();
  const bubble = document.createElement('div');
  bubble.className = `bot-message${sender === 'user' ? ' user' : ''}`;
  bubble.textContent = text;
  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
  return bubble;
}

document.getElementById('bot-form')?.addEventListener('submit', async event => {
  event.preventDefault();
  const input = document.getElementById('bot-input');
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  if (!input) return;

  const message = input.value.trim();
  if (!message) return;

  addBotMessage(message, 'user');
  input.value = '';
  if (submit) submit.disabled = true;
  const waiting = addBotMessage('একটু অপেক্ষা করো…', 'bot');

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ message, uid: getBotUid(), history: botHistory.slice(-8) })
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.success === false) {
      const error = new Error(payload.error || 'AI request failed');
      error.status = response.status;
      throw error;
    }

    const answer = String(payload.reply || '').trim();
    if (!answer) throw new Error('Empty AI reply');
    if (waiting) waiting.textContent = answer;
    botHistory.push({ role: 'user', text: message }, { role: 'model', text: answer });
    if (botHistory.length > 12) botHistory.splice(0, botHistory.length - 12);
  } catch (error) {
    console.error('Shakil Dev Bot request failed:', error);
    if (waiting) {
      waiting.textContent = error.status === 429
        ? 'অনেক request হচ্ছে। একটু পরে আবার চেষ্টা করো।'
        : error.status === 503
          ? 'AI সার্ভিস এখন সাময়িকভাবে পাওয়া যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করো।'
          : 'দুঃখিত, AI এখন উত্তর দিতে পারেনি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করো।';
    }
  } finally {
    if (submit) submit.disabled = false;
    const messages = document.getElementById('bot-messages');
    if (messages) messages.scrollTop = messages.scrollHeight;
    if (input) input.focus();
  }
});
