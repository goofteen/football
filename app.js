/* ==========================================
   FOOTBALL ROTATION — app.js
   ========================================== */

'use strict';

// ==========================================
// STATE
// ==========================================
let state = {
  fieldSize: 8,
  players: [],
  rounds: [],
  groupName: '',
};

// ==========================================
// ALGORITHM
// ==========================================

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Fair rotation: for round i (GK = players[i]),
 * rest players = players[(i+1)%N] … players[(i+K)%N].
 * Every player is GK exactly once and rests exactly K=(N-fieldSize) times.
 */
function generateSchedule(players, fieldSize) {
  const N = players.length;
  const K = N - fieldSize;
  const rounds = [];

  for (let i = 0; i < N; i++) {
    const gk = players[i];
    const rest = [];
    for (let j = 1; j <= K; j++) rest.push(players[(i + j) % N]);
    const restSet = new Set(rest);
    const outfield = players.filter(p => p !== gk && !restSet.has(p));
    rounds.push({ gk, outfield, rest });
  }

  return rounds;
}

// ==========================================
// LOCAL STORAGE — GROUPS
// ==========================================
const LS_KEY = 'fg_groups';

function loadGroups() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
}

function saveGroup(name, players, fieldSize) {
  const groups = loadGroups().filter(g => g.name !== name);
  groups.unshift({ name, players: [...players], fieldSize, savedAt: new Date().toISOString() });
  localStorage.setItem(LS_KEY, JSON.stringify(groups));
}

function deleteGroup(name) {
  localStorage.setItem(LS_KEY, JSON.stringify(loadGroups().filter(g => g.name !== name)));
}

// ==========================================
// VIEW SWITCHING
// ==========================================
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ==========================================
// SETUP VIEW
// ==========================================
function renderFieldStepper() {
  document.getElementById('field-val').textContent = state.fieldSize;
}

function renderPlayerChips() {
  const list = document.getElementById('player-chips');
  list.innerHTML = '';
  state.players.forEach((name, i) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `
      <span>${escHtml(name)}</span>
      <button class="chip-remove" data-idx="${i}" aria-label="Remove ${escHtml(name)}">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/>
        </svg>
      </button>`;
    list.appendChild(chip);
  });

  const N = state.players.length;
  const badge = document.getElementById('player-count-badge');
  const hint  = document.getElementById('player-count-label');

  if (N === 0) {
    badge.style.display = 'none';
    hint.textContent = '';
  } else {
    badge.style.display = 'inline';
    badge.textContent = N;
    const rest = Math.max(0, N - state.fieldSize);
    hint.textContent = rest > 0
      ? `${rest} player${rest > 1 ? 's' : ''} resting per round`
      : 'Everyone plays every round';
  }
}

function renderGroups() {
  const groups = loadGroups();
  const container = document.getElementById('groups-list');
  const emptyEl   = document.getElementById('groups-empty');
  container.innerHTML = '';

  if (groups.length === 0) {
    container.appendChild(emptyEl);
    return;
  }

  groups.forEach(g => {
    const row = document.createElement('div');
    row.className = 'group-row';
    row.innerHTML = `
      <button class="group-load-btn" data-name="${escHtml(g.name)}">
        <span class="group-name">${escHtml(g.name)}</span>
        <span class="group-meta">${g.players.length} players · field ${g.fieldSize}</span>
      </button>
      <button class="group-delete-btn" data-name="${escHtml(g.name)}" aria-label="Delete ${escHtml(g.name)}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/>
        </svg>
      </button>`;
    container.appendChild(row);
  });
}

// ==========================================
// SCHEDULE VIEW — RENDERING
// ==========================================
function renderSchedule() {
  const N   = state.players.length;
  const K   = N - state.fieldSize;

  document.getElementById('sched-title').textContent =
    state.groupName || 'Schedule';
  document.getElementById('sched-meta').textContent =
    `${N} players · ${state.fieldSize} per side · ${N} rounds`;
  document.getElementById('fairness-strip').textContent =
    `GK 1× each · Rest ${K}× each · Outfield ${state.fieldSize - 1}× each`;

  const list = document.getElementById('rounds-list');
  list.innerHTML = '';
  state.rounds.forEach((round, idx) => {
    list.appendChild(buildRoundCard(round, idx));
  });
}

