// Landing page: mascots, copy buttons, and a live demo that runs the real
// extension content script with a tiny stand-in for the chrome.* APIs.
import { inky } from './lib/inky.js';
import { DEFAULTS, checkWithLanguageTool } from './lib/engines.js';

document.getElementById('logoInky').innerHTML = inky('happy', 28);
document.getElementById('heroInky').innerHTML = inky('happy', 260);
document.getElementById('ctaInky').innerHTML = inky('happy', 88);

for (const b of document.querySelectorAll('[data-copy]')) {
  b.addEventListener('click', async () => {
    await navigator.clipboard.writeText(b.dataset.copy).catch(() => {});
    const s = b.querySelector('span');
    s.textContent = 'Copied ✓';
    setTimeout(() => (s.textContent = 'Copy'), 1500);
  });
}

// Which checker the demo uses: the free LanguageTool API, or Claude through /api/ai.
let engine = 'languagetool';
const storageListeners = [];

async function askClaude(mode, text) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, text }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Minimal chrome.* stand-in so src/content.js runs unchanged on a web page.
const handlers = {
  async check({ text }) {
    if (engine === 'ai') return { issues: (await askClaude('check', text)).issues, engine };
    return { issues: await checkWithLanguageTool(text, 'en-US'), engine };
  },
  async rewrite({ text, mode }) {
    return { text: (await askClaude(mode, text)).text };
  },
  async fixed() { return {}; },
  async openOptions() {
    document.getElementById('install').scrollIntoView({ behavior: 'smooth' });
    return {};
  },
};
window.chrome = {
  runtime: {
    lastError: undefined,
    sendMessage(msg, cb) {
      const h = handlers[msg?.type];
      if (!h) return cb({ ok: false, error: 'Unknown message' });
      h(msg).then((r) => cb({ ok: true, ...r })).catch((e) => cb({ ok: false, error: String(e.message || e) }));
    },
  },
  storage: {
    sync: { get: async (d) => ({ ...DEFAULTS, ...d, checkEngine: engine }), set: async () => {} },
    // A placeholder "key" switches on the rewrite toolbar; the real key lives on the server.
    local: { get: async (d) => ({ ...d, anthropicKey: 'website-demo' }), set: async () => {} },
    onChanged: { addListener: (fn) => storageListeners.push(fn) },
  },
};

const demoDefault = document.getElementById('demoText').value;
for (const b of document.querySelectorAll('[data-engine]')) {
  b.addEventListener('click', () => {
    engine = b.dataset.engine;
    document.querySelectorAll('[data-engine]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    storageListeners.forEach((fn) => fn({ checkEngine: { newValue: engine } }, 'sync'));
    document.getElementById('demoText').focus();
  });
}
document.getElementById('resetDemo').addEventListener('click', () => {
  const t = document.getElementById('demoText');
  t.focus();
  t.select();
  document.execCommand('insertText', false, demoDefault);
});

const s = document.createElement('script');
s.src = '/lib/content.js';
document.body.append(s);

// Wake the demo up when it scrolls into view (desktop only, so phones don't pop a keyboard).
const demo = document.getElementById('demoText');
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  new IntersectionObserver((entries, obs) => {
    if (entries.some((e) => e.isIntersecting)) {
      obs.disconnect();
      setTimeout(() => demo.focus({ preventScroll: true }), 300);
    }
  }, { threshold: 0.6 }).observe(demo);
}
