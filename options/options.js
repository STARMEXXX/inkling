import { inky } from '../ui/inky.js';
import { DEFAULTS, ANTHROPIC_MODELS } from '../src/engines.js';

const $ = (id) => document.getElementById(id);
let settings;
let keys;

const PROVIDERS = {
  anthropic: {
    label: 'Claude API key', placeholder: 'sk-ant-…', keyName: 'anthropicKey',
    help: 'Get one at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>. You pay Anthropic directly for what you use, usually a few cents.',
  },
  openai: {
    label: 'OpenAI API key', placeholder: 'sk-…', keyName: 'openaiKey',
    help: 'Get one at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">platform.openai.com</a>. You pay OpenAI directly for what you use.',
  },
};

let toastTimer;
function toast(text = 'Saved ✓') {
  const t = $('toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1400);
}

async function save(patch) {
  Object.assign(settings, patch);
  await chrome.storage.sync.set(patch);
  toast();
}

function drawProvider() {
  const p = PROVIDERS[settings.aiProvider];
  document.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.provider === settings.aiProvider)));
  $('keyLabel').textContent = p.label;
  $('apiKey').placeholder = p.placeholder;
  $('apiKey').value = keys[p.keyName] || '';
  $('keyHelp').innerHTML = p.help;
  $('anthropicModelField').hidden = settings.aiProvider !== 'anthropic';
  $('openaiModelField').hidden = settings.aiProvider !== 'openai';
  $('status').textContent = '';
  $('status').className = 'status';
}

function drawChips(el, items, onRemove, emptyText) {
  el.innerHTML = '';
  if (!items.length) {
    el.innerHTML = `<span class="empty">${emptyText}</span>`;
    return;
  }
  for (const it of items) {
    const c = document.createElement('span');
    c.className = 'chip';
    c.textContent = it;
    const x = document.createElement('button');
    x.textContent = '×';
    x.title = 'Remove';
    x.onclick = () => onRemove(it);
    c.append(x);
    el.append(c);
  }
}

function drawLists() {
  drawChips($('dict'), settings.dictionary, (w) => save({ dictionary: settings.dictionary.filter((x) => x !== w) }).then(drawLists), 'No words yet.');
  drawChips($('sites'), settings.disabledSites, (s) => save({ disabledSites: settings.disabledSites.filter((x) => x !== s) }).then(drawLists), 'Inky is active everywhere.');
}

async function main() {
  const stored = await chrome.storage.sync.get(DEFAULTS);
  settings = { ...DEFAULTS, ...stored, categories: { ...DEFAULTS.categories, ...(stored.categories || {}) } };
  keys = await chrome.storage.local.get({ anthropicKey: '', openaiKey: '' });

  $('mascot').innerHTML = inky('happy', 72);
  $('ver').textContent = `v${chrome.runtime.getManifest().version}`;

  // Engine
  document.querySelectorAll('input[name=checkEngine]').forEach((r) => {
    r.checked = r.value === settings.checkEngine;
    r.onchange = () => save({ checkEngine: r.value });
  });

  // Provider
  document.querySelectorAll('.seg button').forEach((b) => {
    b.onclick = () => save({ aiProvider: b.dataset.provider }).then(drawProvider);
  });
  $('anthropicModel').innerHTML = ANTHROPIC_MODELS.map((m) => `<option value="${m.id}">${m.label}</option>`).join('');
  $('anthropicModel').value = settings.anthropicModel;
  $('anthropicModel').onchange = (e) => save({ anthropicModel: e.target.value });
  $('openaiModel').value = settings.openaiModel;
  $('openaiModel').onchange = (e) => save({ openaiModel: e.target.value.trim() || DEFAULTS.openaiModel });

  $('apiKey').onchange = async (e) => {
    const name = PROVIDERS[settings.aiProvider].keyName;
    keys[name] = e.target.value.trim();
    await chrome.storage.local.set({ [name]: keys[name] });
    toast(keys[name] ? 'Key saved on this device ✓' : 'Key removed');
  };
  $('reveal').onclick = () => {
    $('apiKey').type = $('apiKey').type === 'password' ? 'text' : 'password';
  };
  $('test').onclick = async () => {
    const st = $('status');
    const key = $('apiKey').value.trim();
    if (!key) {
      st.className = 'status err';
      st.textContent = 'Paste a key first.';
      return;
    }
    st.className = 'status';
    st.textContent = 'Asking Inky’s AI friend…';
    const model = settings.aiProvider === 'openai' ? settings.openaiModel : settings.anthropicModel;
    const res = await chrome.runtime.sendMessage({ type: 'testKey', provider: settings.aiProvider, key, model });
    st.className = `status ${res.ok ? 'ok' : 'err'}`;
    st.textContent = res.ok ? '✓ The key works, so AI rewrites are turned on.' : `✕ ${res.error}`;
    $('mascot').innerHTML = inky(res.ok ? 'happy' : 'sad', 72);
  };
  drawProvider();

  // Categories + language
  document.querySelectorAll('[data-cat]').forEach((c) => {
    c.checked = settings.categories[c.dataset.cat] !== false;
    c.onchange = () => save({ categories: { ...settings.categories, [c.dataset.cat]: c.checked } });
  });
  $('language').value = settings.language;
  $('language').onchange = (e) => save({ language: e.target.value });

  // Dictionary
  const addWord = () => {
    const w = $('newWord').value.trim();
    if (!w) return;
    $('newWord').value = '';
    save({ dictionary: Array.from(new Set([...settings.dictionary, w])) }).then(drawLists);
  };
  $('addWord').onclick = addWord;
  $('newWord').onkeydown = (e) => e.key === 'Enter' && addWord();
  drawLists();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const [k, v] of Object.entries(changes)) settings[k] = v.newValue ?? DEFAULTS[k];
    drawLists();
  });
}

main();