function buildRoundCard(round, roundIdx) {
  const card = document.createElement('div');
  card.className = 'round-card' + (round.done ? ' done' : '');
  card.dataset.round = roundIdx;

  // ---- Header ----
  const head = document.createElement('div');
  head.className = 'round-card-head';

  const badge = document.createElement('span');
  badge.className = 'round-num-badge';
  badge.textContent = `Round ${roundIdx + 1}`;
  head.appendChild(badge);

  const checkBtn = document.createElement('button');
  checkBtn.className = 'round-check-btn' + (round.done ? ' checked' : '');
  checkBtn.setAttribute('aria-label', round.done ? 'Mark as not played' : 'Mark as played');
  checkBtn.innerHTML = round.done
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg>`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`;
  checkBtn.addEventListener('click', () => toggleRoundDone(roundIdx));
  head.appendChild(checkBtn);

  card.appendChild(head);

  // ---- GK Row ----
  card.appendChild(makeDividerEl());
  card.appendChild(buildZoneRow('gk', round, roundIdx));

  // ---- Rest Row (if any) ----
  if (round.rest.length > 0) {
    card.appendChild(makeDividerEl());
    card.appendChild(buildZoneRow('rest', round, roundIdx));
  }

  return card;
}

function toggleRoundDone(roundIdx) {
  state.rounds[roundIdx].done = !state.rounds[roundIdx].done;
  const card = document.querySelector(`.round-card[data-round="${roundIdx}"]`);
  if (card) card.replaceWith(buildRoundCard(state.rounds[roundIdx], roundIdx));
}

function buildZoneRow(type, round, roundIdx) {
  const row = document.createElement('div');
  row.className = 'zone-row';

  // Icon
  const icon = document.createElement('div');
  if (type === 'gk') {
    icon.className = 'zone-icon gk-icon';
    icon.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>`;
  } else {
    icon.className = 'zone-icon rest-icon';
    icon.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
      </svg>`;
  }

  const content = document.createElement('div');
  content.className = 'zone-content';

  const labelEl = document.createElement('div');
  labelEl.className = `zone-label-text ${type === 'gk' ? 'gk-label' : 'rest-label'}`;
  labelEl.textContent = type === 'gk' ? 'Goalkeeper' : 'Resting';
  content.appendChild(labelEl);

  const chips = document.createElement('div');
  chips.className = 'zone-chips';

  if (type === 'gk') {
    chips.appendChild(makeGkChip(round.gk, roundIdx));
  } else {
    chips.dataset.roundIdx = roundIdx;
    chips.dataset.zone = 'rest';
    if (round.rest.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'zone-empty';
      empty.textContent = 'None';
      chips.appendChild(empty);
    } else {
      round.rest.forEach(name => chips.appendChild(makeRestChip(name)));
    }
    // SortableJS — rest zone (intra-round only, single group per card)
    initSortable(chips, `round-${roundIdx}`, roundIdx);
  }

  content.appendChild(chips);
  row.appendChild(icon);
  row.appendChild(content);
  return row;
}

function makeGkChip(name, roundIdx) {
  const span = document.createElement('span');
  span.className = 'player-chip gk';
  span.title = 'Tap to swap goalkeeper';
  span.dataset.player = name;
  span.innerHTML = `${escHtml(name)}<span class="gk-swap-hint" aria-hidden="true">↕</span>`;
  span.addEventListener('click', () => openGkSwapModal(roundIdx));
  return span;
}

function makeRestChip(name) {
  const span = document.createElement('span');
  span.className = 'player-chip resting';
  span.dataset.player = name;
  span.textContent = name;
  return span;
}

function makeDividerEl() {
  const d = document.createElement('div');
  d.className = 'card-divider';
  return d;
}

// ==========================================
// SORTABLEJS — rest zone reordering
// ==========================================
function initSortable(el, groupName, roundIdx) {
  Sortable.create(el, {
    group: groupName,
    animation: 180,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    delay: 80,
    delayOnTouchOnly: true,
    onEnd() { syncRoundFromDOM(roundIdx); },
  });
}

function syncRoundFromDOM(roundIdx) {
  const card = document.querySelector(`.round-card[data-round="${roundIdx}"]`);
  if (!card) return;
  const restEl = card.querySelector('[data-zone="rest"]');
  if (restEl) {
    state.rounds[roundIdx].rest = [...restEl.querySelectorAll('.player-chip')]
      .map(c => c.dataset.player).filter(Boolean);
  }
}

// ==========================================
// GK SWAP MODAL
// ==========================================
function openGkSwapModal(roundIdx) {
  const round = state.rounds[roundIdx];
  const list  = document.getElementById('modal-list');
  list.innerHTML = '';

  round.outfield.forEach(name => {
    const li  = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = name;
    btn.addEventListener('click', () => { swapGk(roundIdx, name); closeGkModal(); });
    li.appendChild(btn);
    list.appendChild(li);
  });

  document.getElementById('modal-overlay').classList.add('open');
}

