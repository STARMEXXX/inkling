import { DEFAULTS, checkWithLanguageTool, checkWithAI, rewrite, callAI } from './engines.js';
import { checkBasic, mergeIssues } from './basic.js';

async function getSettings() {
  const stored = await chrome.storage.sync.get(DEFAULTS);
  return { ...DEFAULTS, ...stored, categories: { ...DEFAULTS.categories, ...(stored.categories || {}) } };
}

async function getKeys() {
  return chrome.storage.local.get({ anthropicKey: '', openaiKey: '' });
}

async function bumpStats(n = 1) {
  const today = new Date().toISOString().slice(0, 10);
  const { stats = { total: 0, day: today, today: 0 } } = await chrome.storage.local.get('stats');
  if (stats.day !== today) Object.assign(stats, { day: today, today: 0 });
  stats.total += n;
  stats.today += n;
  await chrome.storage.local.set({ stats });
}

const handlers = {
  async check({ text }) {
    const settings = await getSettings();
    const keys = await getKeys();
    const useAI = settings.checkEngine === 'ai' && (settings.aiProvider === 'openai' ? keys.openaiKey : keys.anthropicKey);
    const basic = checkBasic(text);
    try {
      const main = useAI ? await checkWithAI(text, settings, keys) : await checkWithLanguageTool(text, settings.language);
      return { issues: mergeIssues(main, basic), engine: useAI ? 'ai' : 'languagetool' };
    } catch (err) {
      // Offline, rate-limited or a bad key: the built-in checker still works.
      if (useAI) throw err;
      return { issues: basic, engine: 'basic' };
    }
  },
  async rewrite({ text, mode }) {
    const settings = await getSettings();
    const keys = await getKeys();
    return { text: await rewrite(text, mode, settings, keys) };
  },
  async testKey({ provider, key, model }) {
    const settings = { ...(await getSettings()), aiProvider: provider };
    if (provider === 'openai') settings.openaiModel = model || settings.openaiModel;
    else settings.anthropicModel = model || settings.anthropicModel;
    const keys = provider === 'openai' ? { openaiKey: key } : { anthropicKey: key };
    const out = await callAI(settings, keys, 'Reply with the single word: ready', 'Ping');
    return { ok: true, reply: out.slice(0, 40) };
  },
  async fixed({ count }) {
    await bumpStats(count || 1);
    return { ok: true };
  },
  async openOptions() {
    await chrome.runtime.openOptionsPage();
    return { ok: true };
  },
};

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const handler = handlers[msg?.type];
  if (!handler) return false;
  handler(msg)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));
  return true; // keep the channel open for the async reply
});

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('playground/playground.html?welcome=1') });
  }
});
