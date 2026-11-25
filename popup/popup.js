import { inky } from '../ui/inky.js';
import { DEFAULTS, ANTHROPIC_MODELS } from '../src/engines.js';

const $ = (id) => document.getElementById(id);

const GREETINGS = [
  'Hi, I’m Inky!',
  'I’ll check what you type.',
  'Tip: select text to rewrite it.',
];

async function main() {
  const settings = { ...DEFAULTS, ...(await chrome.storage.sync.get(DEFAULTS)) };
  const keys = await chrome.storage.local.get({ anthropicKey: '', openaiKey: '', stats: null });
  const today = new Date().toISOString().slice(0, 10);
  const stats = keys.stats || { total: 0, today: 0, day: today };

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let host = '';
  try {
    const u = new URL(tab?.url || '');
    if (u.protocol.startsWith('http')) host = u.hostname;
  } catch {}

  const draw = () => {
    const siteOn = !settings.disabledSites.includes(host);
    const on = settings.enabled && (!host || siteOn);
    document.body.classList.toggle('off', !settings.enabled);
    $('mascot').innerHTML = inky(on ? 'happy' : 'sleep', 46);
    $('greet').textContent = !settings.enabled ? 'I’m switched off. Use the toggle to turn me on.' : GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    $('master').checked = settings.enabled;
    $('host').textContent = host || 'This page';
    $('favicon').textContent = host ? host.replace(/^www\./, '')[0] : '·';
    $('siteToggle').checked = siteOn;
    $('siteToggle').disabled = !host || !settings.enabled;
    $('siteState').textContent = !host ? 'Inkling can’t run on browser pages' : siteOn ? 'Checking as you type' : 'Paused on this site';
  };

  $('today').textContent = stats.day === today ? stats.today : 0;
  $('total').textContent = stats.total;

  const aiKey = settings.aiProvider === 'openai' ? keys.openaiKey : keys.anthropicKey;
  const aiName = settings.aiProvider === 'openai'
    ? settings.openaiModel
    : (ANTHROPIC_MODELS.find((m) => m.id === settings.anthropicModel)?.label.split(' (')[0] || settings.anthropicModel);
  $('engCheck').textContent = settings.checkEngine === 'ai' && aiKey ? aiName : 'Free · LanguageTool';
  $('engAI').textContent = aiKey ? `${aiName} ✓` : 'Add a key →';
  $('aiDot').style.background = aiKey ? 'var(--ok)' : 'var(--muted)';
  if (!aiKey) {
    $('engAI').style.cursor = 'pointer';
    $('engAI').style.color = 'var(--accent)';
    $('engAI').onclick = () => chrome.runtime.openOptionsPage();
  }

  draw();

  $('master').onchange = async (e) => {
    settings.enabled = e.target.checked;
    await chrome.storage.sync.set({ enabled: settings.enabled });
    draw();
  };
  $('siteToggle').onchange = async (e) => {
    const set = new Set(settings.disabledSites);
    e.target.checked ? set.delete(host) : set.add(host);
    settings.disabledSites = [...set];
    await chrome.storage.sync.set({ disabledSites: settings.disabledSites });
    draw();
  };
  $('settings').onclick = () => chrome.runtime.openOptionsPage();
  $('playground').onclick = () => chrome.tabs.create({ url: chrome.runtime.getURL('playground/playground.html') });
}

main();