function swapGk(roundIdx, newGk) {
  const round  = state.rounds[roundIdx];
  const oldGk  = round.gk;
  round.gk     = newGk;
  round.outfield = round.outfield.map(p => p === newGk ? oldGk : p);

  const card = document.querySelector(`.round-card[data-round="${roundIdx}"]`);
  if (card) card.replaceWith(buildRoundCard(round, roundIdx));
}

function closeGkModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

// ==========================================
// CLIPBOARD
// ==========================================
function buildClipboardText() {
  const N = state.players.length;
  const K = N - state.fieldSize;
  const lines = [];

  lines.push('Football Rotation');
  if (state.groupName) lines.push(state.groupName);
  lines.push(`Field: ${state.fieldSize} players | ${N} rounds`);
  lines.push('');

  state.rounds.forEach((r, i) => {
    lines.push(`Round ${i + 1}`);
    lines.push(`GK: ${r.gk}`);
    if (r.rest.length > 0) lines.push(`Rest: ${r.rest.join(', ')}`);
    lines.push('');
  });

  // Summary
  const restMap = {};
  state.players.forEach(p => restMap[p] = 0);
  state.rounds.forEach(r => r.rest.forEach(p => { if (restMap[p] !== undefined) restMap[p]++; }));
  lines.push('--- Rest summary ---');
  lines.push(state.players.map(p => `${p}: ${restMap[p] || 0}x`).join(' | '));

  return lines.join('\n');
}

async function copySchedule() {
  const text      = buildClipboardText();
  const btn       = document.getElementById('copy-btn');
  const icon      = document.getElementById('copy-icon');
  const check     = document.getElementById('copy-check');
  const label     = document.getElementById('copy-label');

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    Object.assign(ta.style, { position:'fixed', top:'-9999px', left:'-9999px' });
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }

  btn.classList.add('copied');
  icon.style.display  = 'none';
  check.style.display = 'inline';
  label.textContent   = 'Copied!';

  setTimeout(() => {
    btn.classList.remove('copied');
    icon.style.display  = 'inline';
    check.style.display = 'none';
    label.textContent   = 'Copy Schedule';
  }, 2200);
}

// ==========================================
// DRAG-TO-SCROLL (desktop)
// ==========================================
function makeDraggable(el, { vertical = false } = {}) {
  let isDown = false, axis = null, startX, startY, scrollLeft, scrollTop;
  let velX = 0, velY = 0, lastX = 0, lastY = 0, lastT = 0, rafId = null;
  const THRESHOLD = 5;

  const cancelMomentum = () => { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } };

  function applyMomentum() {
    if (axis === 'y') {
      velY *= 0.92;
      el.scrollTop += velY;
      if (Math.abs(velY) > 0.5) { rafId = requestAnimationFrame(applyMomentum); return; }
    } else if (axis === 'x') {
      velX *= 0.92;
      el.scrollLeft += velX;
      if (Math.abs(velX) > 0.5) { rafId = requestAnimationFrame(applyMomentum); return; }
    }
    rafId = null;
  }

  el.addEventListener('mousedown', e => {
    if (e.target.closest('button, a, input, .player-chip, [role="button"]')) return;
    cancelMomentum();
    isDown = true; axis = null;
    el.classList.add('dragging');
    startX = e.pageX; startY = e.pageY;
    scrollLeft = el.scrollLeft; scrollTop = el.scrollTop;
    lastX = e.pageX; lastY = e.pageY; lastT = performance.now();
    velX = 0; velY = 0;
  });

  el.addEventListener('mousemove', e => {
    if (!isDown) return;
    const dx = e.pageX - startX, dy = e.pageY - startY;
    if (!axis && (Math.abs(dx) > THRESHOLD || Math.abs(dy) > THRESHOLD))
      axis = (!vertical || Math.abs(dx) > Math.abs(dy)) ? 'x' : 'y';
    if (!axis) return;
    e.preventDefault();
    const now = performance.now(), dt = now - lastT || 1;
    if (axis === 'y') { velY = (lastY - e.pageY) / dt * 12; el.scrollTop  = scrollTop  - dy; }
    else              { velX = (lastX - e.pageX) / dt * 12; el.scrollLeft = scrollLeft - dx; }
    lastX = e.pageX; lastY = e.pageY; lastT = now;
  });

  const release = () => {
    if (!isDown) return;
    isDown = false;
    el.classList.remove('dragging');
    if (axis !== null) el.addEventListener('click', e => e.stopPropagation(), { capture: true, once: true });
    rafId = requestAnimationFrame(applyMomentum);
  };

  el.addEventListener('mouseup', release);
  el.addEventListener('mouseleave', release);
}

