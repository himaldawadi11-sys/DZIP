// DZIP — Distraction Zipper
// Focus mode + Task-Locked exit + persistent zips + Isolate mode

const ZIPPED_ATTR = 'data-dzip-zipped';
const ISOLATE_ATTR = 'data-dzip-isolate-hidden';
const HOSTNAME = location.hostname;
const ZIPS_KEY = `dzip_zips_${HOSTNAME}`;

let pickerActive = false;
let pickerMode = 'zip'; // 'zip' | 'isolate'
let hoveredEl = null;
let host = null;
let shadow = null;
let highlightBox = null;
let zipCounter = 0;
let focusState = { active: false, tasks: [] };
let overlayHost = null;
let floatBtnHost = null;

function cssPath(el) {
  if (!(el instanceof Element)) return null;
  const path = [];
  while (el && el.nodeType === Node.ELEMENT_NODE && el !== document.body) {
    let selector = el.nodeName.toLowerCase();
    if (el.id) { selector += '#' + el.id; path.unshift(selector); break; }
    let sibling = el, nth = 1;
    while ((sibling = sibling.previousElementSibling)) {
      if (sibling.nodeName.toLowerCase() === selector) nth++;
    }
    selector += `:nth-of-type(${nth})`;
    path.unshift(selector);
    el = el.parentElement;
  }
  return path.join(' > ');
}

function getZips() {
  return new Promise(r => chrome.storage.local.get([ZIPS_KEY], res => r(res[ZIPS_KEY] || [])));
}
function saveZips(zips) { chrome.storage.local.set({ [ZIPS_KEY]: zips }); }

async function reapplyZips() {
  const zips = await getZips();
  zips.forEach(({ selector }) => {
    try {
      const el = document.querySelector(selector);
      if (el && !el.hasAttribute(ZIPPED_ATTR)) applyZipStyles(el, selector);
    } catch (e) {}
  });
}

function applyZipStyles(el, selector) {
  zipCounter++;
  const id = 'dzip-' + zipCounter;
  el.setAttribute(ZIPPED_ATTR, id);
  el.style.display = 'none';
  const bar = document.createElement('div');
  bar.className = 'dzip-unzip-bar';
  bar.textContent = 'Zipped. Click to unzip';
  bar.addEventListener('click', () => unzipElement(id, bar, selector));
  el.insertAdjacentElement('beforebegin', bar);
}

async function zipElement(el) {
  const selector = cssPath(el);
  applyZipStyles(el, selector);
  if (selector) {
    const zips = await getZips();
    zips.push({ selector });
    saveZips(zips);
  }
}

async function unzipElement(id, bar, selector) {
  const el = document.querySelector(`[${ZIPPED_ATTR}="${id}"]`);
  if (el) { el.style.display = ''; el.removeAttribute(ZIPPED_ATTR); }
  bar.remove();
  if (selector) {
    const zips = await getZips();
    saveZips(zips.filter(z => z.selector !== selector));
  }
}

function isolateElement(target) {
  let el = target;
  while (el && el.parentElement && el !== document.body) {
    const parent = el.parentElement;
    Array.from(parent.children).forEach(sib => {
      if (sib !== el && !sib.hasAttribute(ISOLATE_ATTR) && sib.style.display !== 'none') {
        sib.setAttribute(ISOLATE_ATTR, '1');
        sib.dataset.dzipPrevDisplay = sib.style.display || '';
        sib.style.display = 'none';
      }
    });
    el = parent;
  }
}

function restoreIsolate() {
  document.querySelectorAll(`[${ISOLATE_ATTR}]`).forEach(el => {
    el.style.display = el.dataset.dzipPrevDisplay || '';
    el.removeAttribute(ISOLATE_ATTR);
    delete el.dataset.dzipPrevDisplay;
  });
}

function initShadowHighlighter() {
  if (host) return;
  host = document.createElement('div');
  host.style.cssText = 'position:fixed; top:0; left:0; width:0; height:0; z-index:2147483647; pointer-events:none;';
  document.documentElement.appendChild(host);
  shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `.box { position:fixed; border:2px solid #3b82f6; background:rgba(59,130,246,0.15);
    pointer-events:none; border-radius:4px; transition: all 0.05s ease-out; }
    .box.isolate { border-color:#22c55e; background:rgba(34,197,94,0.15); }`;
  shadow.appendChild(style);
  highlightBox = document.createElement('div');
  highlightBox.className = 'box';
  highlightBox.style.display = 'none';
  shadow.appendChild(highlightBox);
}

