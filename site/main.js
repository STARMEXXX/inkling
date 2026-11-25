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

// Minimal chrome.* stand-in so src/content.js runs unchanged on a web page.
const handlers = {
  async check({ text }) {
    return { issues: await checkWithLanguageTool(text, 'en-US'), engine: 'languagetool' };
  },
  async rewrite() {
    throw new Error('Install the extension and add your AI key to use rewrites.');
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
    sync: { get: async (d) => ({ ...DEFAULTS, ...d }), set: async () => {} },
    local: { get: async (d) => ({ ...d }), set: async () => {} },
    onChanged: { addListener() {} },
  },
};

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