// ==========================================
// VALIDATION
// ==========================================
function validateSetup() {
  const N = state.players.length, F = state.fieldSize;
  if (N < 2)  return 'Add at least 2 players.';
  if (F < 2)  return 'Field size must be at least 2.';
  if (F >= N) return `Need more players than field size. Add ${F - N + 1} more.`;
  return '';
}

// ==========================================
// UTILITIES
// ==========================================
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function setError(msg) {
  document.getElementById('setup-error').textContent = msg;
}

// ==========================================
// INIT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {

  // Field stepper
  document.getElementById('field-dec').addEventListener('click', () => {
    if (state.fieldSize > 2) { state.fieldSize--; renderFieldStepper(); renderPlayerChips(); }
  });
  document.getElementById('field-inc').addEventListener('click', () => {
    if (state.fieldSize < 20) { state.fieldSize++; renderFieldStepper(); renderPlayerChips(); }
  });

  // Add player
  const playerInput = document.getElementById('player-input');

  function addPlayer() {
    const name = playerInput.value.trim();
    if (!name) return;
    if (state.players.map(p => p.toLowerCase()).includes(name.toLowerCase())) {
      setError(`"${name}" is already in the list.`);
      return;
    }
    state.players.push(name);
    playerInput.value = '';
    setError('');
    renderPlayerChips();
    playerInput.focus();
  }

  document.getElementById('add-player-btn').addEventListener('click', addPlayer);
  playerInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addPlayer(); } });

  // Remove player chip
  document.getElementById('player-chips').addEventListener('click', e => {
    const btn = e.target.closest('.chip-remove');
    if (!btn) return;
    state.players.splice(parseInt(btn.dataset.idx, 10), 1);
    renderPlayerChips();
  });

  // Generate
  let schedScrollReady = false;

  function doGenerate() {
    const err = validateSetup();
    if (err) { setError(err); return; }
    setError('');
    state.rounds = generateSchedule(shuffle(state.players), state.fieldSize);
    renderSchedule();
    showView('view-schedule');
    if (!schedScrollReady) {
      makeDraggable(document.getElementById('sched-scroll'), { vertical: true });
      schedScrollReady = true;
    }
  }

  document.getElementById('generate-btn').addEventListener('click', doGenerate);
  document.getElementById('reshuffle-btn').addEventListener('click', doGenerate);

  // Back
  document.getElementById('back-btn').addEventListener('click', () => showView('view-setup'));

  // Copy
  document.getElementById('copy-btn').addEventListener('click', copySchedule);

  // GK modal
  document.getElementById('modal-cancel').addEventListener('click', closeGkModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeGkModal();
  });

  // Save group
  document.getElementById('save-group-btn').addEventListener('click', () => {
    if (state.players.length < 1) { setError('Add players first.'); return; }
    document.getElementById('group-name-input').value = state.groupName || '';
    document.getElementById('save-modal-overlay').classList.add('open');
    setTimeout(() => document.getElementById('group-name-input').focus(), 120);
  });

  document.getElementById('save-modal-cancel').addEventListener('click', () =>
    document.getElementById('save-modal-overlay').classList.remove('open'));

  document.getElementById('save-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('save-modal-overlay'))
      document.getElementById('save-modal-overlay').classList.remove('open');
  });

  document.getElementById('save-modal-confirm').addEventListener('click', () => {
    const name = document.getElementById('group-name-input').value.trim();
    if (!name) return;
    saveGroup(name, state.players, state.fieldSize);
    state.groupName = name;
    document.getElementById('save-modal-overlay').classList.remove('open');
    renderGroups();
  });

  document.getElementById('group-name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('save-modal-confirm').click();
  });

  // Load / delete groups
  document.getElementById('groups-list').addEventListener('click', e => {
    const loadBtn = e.target.closest('.group-load-btn');
    const delBtn  = e.target.closest('.group-delete-btn');

    if (loadBtn) {
      const group = loadGroups().find(g => g.name === loadBtn.dataset.name);
      if (!group) return;
      state.players   = [...group.players];
      state.fieldSize = group.fieldSize;
      state.groupName = group.name;
      renderFieldStepper();
      renderPlayerChips();
      setError('');
    }

    if (delBtn) {
      deleteGroup(delBtn.dataset.name);
      if (state.groupName === delBtn.dataset.name) state.groupName = '';
      renderGroups();
    }
  });

  // Drag-to-scroll: setup view
  makeDraggable(document.getElementById('setup-scroll'), { vertical: true });

  // Initial render
  renderFieldStepper();
  renderPlayerChips();
  renderGroups();
});