function updateHighlight(el) {
  if (!el) { highlightBox.style.display = 'none'; return; }
  highlightBox.className = pickerMode === 'isolate' ? 'box isolate' : 'box';
  const rect = el.getBoundingClientRect();
  highlightBox.style.display = 'block';
  highlightBox.style.top = rect.top + 'px';
  highlightBox.style.left = rect.left + 'px';
  highlightBox.style.width = rect.width + 'px';
  highlightBox.style.height = rect.height + 'px';
}

function handleMouseMove(e) {
  if (!pickerActive) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el || el === host) return;
  hoveredEl = el;
  updateHighlight(hoveredEl);
}

function handleClick(e) {
  if (!pickerActive || !hoveredEl) return;
  e.preventDefault();
  e.stopPropagation();
  if (pickerMode === 'isolate') isolateElement(hoveredEl);
  else zipElement(hoveredEl);
  stopPicker();
}

function handlePickerKeydown(e) {
  if (!pickerActive) return;
  if (e.key === 'Escape') stopPicker();
  else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (hoveredEl && hoveredEl.parentElement && hoveredEl.parentElement !== document.body) {
      hoveredEl = hoveredEl.parentElement;
      updateHighlight(hoveredEl);
    }
  }
}

function startPicker(mode) {
  pickerMode = mode;
  initShadowHighlighter();
  pickerActive = true;
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handlePickerKeydown, true);
  document.body.style.cursor = 'crosshair';
}

function stopPicker() {
  pickerActive = false;
  hoveredEl = null;
  if (highlightBox) highlightBox.style.display = 'none';
  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handlePickerKeydown, true);
  document.body.style.cursor = '';
}

document.addEventListener('keydown', e => {
  if (e.altKey && e.shiftKey && e.code === 'KeyZ' && focusState.active) startPicker('zip');
});

function getFocusState() {
  return new Promise(r => chrome.storage.local.get(['dzip_focus_state'], res =>
    r(res.dzip_focus_state || { active: false, tasks: [] })));
}
function saveFocusState(state) { chrome.storage.local.set({ dzip_focus_state: state }); }

