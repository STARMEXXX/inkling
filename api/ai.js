// Live AI demo for the website. Visitors' text goes to Claude through this
// function, so the API key stays on the server (Vercel env: ANTHROPIC_API_KEY).
// The extension itself never calls this; it talks to providers directly.
import Anthropic from '@anthropic-ai/sdk';
import { CHECK_SYSTEM, REWRITE_MODES, rewriteSystem, cleanRewrite, issuesFromRaw } from '../src/engines.js';

const MODEL = process.env.DEMO_MODEL || 'claude-opus-5-5';
const MAX_CHARS = 2000;
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT_PER_WINDOW = 20; // per visitor IP, per server instance
const ALLOWED_ORIGIN = /^(https:\/\/inkling[a-z0-9-]*\.vercel\.app|http:\/\/localhost(:\d+)?)$/;

const client = new Anthropic();
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > LIMIT_PER_WINDOW;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

  const origin = req.headers.origin || '';
  if (origin && !ALLOWED_ORIGIN.test(origin)) return res.status(403).json({ error: 'Not allowed from this site.' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'The live AI demo isn’t switched on yet. Install the extension to use your own key.' });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'You’ve used the demo a lot in the last few minutes. Please wait a bit and try again.' });
  }

  const { mode, text } = req.body || {};
  if (typeof text !== 'string' || !text.trim()) return res.status(400).json({ error: 'There’s no text to work with.' });
  if (text.length > MAX_CHARS) return res.status(413).json({ error: `The demo handles up to ${MAX_CHARS} characters at a time.` });
  if (mode !== 'check' && !REWRITE_MODES[mode]) return res.status(400).json({ error: 'Unknown mode.' });

  try {
    const message = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: mode === 'check' ? CHECK_SYSTEM : rewriteSystem(mode),
      messages: [{ role: 'user', content: `<text>\n${text}\n</text>` }],
    });

    if (message.stop_reason === 'refusal') {
      return res.status(422).json({ error: 'Claude declined to work on this text.' });
    }
    const out = message.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    if (mode === 'check') return res.status(200).json({ issues: issuesFromRaw(text, out) });
    return res.status(200).json({ text: cleanRewrite(out) });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'Claude is busy right now. Please try again in a moment.' });
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return res.status(502).json({ error: 'Couldn’t reach Claude. Please try again.' });
    }
    if (err instanceof Anthropic.APIError) {
      console.error('Claude API error', err.status, err.type, err.message);
      return res.status(502).json({ error: 'Something went wrong on Claude’s side. Please try again.' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
