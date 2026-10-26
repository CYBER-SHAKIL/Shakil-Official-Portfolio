import { cleanText, onlyMethod, readJsonBody, sendJson } from '../server/utils/validation.js';

const CHAT_API_URL = 'https://xrahat-worm-ai.vercel.app/api/chat';

export default async function handler(req, res) {
  if (!onlyMethod(req, res, 'POST')) return;

  try {
    const body = await readJsonBody(req);
    const message = cleanText(body.message, 2000);
    const uid = cleanText(body.uid, 160);

    if (!message) return sendJson(res, 400, { error: 'Message is required.' });
    if (!uid) return sendJson(res, 400, { error: 'A visitor ID is required.' });

    const url = new URL(CHAT_API_URL);
    url.searchParams.set('uid', uid);
    url.searchParams.set('text', message);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    let upstream;
    try {
      upstream = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
        cache: 'no-store'
      });
    } finally {
      clearTimeout(timeout);
    }

    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok || payload.success === false) {
      const status = upstream.status === 429 ? 429 : upstream.status >= 500 ? 503 : 502;
      return sendJson(res, status, {
        error: status === 429
          ? 'AI request limit reached. Please try again later.'
          : 'The external AI service is temporarily unavailable.'
      });
    }

    const reply = typeof payload.reply === 'string' ? payload.reply.trim() : '';
    if (!reply) return sendJson(res, 502, { error: 'The AI service returned an empty reply.' });

    return sendJson(res, 200, { success: true, reply });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return sendJson(res, 504, { error: 'The AI service took too long to respond.' });
    }
    console.error('External AI endpoint error:', error?.message || error);
    return sendJson(res, 503, { error: 'AI service is temporarily unavailable.' });
  }
}