function makeOverlayHost() {
  if (overlayHost) return overlayHost.shadowRoot;
  overlayHost = document.createElement('div');
  overlayHost.id = 'dzip-overlay-host';
  overlayHost.style.cssText = 'position:fixed; inset:0; z-index:2147483647;';
  document.documentElement.appendChild(overlayHost);
  const root = overlayHost.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; }
    .backdrop { position:fixed; inset:0; background:rgba(10,10,15,0.75); pointer-events:auto;
      display:flex; align-items:center; justify-content:center; font-family: system-ui, sans-serif; }
    .card { background:#17181c; color:#eee; width:420px; max-width:90vw; border-radius:14px;
      padding:24px; box-shadow:0 20px 60px rgba(0,0,0,0.5); position:relative; }
    .card h2 { margin:0 0 6px; font-size:18px; }
    .card p.sub { margin:0 0 16px; color:#9a9a9a; font-size:13px; }
    textarea { width:100%; min-height:100px; background:#0e0f12; color:#eee; border:1px solid #333;
      border-radius:8px; padding:10px; font:13px system-ui; resize:vertical; }
    button { margin-top:14px; width:100%; padding:10px; border:none; border-radius:8px;
      background:#3b82f6; color:#fff; font-size:14px; cursor:pointer; font-weight:600; }
    button:disabled { background:#333; color:#777; cursor:not-allowed; }
    button.secondary { background:#2a2a2e; margin-top:8px; }
    .task-item { background:#0e0f12; border:1px solid #2a2a2e; border-radius:8px; padding:10px; margin-bottom:8px; }
    .task-item .label { font-size:13px; margin-bottom:6px; }
    .task-item .label.done { color:#4ade80; text-decoration: line-through; }
    .task-item input[type=text] { width:100%; background:#0e0f12; color:#eee; border:1px solid #333;
      border-radius:6px; padding:6px 8px; font:12px system-ui; }
    .task-item .mark { font-size:11px; color:#3b82f6; cursor:pointer; margin-top:4px; display:inline-block; }
    .close-x { position:absolute; top:14px; right:16px; color:#777; cursor:pointer; font-size:14px; }
  `;
  root.appendChild(style);
  return root;
}

function clearOverlay() { if (overlayHost) { overlayHost.remove(); overlayHost = null; } }

// Stops keys (especially Space) from reaching the page's own listeners (e.g. video play/pause)
function guardInput(el) {
  ['keydown', 'keyup', 'keypress'].forEach(evt => {
    el.addEventListener(evt, e => e.stopPropagation());
  });
}

function showTaskEntryModal() {
  const root = makeOverlayHost();
  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';
  backdrop.innerHTML = `
    <div class="card">
      <h2>Enter Focus mode</h2>
      <p class="sub">List what you need to do. You're locked in until every task is checked off with proof.</p>
      <textarea placeholder="One task per line..."></textarea>
      <button id="start">Start Focus</button>
    </div>`;
  root.appendChild(backdrop);
  const textarea = root.querySelector('textarea');
  guardInput(textarea);
  root.querySelector('#start').addEventListener('click', async () => {
    const lines = textarea.value.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    focusState = { active: true, tasks: lines.map(text => ({ text, done: false, proof: '' })), startedAt: Date.now() };
    saveFocusState(focusState);
    clearOverlay();
    renderFloatButton();
  });
}

function showChecklistModal() {
  const root = makeOverlayHost();
  const allDone = focusState.tasks.every(t => t.done);
  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `<span class="close-x">✕</span><h2>Focus checklist</h2>
    <p class="sub">Check off each task and type a short proof of completion to unlock exit.</p>`;
  focusState.tasks.forEach((task, i) => {
    const item = document.createElement('div');
    item.className = 'task-item';
    item.innerHTML = `
      <div class="label ${task.done ? 'done' : ''}">${task.text}</div>
      ${task.done
        ? `<div style="font-size:11px;color:#888;">Proof: ${task.proof}</div>`
        : `<input type="text" placeholder="What did you do to finish this?" />
           <span class="mark">Mark complete</span>`}`;
    if (!task.done) {
      const input = item.querySelector('input');
      guardInput(input);
      item.querySelector('.mark').addEventListener('click', () => {
        const val = input.value.trim();
        if (!val) { input.focus(); return; }
        focusState.tasks[i].done = true;
        focusState.tasks[i].proof = val;
        saveFocusState(focusState);
        clearOverlay();
        showChecklistModal();
      });
    }
    card.appendChild(item);
  });

  const isolateBtn = document.createElement('button');
  isolateBtn.className = 'secondary';
  isolateBtn.textContent = 'Isolate: pick the one thing to show';
  isolateBtn.addEventListener('click', () => { clearOverlay(); startPicker('isolate'); });
  card.appendChild(isolateBtn);

  const zipBtn = document.createElement('button');
  zipBtn.className = 'secondary';
  zipBtn.textContent = 'Zip: hide one distracting element';
  zipBtn.addEventListener('click', () => { clearOverlay(); startPicker('zip'); });
  card.appendChild(zipBtn);

  const exitBtn = document.createElement('button');
  exitBtn.textContent = allDone ? 'Exit Focus mode' : `${focusState.tasks.filter(t => !t.done).length} task(s) left`;
  exitBtn.disabled = !allDone;
  exitBtn.addEventListener('click', () => {
    if (!allDone) return;
    focusState = { active: false, tasks: [] };
    saveFocusState(focusState);
    restoreIsolate();
    clearOverlay();
    renderFloatButton();
  });
  card.appendChild(exitBtn);

  backdrop.appendChild(card);
  root.appendChild(backdrop);
  card.querySelector('.close-x').addEventListener('click', clearOverlay);
}

function renderFloatButton() {
  if (floatBtnHost) floatBtnHost.remove();
  floatBtnHost = document.createElement('div');
  floatBtnHost.id = 'dzip-float-host';
  floatBtnHost.style.cssText = 'position:fixed; top:12px; right:12px; z-index:2147483647;';
  document.documentElement.appendChild(floatBtnHost);
  const root = floatBtnHost.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    .pill { font-family: system-ui, sans-serif; font-size:12px; font-weight:600; color:#fff;
      padding:8px 14px; border-radius:999px; cursor:pointer; box-shadow:0 4px 14px rgba(0,0,0,0.35);
      display:flex; align-items:center; gap:6px; user-select:none; }
    .pill.off { background:#111; }
    .pill.on { background:#ef4444; }
  `;
  root.appendChild(style);
  const pill = document.createElement('div');
  pill.className = `pill ${focusState.active ? 'on' : 'off'}`;
  pill.textContent = focusState.active
    ? `Focus — ${focusState.tasks.filter(t => !t.done).length} left`
    : 'Start Focus';
  pill.addEventListener('click', async () => {
    focusState = await getFocusState();
    clearOverlay();
    if (focusState.active) showChecklistModal();
    else showTaskEntryModal();
  });
  root.appendChild(pill);
}

(async function init() {
  focusState = await getFocusState();
  await reapplyZips();
  renderFloatButton(); // always visible, on every page
})();

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'DZIP_TOGGLE') {
    clearOverlay();
    if (focusState.active) showChecklistModal();
    else showTaskEntryModal();
  }
});