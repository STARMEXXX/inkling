/*
 * Inkling — in-page writing assistant.
 * Watches text fields, underlines issues, shows suggestion cards,
 * and lets Inky (our ink-drop mascot) help with AI rewrites.
 */
(() => {
  if (window.__inklingLoaded) return;
  window.__inklingLoaded = true;
  // The website runs its own copy of this script as a live demo; don't double up on it.
  if (document.documentElement.hasAttribute('data-inkling-demo') && globalThis.chrome?.runtime?.id) return;

  /* ================================================================ */
  /* Settings                                                          */
  /* ================================================================ */

  const DEFAULTS = {
    enabled: true,
    disabledSites: [],
    checkEngine: 'languagetool',
    aiProvider: 'anthropic',
    categories: { spelling: true, grammar: true, punctuation: true, style: true },
    dictionary: [],
  };
  let settings = { ...DEFAULTS };
  let aiReady = false;
  const host = location.hostname;

  async function loadSettings() {
    try {
      const s = await chrome.storage.sync.get(DEFAULTS);
      const k = await chrome.storage.local.get({ anthropicKey: '', openaiKey: '' });
      settings = { ...DEFAULTS, ...s, categories: { ...DEFAULTS.categories, ...(s.categories || {}) } };
      aiReady = Boolean(settings.aiProvider === 'openai' ? k.openaiKey : k.anthropicKey);
    } catch {
      /* storage unavailable (e.g. extension reloaded) */
    }
    if (!isOn()) teardown();
    else if (active) {
      active.issues = filterIssues(active.rawIssues || []);
      scheduleRender();
      scheduleCheck(active, 50);
    }
  }
  loadSettings();
  try {
    chrome.storage.onChanged.addListener(loadSettings);
  } catch {}

  const isOn = () => settings.enabled && !settings.disabledSites.includes(host);

  function send(msg) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(msg, (res) => {
          if (chrome.runtime.lastError) resolve({ ok: false, error: chrome.runtime.lastError.message });
          else resolve(res || { ok: false, error: 'No response' });
        });
      } catch (e) {
        resolve({ ok: false, error: 'Inkling was updated. Reload the page to keep using it.' });
      }
    });
  }

  /* ================================================================ */
  /* Inky, the mascot                                                  */
  /* ================================================================ */

  function inky(mood = 'happy', size = 28) {
    const ink = '#1b1340';
    let eyes;
    if (mood === 'sleep') {
      eyes = `<path d="M19.5 40q4.5 3.5 9 0M35.5 40q4.5 3.5 9 0" stroke="${ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    } else {
      const py = mood === 'think' ? 37.5 : 41;
      const px = mood === 'think' ? 1.2 : 0.6;
      eyes = `<ellipse cx="24" cy="40" rx="6.2" ry="6.8" fill="#fff"/><ellipse cx="40" cy="40" rx="6.2" ry="6.8" fill="#fff"/>
        <circle cx="${24 + px}" cy="${py}" r="3.3" fill="${ink}"/><circle cx="${40 + px}" cy="${py}" r="3.3" fill="${ink}"/>
        <circle cx="${25.6 + px}" cy="${py - 1.4}" r="1.1" fill="#fff"/><circle cx="${41.6 + px}" cy="${py - 1.4}" r="1.1" fill="#fff"/>`;
    }
    const mouth = {
      happy: `<path d="M27.5 50.5q4.5 4.2 9 0" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
      alert: `<ellipse cx="32" cy="52" rx="2.6" ry="3" fill="${ink}"/>`,
      think: `<path d="M28.5 52h7" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>`,
      sleep: `<path d="M29 51.5q3 2.2 6 0" stroke="${ink}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
      sad: `<path d="M27.5 53.5q4.5-4 9 0" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    }[mood] || '';
    return `<svg class="inky inky-${mood}" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
      <defs><linearGradient id="inkyG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9F8CFF"/><stop offset="1" stop-color="#5B3DF5"/></linearGradient></defs>
      <path d="M32 4.5C32 4.5 10.5 28.5 10.5 42.5C10.5 54.2 20.1 61.5 32 61.5C43.9 61.5 53.5 54.2 53.5 42.5C53.5 28.5 32 4.5 32 4.5Z" fill="url(#inkyG)"/>
      <ellipse cx="21" cy="28" rx="3.2" ry="6" transform="rotate(28 21 28)" fill="#fff" opacity=".35"/>
      <ellipse cx="16.5" cy="49" rx="3.6" ry="2.2" fill="#FF8FB1" opacity=".55"/><ellipse cx="47.5" cy="49" rx="3.6" ry="2.2" fill="#FF8FB1" opacity=".55"/>
      ${eyes}${mouth}</svg>`;
  }

  /* ================================================================ */
  /* UI root (shadow DOM keeps page CSS out and ours in)               */
  /* ================================================================ */

  const CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .wrap {
    --bg: #ffffff; --bg2: #f6f5fb; --fg: #1a1730; --muted: #6c6884; --line: rgba(26,23,48,.09);
    --accent: #6a4cff; --accent2: #8f7bff; --ok: #12b76a;
    --spelling: #f04461; --grammar: #f59f0b; --punctuation: #2f80ed; --style: #9b5cf6;
    --shadow: 0 18px 50px -12px rgba(30,20,90,.28), 0 4px 14px -4px rgba(30,20,90,.12);
    font: 13.5px/1.45 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
    color: var(--fg); -webkit-font-smoothing: antialiased;
  }
  @media (prefers-color-scheme: dark) {
    .wrap { --bg: #1b1a26; --bg2: #24222f; --fg: #f1effa; --muted: #a29fb5; --line: rgba(255,255,255,.09);
      --shadow: 0 18px 50px -12px rgba(0,0,0,.6), 0 4px 14px -4px rgba(0,0,0,.4); }
  }
  button { font: inherit; color: inherit; cursor: pointer; border: 0; background: none; padding: 0; }
  [hidden] { display: none !important; }

  .layer { position: fixed; inset: 0; pointer-events: none; overflow: hidden; }
  .ul { position: fixed; height: 2.5px; border-radius: 2px; opacity: .9; transition: opacity .15s; }
  .hl { position: fixed; border-radius: 3px; opacity: .16; }
  .c-spelling { background: var(--spelling); } .c-grammar { background: var(--grammar); }
  .c-punctuation { background: var(--punctuation); } .c-style { background: var(--style); }
  .mirror { position: fixed; visibility: hidden; overflow: hidden; pointer-events: none; border-color: transparent !important; }

  /* Badge (Inky in the corner of the field) */
  .badge { position: fixed; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 50%;
    filter: drop-shadow(0 3px 6px rgba(80,50,220,.35)); transition: transform .18s cubic-bezier(.3,1.6,.6,1); }
  .badge:hover { transform: scale(1.12) rotate(-4deg); }
  .badge.small { width: 22px; height: 22px; }
  .badge.small svg { width: 22px; height: 22px; }
  .badge.busy .inky { animation: bob 1s ease-in-out infinite; }
  .badge.pop .inky { animation: wiggle .5s ease; }
  .count { position: absolute; top: -5px; right: -7px; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 9px;
    background: var(--spelling); color: #fff; font-size: 10.5px; font-weight: 700; line-height: 17px; text-align: center;
    box-shadow: 0 0 0 2px var(--bg); }
  .count.ok { background: var(--ok); font-size: 10px; }
  @keyframes bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-3px) } }
  @keyframes wiggle { 0%,100% { transform: rotate(0) } 25% { transform: rotate(-12deg) } 75% { transform: rotate(10deg) } }

  /* Shared surfaces */
  .card, .panel, .toolbar, .result { position: fixed; background: var(--bg); border: 1px solid var(--line);
    box-shadow: var(--shadow); border-radius: 14px; animation: rise .16s cubic-bezier(.2,.9,.3,1.2); }
  @keyframes rise { from { opacity: 0; transform: translateY(4px) scale(.98) } to { opacity: 1; transform: none } }

  /* Suggestion card */
  .card { width: 300px; padding: 14px 14px 10px; }
  .head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
  .cat { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
  .x { margin-left: auto; width: 22px; height: 22px; border-radius: 6px; color: var(--muted); font-size: 16px; line-height: 1; }
  .x:hover { background: var(--bg2); color: var(--fg); }
  .title { font-weight: 650; font-size: 14.5px; margin-bottom: 2px; }
  .msg { color: var(--muted); margin-bottom: 10px; }
  .fix { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 8px; }
  .orig { text-decoration: line-through; text-decoration-color: var(--spelling); color: var(--muted); }
  .arrow { color: var(--muted); }
  .chip { background: var(--accent); color: #fff; font-weight: 600; padding: 5px 11px; border-radius: 8px;
    transition: transform .12s, background .12s; white-space: pre; }
  .chip:hover { background: var(--accent2); transform: translateY(-1px); }
  .chip.alt { background: var(--bg2); color: var(--fg); }
  .chip.alt:hover { background: var(--line); }
  .foot { display: flex; align-items: center; gap: 4px; border-top: 1px solid var(--line); margin: 4px -14px 0; padding: 8px 10px 0; }
  .ghost { color: var(--muted); font-size: 12.5px; padding: 4px 8px; border-radius: 7px; }
  .ghost:hover { background: var(--bg2); color: var(--fg); }
  .brand { margin-left: auto; display: flex; align-items: center; opacity: .9; }

  /* Panel */
  .panel { width: 340px; max-height: min(520px, calc(100vh - 24px)); display: flex; flex-direction: column; overflow: hidden; }
  .p-head { display: flex; align-items: center; gap: 10px; padding: 14px 14px 10px; }
  .p-head .t { font-weight: 700; font-size: 15px; }
  .p-head .s { color: var(--muted); font-size: 12.5px; }
  .pills { display: flex; gap: 6px; padding: 0 14px 10px; flex-wrap: wrap; }
  .pill { display: flex; align-items: center; gap: 5px; font-size: 12px; padding: 3px 9px; border-radius: 20px; background: var(--bg2); color: var(--muted); }
  .list { overflow-y: auto; padding: 0 8px; flex: 1; }
  .row { display: flex; align-items: center; gap: 9px; width: 100%; text-align: left; padding: 9px 8px; border-radius: 10px; }
  .row:hover { background: var(--bg2); }
  .row .txt { flex: 1; min-width: 0; }
  .row .ln { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .row .sub { color: var(--muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .row .new { font-weight: 650; }
  .empty { text-align: center; padding: 18px 20px 22px; color: var(--muted); }
  .empty .big { font-size: 15px; font-weight: 650; color: var(--fg); margin-top: 6px; }
  .section { padding: 10px 14px 12px; border-top: 1px solid var(--line); }
  .label { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
  .modes { display: flex; flex-wrap: wrap; gap: 6px; }
  .mode { padding: 6px 10px; border-radius: 9px; background: var(--bg2); font-weight: 550; font-size: 12.5px; transition: background .12s, transform .12s; }
  .mode:hover { background: var(--line); transform: translateY(-1px); }
  .primary { width: 100%; background: linear-gradient(135deg, var(--accent2), var(--accent)); color: #fff; font-weight: 650;
    padding: 9px 12px; border-radius: 10px; box-shadow: 0 6px 16px -6px rgba(106,76,255,.7); transition: filter .12s, transform .12s; }
  .primary:hover { filter: brightness(1.08); transform: translateY(-1px); }
  .p-foot { display: flex; justify-content: space-between; padding: 8px 10px; border-top: 1px solid var(--line); }
  .err { margin: 0 14px 10px; padding: 8px 10px; border-radius: 9px; background: rgba(240,68,97,.1); color: var(--spelling); font-size: 12.5px; }

  /* Selection toolbar + AI result */
  .toolbar { display: flex; align-items: center; gap: 2px; padding: 4px; border-radius: 12px; }
  .toolbar .mode { background: none; padding: 6px 9px; }
  .toolbar .mode:hover { background: var(--bg2); transform: none; }
  .toolbar .sep { width: 1px; height: 18px; background: var(--line); margin: 0 2px; }
  .result { width: 360px; padding: 14px; }
  .result .body { background: var(--bg2); border-radius: 10px; padding: 10px 12px; max-height: 220px; overflow: auto; white-space: pre-wrap; margin: 8px 0 10px; }
  .actions { display: flex; gap: 6px; }
  .actions .primary { width: auto; flex: 1; }
  .shimmer { height: 12px; border-radius: 6px; margin: 8px 0; background: linear-gradient(90deg, var(--bg2), var(--line), var(--bg2)); background-size: 200% 100%; animation: sh 1.1s linear infinite; }
  @keyframes sh { to { background-position: -200% 0 } }
  `;

  let rootHost, root, $layer, $mirror, $badge, $card, $panel, $toolbar, $result;

  function ensureUI() {
    if (rootHost?.isConnected) return;
    rootHost = document.createElement('inkling-root');
    rootHost.style.cssText = 'all:initial;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483646;';
    root = rootHost.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${CSS}</style><div class="wrap">
      <div class="layer"></div><div class="mirror"></div>
      <button class="badge" hidden aria-label="Inkling suggestions"></button>
      <div class="card" hidden role="dialog"></div>
      <div class="panel" hidden role="dialog"></div>
      <div class="toolbar" hidden></div>
      <div class="result" hidden role="dialog"></div></div>`;
    const q = (s) => root.querySelector(s);
    [$layer, $mirror, $badge, $card, $panel, $toolbar, $result] = ['.layer', '.mirror', '.badge', '.card', '.panel', '.toolbar', '.result'].map(q);
    document.documentElement.appendChild(rootHost);

    // Clicking our UI must not steal focus or selection from the field.
    root.addEventListener('mousedown', (e) => e.preventDefault());
    $badge.addEventListener('click', togglePanel);
    for (const el of [$card, $panel]) {
      el.addEventListener('mouseenter', () => clearTimeout(hideCardTimer));
    }
    $card.addEventListener('mouseleave', () => scheduleHideCard());
  }

  function teardown() {
    hideAll();
    if ($layer) $layer.textContent = '';
    if ($badge) $badge.hidden = true;
    active = null;
  }

  /* ================================================================ */
  /* Editable fields and their text model                              */
  /* ================================================================ */

  const TEXT_INPUTS = new Set(['text', '']);
  const BLOCKS = new Set(['DIV', 'P', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'TR', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'TABLE']);

  function editableFrom(target) {
    if (!target || target.nodeType !== 1) return null;
    if (target.tagName === 'TEXTAREA') return target.readOnly || target.disabled ? null : target;
    if (target.tagName === 'INPUT') {
      const t = (target.getAttribute('type') || '').toLowerCase();
      return TEXT_INPUTS.has(t) && !target.readOnly && !target.disabled ? target : null;
    }
    if (target.isContentEditable) {
      let el = target;
      while (el.parentElement && el.parentElement.isContentEditable) el = el.parentElement;
      return el;
    }
    return null;
  }

  const isControl = (el) => el.tagName === 'TEXTAREA' || el.tagName === 'INPUT';

  function buildModel(el) {
    if (isControl(el)) return { text: el.value, segs: null };
    const segs = [];
    let text = '';
    const walk = (node) => {
      for (let n = node.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) {
          segs.push({ node: n, start: text.length });
          text += n.data;
        } else if (n.nodeType === 1) {
          if (n.tagName === 'BR') {
            text += '\n';
            continue;
          }
          if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(n.tagName) || n.getAttribute('contenteditable') === 'false') continue;
          const block = BLOCKS.has(n.tagName);
          if (block && text && !text.endsWith('\n')) text += '\n';
          walk(n);
          if (block && text && !text.endsWith('\n')) text += '\n';
        }
      }
    };
    walk(el);
    return { text, segs };
  }

  function pointAt(model, offset) {
    const { segs } = model;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      const end = s.start + s.node.data.length;
      if (offset >= s.start && offset <= end) {
        // Prefer starting a range at the beginning of the next node rather than the end of this one.
        if (offset === end && segs[i + 1] && segs[i + 1].start === end) continue;
        return { node: s.node, offset: offset - s.start };
      }
    }
    const last = segs[segs.length - 1];
    return last ? { node: last.node, offset: last.node.data.length } : null;
  }

  function rangeFor(model, start, end) {
    const a = pointAt(model, start);
    const b = pointAt(model, end);
    if (!a || !b) return null;
    const r = document.createRange();
    try {
      r.setStart(a.node, a.offset);
      r.setEnd(b.node, b.offset);
    } catch {
      return null;
    }
    return r;
  }

  function offsetOfPoint(model, node, off) {
    const s = model.segs?.find((x) => x.node === node);
    return s ? s.start + off : -1;
  }

  /* Rects for character ranges inside <textarea>/<input> via a mirror div. */
  const MIRROR_PROPS = ['fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'fontFamily', 'fontFeatureSettings',
    'lineHeight', 'textAlign', 'textTransform', 'textIndent', 'letterSpacing', 'wordSpacing', 'tabSize', 'wordBreak',
    'overflowWrap', 'direction', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle'];

  function controlRects(el, text, ranges) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const m = $mirror;
    for (const p of MIRROR_PROPS) m.style[p] = cs[p];
    const bl = parseFloat(cs.borderLeftWidth) || 0;
    const br = parseFloat(cs.borderRightWidth) || 0;
    const scrollbar = Math.max(0, el.offsetWidth - el.clientWidth - bl - br);
    Object.assign(m.style, {
      boxSizing: 'border-box', left: `${r.left}px`, top: `${r.top}px`,
      width: `${r.width - scrollbar}px`, height: `${r.height}px`,
      whiteSpace: el.tagName === 'INPUT' ? 'pre' : 'pre-wrap',
    });
    if (el.tagName === 'INPUT') {
      const inner = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      m.style.lineHeight = `${inner}px`;
    }
    m.textContent = '';
    const order = ranges.map((rg, i) => [rg, i]).sort((a, b) => a[0][0] - b[0][0]);
    const spans = new Array(ranges.length).fill(null);
    let pos = 0;
    for (const [[s, e], i] of order) {
      if (s < pos) continue; // overlapping, skip
      m.append(text.slice(pos, s));
      const sp = document.createElement('span');
      sp.textContent = text.slice(s, e);
      m.append(sp);
      spans[i] = sp;
      pos = e;
    }
    m.append(text.slice(pos) + '​');
    m.scrollTop = el.scrollTop;
    m.scrollLeft = el.scrollLeft;
    return spans.map((sp) => (sp ? Array.from(sp.getClientRects()) : []));
  }

  function rectsForRanges(st, ranges) {
    if (st.control) return controlRects(st.el, st.text, ranges);
    const model = buildModel(st.el);
    return ranges.map(([s, e]) => {
      const rg = rangeFor(model, s, e);
      return rg ? Array.from(rg.getClientRects()).filter((x) => x.width > 0) : [];
    });
  }

  /* ================================================================ */
  /* State + checking                                                  */
  /* ================================================================ */

  let active = null;
  const states = new WeakMap();
  const ignored = new Set();
  const issueKey = (i) => `${i.rule}|${i.original}`;

  function stateFor(el) {
    let st = states.get(el);
    if (!st) {
      st = { el, control: isControl(el), text: '', rawIssues: [], issues: [], rects: [], req: 0, checking: false, error: null, timer: 0 };
      states.set(el, st);
    }
    return st;
  }

  function getText(st) {
    st.text = isControl(st.el) ? st.el.value : buildModel(st.el).text;
    return st.text;
  }

  function filterIssues(list) {
    const dict = new Set((settings.dictionary || []).map((w) => w.toLowerCase()));
    return list.filter((i) =>
      settings.categories[i.category] !== false &&
      !ignored.has(issueKey(i)) &&
      !(i.category === 'spelling' && dict.has(i.original.toLowerCase())));
  }

  function shiftIssues(list, oldT, newT) {
    if (oldT === newT) return list;
    let p = 0;
    const min = Math.min(oldT.length, newT.length);
    while (p < min && oldT[p] === newT[p]) p++;
    let s = 0;
    while (s < min - p && oldT[oldT.length - 1 - s] === newT[newT.length - 1 - s]) s++;
    const oldEnd = oldT.length - s;
    const delta = newT.length - oldT.length;
    return list
      // keep issues fully before the edit, or starting after it; drop the ones it touched
      .filter((i) => i.offset + i.length < p || (i.offset >= oldEnd && i.offset > p))
      .map((i) => (i.offset >= oldEnd ? { ...i, offset: i.offset + delta } : i));
  }

  function scheduleCheck(st, delay) {
    clearTimeout(st.timer);
    st.timer = setTimeout(() => runCheck(st), delay ?? (settings.checkEngine === 'ai' ? 1400 : 800));
  }

  async function runCheck(st) {
    if (!isOn()) return;
    const text = getText(st);
    if (text.trim().split(/\s+/).filter(Boolean).length < 2) {
      st.rawIssues = st.issues = [];
      st.error = null;
      scheduleRender();
      return;
    }
    const sent = text.slice(0, 18000);
    const id = ++st.req;
    st.checking = true;
    renderBadge();
    const res = await send({ type: 'check', text: sent });
    if (id !== st.req) return;
    st.checking = false;
    if (!res.ok) {
      st.error = res.error;
    } else {
      st.error = null;
      const now = getText(st);
      const before = st.issues.length;
      st.rawIssues = shiftIssues(res.issues, sent, now);
      st.issues = filterIssues(st.rawIssues);
      if (st.issues.length > before) st.pop = true;
    }
    if (st === active) {
      scheduleRender();
      if (!$panel.hidden) renderPanel();
    }
  }

  function onEdit(st) {
    const old = st.text;
    const now = getText(st);
    st.rawIssues = shiftIssues(st.rawIssues, old, now);
    st.issues = filterIssues(st.rawIssues);
    hideCard();
    scheduleRender();
    scheduleCheck(st);
  }

  /* ================================================================ */
  /* Rendering                                                         */
  /* ================================================================ */

  let raf = 0;
  let hoverIssue = null;

  function scheduleRender() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      render();
    });
  }

  function visible(r, box) {
    return r.bottom > box.top + 1 && r.top < box.bottom - 1 && r.right > box.left && r.left < box.right;
  }

  function render() {
    if (!active || !$layer) return;
    const st = active;
    if (!st.el.isConnected) return teardown();
    const box = st.el.getBoundingClientRect();
    const frag = document.createDocumentFragment();
    st.rects = [];
    if (st.issues.length && box.width && box.height) {
      getText(st);
      const all = rectsForRanges(st, st.issues.map((i) => [i.offset, i.offset + i.length]));
      st.issues.forEach((iss, idx) => {
        const rects = all[idx].filter((r) => visible(r, box));
        if (!rects.length) return;
        st.rects.push({ issue: iss, rects });
        for (const r of rects) {
          if (hoverIssue && issueKey(hoverIssue) === issueKey(iss) && hoverIssue.offset === iss.offset) {
            const h = document.createElement('div');
            h.className = `hl c-${iss.category}`;
            Object.assign(h.style, { left: `${r.left - 1}px`, top: `${r.top}px`, width: `${r.width + 2}px`, height: `${r.height}px` });
            frag.append(h);
          }
          const u = document.createElement('div');
          u.className = `ul c-${iss.category}`;
          Object.assign(u.style, { left: `${r.left}px`, top: `${Math.min(r.bottom - 1, box.bottom - 3)}px`, width: `${r.width}px` });
          frag.append(u);
        }
      });
    }
    $layer.replaceChildren(frag);
    renderBadge();
  }

  function renderBadge() {
    if (!active || !$badge) return;
    const st = active;
    const box = st.el.getBoundingClientRect();
    const focused = deepActive() === st.el || !$panel.hidden;
    const onScreen = box.bottom > 0 && box.top < innerHeight && box.width > 60;
    if (!focused || !onScreen || !isOn()) {
      $badge.hidden = true;
      return;
    }
    const small = box.height < 44;
    const size = small ? 22 : 28;
    const x = box.right - size - (small ? 6 : 10);
    const y = small ? box.top + (box.height - size) / 2 : box.bottom - size - 10;
    const n = st.issues.length;
    const mood = st.checking ? 'think' : st.error ? 'sad' : n ? 'alert' : 'happy';
    const count = st.checking && !n ? '' : n ? `<span class="count">${n > 99 ? '99+' : n}</span>` : st.text.trim() && !st.error ? '<span class="count ok">✓</span>' : '';
    const html = inky(mood, size) + count;
    if ($badge.dataset.html !== html) {
      $badge.innerHTML = html;
      $badge.dataset.html = html;
    }
    $badge.className = `badge${small ? ' small' : ''}${st.checking ? ' busy' : ''}${st.pop ? ' pop' : ''}`;
    st.pop = false;
    $badge.title = st.error ? `Inkling: ${st.error}` : n ? `${n} suggestion${n > 1 ? 's' : ''}` : 'Inkling';
    Object.assign($badge.style, { left: `${x}px`, top: `${y}px` });
    $badge.hidden = false;
  }

  function deepActive() {
    let a = document.activeElement;
    while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
    return editableFrom(a) || a;
  }

  /* ================================================================ */
  /* Suggestion card                                                   */
  /* ================================================================ */

  const CAT_LABEL = { spelling: 'Spelling', grammar: 'Grammar', punctuation: 'Punctuation', style: 'Clarity' };
  let hideCardTimer = 0;
  let cardIssue = null;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shown = (s) => (s === '' ? '(remove)' : s.replace(/ /g, ' '));

  function place(el, anchor, { gap = 8, prefer = 'below', align = 'left' } = {}) {
    el.style.left = '0px';
    el.style.top = '-9999px';
    el.hidden = false;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let left = align === 'right' ? anchor.right - w : anchor.left;
    left = Math.max(8, Math.min(left, innerWidth - w - 8));
    const below = anchor.bottom + gap;
    const above = anchor.top - gap - h;
    let top = prefer === 'below' ? (below + h < innerHeight - 8 || above < 8 ? below : above) : (above > 8 ? above : below);
    top = Math.max(8, Math.min(top, innerHeight - h - 8));
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }

  function showCard(issue, anchor) {
    if (!$card) return;
    clearTimeout(hideCardTimer);
    if (cardIssue === issue && !$card.hidden) return;
    cardIssue = issue;
    hoverIssue = issue;
    scheduleRender();
    const reps = issue.replacements || [];
    const color = `var(--${issue.category})`;
    $card.innerHTML = `
      <div class="head"><span class="dot" style="background:${color}"></span><span class="cat">${CAT_LABEL[issue.category] || 'Suggestion'}</span>
        <button class="x" data-a="close" aria-label="Close">×</button></div>
      <div class="title">${esc(issue.title)}</div>
      ${issue.message && issue.message !== issue.title ? `<div class="msg">${esc(issue.message)}</div>` : ''}
      ${reps.length ? `<div class="fix"><span class="orig">${esc(shown(issue.original))}</span><span class="arrow">→</span>
        ${reps.map((r, i) => `<button class="chip${i ? ' alt' : ''}" data-a="apply" data-i="${i}">${esc(shown(r))}</button>`).join('')}</div>` : ''}
      <div class="foot"><button class="ghost" data-a="ignore">Ignore</button>
        ${issue.category === 'spelling' ? '<button class="ghost" data-a="dict">Add to dictionary</button>' : ''}
        <span class="brand">${inky('happy', 18)}</span></div>`;
    $card.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const a = b.dataset.a;
      if (a === 'close') hideCard();
      if (a === 'apply') applyIssue(issue, reps[+b.dataset.i]);
      if (a === 'ignore') ignoreIssue(issue);
      if (a === 'dict') addToDictionary(issue.original);
    };
    $panel.hidden = true;
    place($card, anchor, { gap: 6 });
  }

  function hideCard() {
    if ($card) $card.hidden = true;
    cardIssue = null;
    if (hoverIssue) {
      hoverIssue = null;
      scheduleRender();
    }
  }

  function scheduleHideCard() {
    clearTimeout(hideCardTimer);
    hideCardTimer = setTimeout(hideCard, 320);
  }

  function hideAll() {
    hideCard();
    if ($panel) $panel.hidden = true;
    if ($toolbar) $toolbar.hidden = true;
    if ($result) $result.hidden = true;
  }

  /* ================================================================ */
  /* Editing the field                                                 */
  /* ================================================================ */

  function replaceRange(st, start, end, text) {
    const el = st.el;
    el.focus({ preventScroll: true });
    let ok = false;
    if (st.control) {
      el.setSelectionRange(start, end);
      ok = text === '' ? document.execCommand('delete') : document.execCommand('insertText', false, text);
      if (!ok) {
        el.setRangeText(text, start, end, 'end');
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: text }));
      }
    } else {
      const rg = rangeFor(buildModel(el), start, end);
      if (!rg) return;
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(rg);
      ok = text === '' ? document.execCommand('delete') : document.execCommand('insertText', false, text);
      if (!ok) {
        rg.deleteContents();
        rg.insertNode(document.createTextNode(text));
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: text }));
      }
    }
  }

  function applyIssue(issue, replacement, silent) {
    const st = active;
    if (!st) return;
    const now = getText(st);
    if (now.slice(issue.offset, issue.offset + issue.length) !== issue.original) return;
    replaceRange(st, issue.offset, issue.offset + issue.length, replacement);
    if (!silent) send({ type: 'fixed', count: 1 });
    onEdit(st);
    hideCard();
    if (!$panel.hidden) renderPanel();
  }

  function fixAll() {
    const st = active;
    if (!st) return;
    const todo = st.issues.filter((i) => i.replacements?.length).sort((a, b) => b.offset - a.offset);
    let lastStart = Infinity;
    let n = 0;
    for (const i of todo) {
      if (i.offset + i.length > lastStart) continue; // overlapping
      applyIssue(i, i.replacements[0], true);
      lastStart = i.offset;
      n++;
    }
    if (n) send({ type: 'fixed', count: n });
    renderPanel();
  }

  function ignoreIssue(issue) {
    ignored.add(issueKey(issue));
    if (active) active.issues = filterIssues(active.rawIssues);
    hideCard();
    scheduleRender();
    if (!$panel.hidden) renderPanel();
  }

  async function addToDictionary(word) {
    const dictionary = Array.from(new Set([...(settings.dictionary || []), word]));
    settings.dictionary = dictionary;
    try {
      await chrome.storage.sync.set({ dictionary });
    } catch {}
    if (active) active.issues = filterIssues(active.rawIssues);
    hideCard();
    scheduleRender();
  }

  /* ================================================================ */
  /* Panel (click on Inky)                                             */
  /* ================================================================ */

  const MODES = [
    ['improve', '✨ Improve'],
    ['shorten', '✂️ Shorter'],
    ['formal', '👔 Formal'],
    ['friendly', '😊 Friendly'],
    ['confident', '💪 Confident'],
  ];

  function togglePanel() {
    if (!$panel.hidden) {
      $panel.hidden = true;
      return;
    }
    hideCard();
    $result.hidden = true;
    renderPanel();
  }

  function renderPanel() {
    const st = active;
    if (!st) return;
    const n = st.issues.length;
    const counts = {};
    for (const i of st.issues) counts[i.category] = (counts[i.category] || 0) + 1;
    const fixable = st.issues.filter((i) => i.replacements?.length).length;
    const head = n
      ? `<div><div class="t">${n} suggestion${n > 1 ? 's' : ''}</div><div class="s">Hover an underline or pick one below.</div></div>`
      : `<div><div class="t">${st.checking ? 'Reading…' : 'Hi, I’m Inky!'}</div><div class="s">${st.checking ? 'Checking your writing' : 'I didn’t find any problems.'}</div></div>`;
    $panel.innerHTML = `
      <div class="p-head">${inky(st.checking ? 'think' : n ? 'alert' : 'happy', 40)}${head}
        <button class="x" data-a="close" aria-label="Close" style="align-self:flex-start">×</button></div>
      ${st.error ? `<div class="err">${esc(st.error)}</div>` : ''}
      ${n ? `<div class="pills">${Object.entries(counts).map(([c, k]) => `<span class="pill"><span class="dot" style="background:var(--${c})"></span>${CAT_LABEL[c]} ${k}</span>`).join('')}</div>
      <div class="list">${st.issues.map((i, idx) => `
        <button class="row" data-a="row" data-i="${idx}"><span class="dot" style="background:var(--${i.category})"></span>
          <span class="txt"><div class="ln"><span class="orig">${esc(i.original)}</span>${i.replacements?.length ? ` <span class="arrow">→</span> <span class="new">${esc(shown(i.replacements[0]))}</span>` : ''}</div>
          <div class="sub">${esc(i.title)}</div></span></button>`).join('')}</div>
      ${fixable > 1 ? `<div class="section"><button class="primary" data-a="fixall">Fix all ${fixable} suggestions</button></div>` : ''}`
      : `<div class="empty">${st.checking ? '<div class="shimmer"></div><div class="shimmer" style="width:70%"></div>' : '<div class="big">Nothing to fix ✨</div>I’ll keep checking as you type.'}</div>`}
      <div class="section"><div class="label">Rewrite whole text with AI</div>
        ${aiReady ? `<div class="modes">${MODES.map(([m, l]) => `<button class="mode" data-a="mode" data-m="${m}">${l}</button>`).join('')}</div>`
        : `<button class="mode" data-a="opts">🔑 Add a Claude or OpenAI key to unlock rewrites</button>`}</div>
      <div class="p-foot">${/^https?:$/.test(location.protocol) ? `<button class="ghost" data-a="pause">Pause on ${esc(host)}</button>` : '<span></span>'}<button class="ghost" data-a="opts">Settings</button></div>`;
    $panel.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const a = b.dataset.a;
      if (a === 'close') $panel.hidden = true;
      if (a === 'row') {
        const iss = st.issues[+b.dataset.i];
        if (iss?.replacements?.length) applyIssue(iss, iss.replacements[0]);
      }
      if (a === 'fixall') fixAll();
      if (a === 'mode') {
        $panel.hidden = true;
        const text = getText(st);
        startRewrite(st, 0, text.length, text, b.dataset.m, $badge.getBoundingClientRect());
      }
      if (a === 'opts') send({ type: 'openOptions' });
      if (a === 'pause') {
        const disabledSites = Array.from(new Set([...(settings.disabledSites || []), host]));
        chrome.storage.sync.set({ disabledSites }).catch(() => {});
      }
    };
    $panel.onmouseover = (e) => {
      const b = e.target.closest('.row');
      const iss = b ? st.issues[+b.dataset.i] : null;
      if (iss !== hoverIssue) {
        hoverIssue = iss;
        scheduleRender();
      }
    };
    $panel.onmouseleave = () => {
      hoverIssue = null;
      scheduleRender();
    };
    const wasHidden = $panel.hidden;
    place($panel, $badge.getBoundingClientRect(), { prefer: 'above', align: 'right' });
    if (!wasHidden) $panel.style.animation = 'none';
    else $panel.style.animation = '';
  }

  /* ================================================================ */
  /* Selection toolbar + AI rewrite                                    */
  /* ================================================================ */

  function selectionInfo(st) {
    if (st.control) {
      const s = st.el.selectionStart;
      const e = st.el.selectionEnd;
      if (s == null || e - s < 3) return null;
      const text = st.el.value.slice(s, e);
      const rect = rectsForRanges(st, [[s, e]])[0];
      return { start: s, end: e, text, rects: rect };
    }
    const sel = getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return null;
    const rg = sel.getRangeAt(0);
    if (!st.el.contains(rg.commonAncestorContainer)) return null;
    const model = buildModel(st.el);
    const s = offsetOfPoint(model, rg.startContainer, rg.startOffset);
    const e = offsetOfPoint(model, rg.endContainer, rg.endOffset);
    if (s < 0 || e < 0 || e - s < 3) return null;
    return { start: s, end: e, text: model.text.slice(s, e), rects: Array.from(rg.getClientRects()) };
  }

  function maybeShowToolbar() {
    if (!active || !aiReady || !isOn()) return;
    const info = selectionInfo(active);
    if (!info || info.text.trim().split(/\s+/).length < 2 || !info.rects.length) {
      $toolbar.hidden = true;
      return;
    }
    const first = info.rects[0];
    $toolbar.innerHTML = `${inky('happy', 22)}<span class="sep"></span>${MODES.slice(0, 4).map(([m, l]) => `<button class="mode" data-m="${m}">${l}</button>`).join('')}`;
    $toolbar.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      $toolbar.hidden = true;
      startRewrite(active, info.start, info.end, info.text, b.dataset.m, first);
    };
    hideCard();
    $panel.hidden = true;
    place($toolbar, first, { prefer: 'above' });
  }

  async function startRewrite(st, start, end, original, mode, anchor) {
    const label = (MODES.find(([m]) => m === mode) || MODES[0])[1];
    $result.innerHTML = `<div class="head">${inky('think', 22)}<span class="cat">${label}</span><button class="x" data-a="close">×</button></div>
      <div class="shimmer"></div><div class="shimmer" style="width:85%"></div><div class="shimmer" style="width:60%"></div>`;
    $result.onclick = (e) => {
      if (e.target.closest('[data-a=close]')) $result.hidden = true;
    };
    place($result, anchor, { prefer: 'below' });
    const res = await send({ type: 'rewrite', text: original, mode });
    if ($result.hidden) return;
    if (!res.ok) {
      $result.innerHTML = `<div class="head">${inky('sad', 22)}<span class="cat">Couldn’t rewrite</span><button class="x" data-a="close">×</button></div>
        <div class="err" style="margin:8px 0 4px">${esc(res.error)}</div>`;
      return;
    }
    const out = res.text;
    $result.innerHTML = `<div class="head">${inky('happy', 22)}<span class="cat">${label}</span><button class="x" data-a="close">×</button></div>
      <div class="body">${esc(out)}</div>
      <div class="actions"><button class="primary" data-a="replace">Replace</button>
        <button class="chip alt" data-a="copy">Copy</button><button class="chip alt" data-a="retry">Try again</button></div>`;
    $result.onclick = async (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const a = b.dataset.a;
      if (a === 'close') $result.hidden = true;
      if (a === 'copy') {
        await navigator.clipboard.writeText(out).catch(() => {});
        b.textContent = 'Copied ✓';
      }
      if (a === 'retry') startRewrite(st, start, end, original, mode, anchor);
      if (a === 'replace') {
        const now = getText(st);
        if (now.slice(start, end) !== original) {
          b.textContent = 'The text changed, so select it again';
          return;
        }
        replaceRange(st, start, end, out);
        send({ type: 'fixed', count: 1 });
        onEdit(st);
        $result.hidden = true;
      }
    };
    place($result, anchor, { prefer: 'below' });
  }

  /* ================================================================ */
  /* Events                                                            */
  /* ================================================================ */

  const pathTarget = (e) => (e.composedPath ? e.composedPath()[0] : e.target);
  const fromOurUI = (e) => rootHost && e.composedPath && e.composedPath().includes(rootHost);

  document.addEventListener('focusin', (e) => {
    if (!isOn() || fromOurUI(e)) return;
    const el = editableFrom(pathTarget(e));
    if (!el) return;
    ensureUI();
    if (active?.el !== el) {
      hideAll();
      active = stateFor(el);
      try {
        resizeObs.disconnect();
        resizeObs.observe(el);
      } catch {}
      if (!active.rawIssues.length || active.text !== getText(active)) scheduleCheck(active, 250);
    }
    scheduleRender();
  }, true);

  document.addEventListener('focusout', () => setTimeout(() => renderBadge(), 120), true);

  document.addEventListener('input', (e) => {
    if (!active || !isOn()) return;
    const el = editableFrom(pathTarget(e));
    if (el === active.el) onEdit(active);
  }, true);

  document.addEventListener('mousemove', (e) => {
    if (!active || !active.rects.length || !$card) return;
    const { clientX: x, clientY: y } = e;
    const hit = active.rects.find(({ rects }) => rects.some((r) => x >= r.left - 1 && x <= r.right + 1 && y >= r.top - 1 && y <= r.bottom + 3));
    if (hit) {
      clearTimeout(hideCardTimer);
      if (cardIssue !== hit.issue) {
        clearTimeout(showTimer);
        showTimer = setTimeout(() => showCard(hit.issue, hit.rects[hit.rects.length - 1]), 180);
      }
    } else {
      clearTimeout(showTimer);
      if (!$card.hidden && !fromOurUI(e)) scheduleHideCard();
    }
  }, { passive: true, capture: true });
  let showTimer = 0;

  document.addEventListener('mousedown', (e) => {
    if (fromOurUI(e)) return;
    $toolbar && ($toolbar.hidden = true);
    if ($panel && !$panel.hidden) $panel.hidden = true;
    if ($result && !$result.hidden) $result.hidden = true;
  }, true);

  document.addEventListener('mouseup', (e) => {
    if (fromOurUI(e)) return;
    setTimeout(maybeShowToolbar, 10);
  }, true);

  document.addEventListener('keyup', (e) => {
    if (e.key === 'Escape') return hideAll();
    if (e.shiftKey || e.key === 'Shift') setTimeout(maybeShowToolbar, 10);
  }, true);

  const onMove = () => {
    if (!active) return;
    scheduleRender();
    if ($toolbar && !$toolbar.hidden) $toolbar.hidden = true;
  };
  addEventListener('scroll', onMove, { capture: true, passive: true });
  addEventListener('resize', onMove, { passive: true });
  const resizeObs = new ResizeObserver(() => scheduleRender());
  setInterval(() => {
    if (active && document.visibilityState === 'visible') scheduleRender();
  }, 700);
})();
