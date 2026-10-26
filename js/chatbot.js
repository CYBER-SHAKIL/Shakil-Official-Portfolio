// ---------------- SHAKIL DEV AI ASSISTANT (EXTERNAL CHAT API) ----------------
const SHAKIL_CHAT_API = 'https://xrahat-worm-ai.vercel.app/api/chat';

function getShakilBotUid() {
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

async function fetchShakilBotReply(message) {
  const url = new URL(SHAKIL_CHAT_API);
  url.searchParams.set('uid', getShakilBotUid());
  url.searchParams.set('text', message);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const error = new Error(payload.error || payload.message || 'AI request failed');
    error.status = response.status;
    throw error;
  }

  const reply = typeof payload.reply === 'string' ? payload.reply.trim() : '';
  if (!reply) throw new Error('Empty AI reply');
  return reply;
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
    const answer = await fetchShakilBotReply(message);
    if (waiting) waiting.textContent = answer;
  } catch (error) {
    console.error('Shakil Dev Bot request failed:', error);
    if (waiting) {
      waiting.textContent = error.status === 429
        ? 'অনেক request হচ্ছে। একটু পরে আবার চেষ্টা করো।'
        : error instanceof TypeError
          ? 'API-তে সংযোগ করা যায়নি। ইন্টারনেট ও API CORS সেটিংস পরীক্ষা করে আবার চেষ্টা করো।'
          : 'দুঃখিত, AI এখন উত্তর দিতে পারেনি। কিছুক্ষণ পর আবার চেষ্টা করো।';
    }
  } finally {
    if (submit) submit.disabled = false;
    const messages = document.getElementById('bot-messages');
    if (messages) messages.scrollTop = messages.scrollHeight;
  }
});
