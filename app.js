/* Gym Tracker — plain JavaScript, no build step. All data is stored on the device (localStorage). */
'use strict';

const APP_VERSION = '1.0.0';
const STORAGE_KEY = 'gymTracker.v1';

/* ---------- Helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = (sec) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec % 60)).padStart(2, '0')}`;
const round = (n, step = 0.5) => Math.round(n / step) * step;

/* ---------- Colour themes ---------- */
const THEME_KEYS = [
  ['primary', 'Main colour (header & buttons)'],
  ['accent', 'Accent (highlights, active tab, timer)'],
  ['bg', 'Background'],
  ['surface', 'Cards'],
  ['text', 'Text'],
  ['nav', 'Bottom tab bar'],
];
const THEME_PRESETS = {
  'Midnight Blue': { primary: '#2563eb', accent: '#f97316', bg: '#0f172a', surface: '#1e293b', text: '#f1f5f9', nav: '#111827' },
  'Light':         { primary: '#2563eb', accent: '#ea580c', bg: '#f3f4f6', surface: '#ffffff', text: '#111827', nav: '#ffffff' },
  'Beast Red':     { primary: '#b91c1c', accent: '#facc15', bg: '#0c0a09', surface: '#1c1917', text: '#fafaf9', nav: '#000000' },
  'Forest':        { primary: '#15803d', accent: '#a3e635', bg: '#052e16', surface: '#14532d', text: '#f0fdf4', nav: '#022c22' },
  'Purple Haze':   { primary: '#7c3aed', accent: '#ec4899', bg: '#1e1b4b', surface: '#312e81', text: '#eef2ff', nav: '#1e1b4b' },
  'Ocean':         { primary: '#0891b2', accent: '#22d3ee', bg: '#082f49', surface: '#0c4a6e', text: '#f0f9ff', nav: '#082f49' },
  'Pink Power':    { primary: '#db2777', accent: '#8b5cf6', bg: '#fdf2f8', surface: '#ffffff', text: '#500724', nav: '#ffffff' },
  'Gold Rush':     { primary: '#a16207', accent: '#facc15', bg: '#171717', surface: '#262626', text: '#fefce8', nav: '#0a0a0a' },
};

function readableOn(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.4 ? '#111111' : '#ffffff';
}

function applyTheme(theme) {
  const root = document.documentElement.style;
  for (const [k] of THEME_KEYS) root.setProperty(`--${k}`, theme[k]);
  root.setProperty('--on-primary', readableOn(theme.primary));
  root.setProperty('--on-accent', readableOn(theme.accent));
  $('meta[name="theme-color"]').setAttribute('content', theme.primary);
}

/* ---------- Default data ---------- */
const DEFAULT_EXERCISES = [
  ['Barbell Bench Press', 'Chest'], ['Incline Dumbbell Press', 'Chest'], ['Chest Fly', 'Chest'], ['Push-up', 'Chest'],
  ['Barbell Back Squat', 'Legs'], ['Leg Press', 'Legs'], ['Romanian Deadlift', 'Legs'], ['Walking Lunge', 'Legs'],
  ['Leg Curl', 'Legs'], ['Leg Extension', 'Legs'], ['Calf Raise', 'Legs'],
  ['Deadlift', 'Back'], ['Pull-up', 'Back'], ['Lat Pulldown', 'Back'], ['Barbell Row', 'Back'], ['Seated Cable Row', 'Back'],
  ['Overhead Press', 'Shoulders'], ['Lateral Raise', 'Shoulders'], ['Face Pull', 'Shoulders'],
  ['Barbell Curl', 'Arms'], ['Hammer Curl', 'Arms'], ['Tricep Pushdown', 'Arms'], ['Skull Crusher', 'Arms'],
  ['Plank', 'Core'], ['Hanging Leg Raise', 'Core'], ['Cable Crunch', 'Core'],
];
const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Other'];

// Program templates: each day = [routine name, [exercise name, sets, reps], ...]
const TEMPLATES = {
  'Full Body (3 days)': [
    ['Full Body A', [['Barbell Back Squat', 3, 8], ['Barbell Bench Press', 3, 8], ['Barbell Row', 3, 8], ['Plank', 3, 45]]],
    ['Full Body B', [['Deadlift', 3, 5], ['Overhead Press', 3, 8], ['Lat Pulldown', 3, 10], ['Walking Lunge', 3, 10]]],
    ['Full Body C', [['Leg Press', 3, 10], ['Incline Dumbbell Press', 3, 10], ['Seated Cable Row', 3, 10], ['Barbell Curl', 3, 12]]],
  ],
  'Upper / Lower (4 days)': [
    ['Upper A', [['Barbell Bench Press', 4, 6], ['Barbell Row', 4, 6], ['Overhead Press', 3, 8], ['Barbell Curl', 3, 10], ['Tricep Pushdown', 3, 10]]],
    ['Lower A', [['Barbell Back Squat', 4, 6], ['Romanian Deadlift', 3, 8], ['Leg Curl', 3, 10], ['Calf Raise', 4, 12]]],
    ['Upper B', [['Incline Dumbbell Press', 3, 10], ['Pull-up', 3, 8], ['Lateral Raise', 3, 12], ['Hammer Curl', 3, 12], ['Skull Crusher', 3, 10]]],
    ['Lower B', [['Deadlift', 3, 5], ['Leg Press', 3, 10], ['Leg Extension', 3, 12], ['Hanging Leg Raise', 3, 12]]],
  ],
  'Push / Pull / Legs (3 days)': [
    ['Push', [['Barbell Bench Press', 4, 8], ['Overhead Press', 3, 8], ['Incline Dumbbell Press', 3, 10], ['Lateral Raise', 3, 12], ['Tricep Pushdown', 3, 12]]],
    ['Pull', [['Deadlift', 3, 5], ['Pull-up', 3, 8], ['Seated Cable Row', 3, 10], ['Face Pull', 3, 15], ['Barbell Curl', 3, 10]]],
    ['Legs', [['Barbell Back Squat', 4, 8], ['Romanian Deadlift', 3, 10], ['Leg Press', 3, 12], ['Leg Curl', 3, 12], ['Calf Raise', 4, 15]]],
  ],
  'Push / Pull / Legs (6 days)': 'Push / Pull / Legs (3 days)*2',
  'Body Part Split (5 days)': [
    ['Chest Day', [['Barbell Bench Press', 4, 8], ['Incline Dumbbell Press', 3, 10], ['Chest Fly', 3, 12], ['Push-up', 2, 15]]],
    ['Back Day', [['Deadlift', 3, 5], ['Pull-up', 3, 8], ['Barbell Row', 3, 8], ['Lat Pulldown', 3, 12]]],
    ['Leg Day', [['Barbell Back Squat', 4, 8], ['Leg Press', 3, 12], ['Leg Curl', 3, 12], ['Leg Extension', 3, 12], ['Calf Raise', 4, 15]]],
    ['Shoulder Day', [['Overhead Press', 4, 8], ['Lateral Raise', 4, 12], ['Face Pull', 3, 15], ['Cable Crunch', 3, 15]]],
    ['Arm Day', [['Barbell Curl', 3, 10], ['Skull Crusher', 3, 10], ['Hammer Curl', 3, 12], ['Tricep Pushdown', 3, 12]]],
  ],
};

function templateDays(name) {
  const t = TEMPLATES[name];
  if (typeof t === 'string') { const [base, n] = t.split('*'); return Array(+n).fill(TEMPLATES[base]).flat(); }
  return t;
}

function freshState() {
  const exercises = DEFAULT_EXERCISES.map(([name, group]) => ({ id: uid(), name, group }));
  return {
    version: 1,
    exercises,
    routines: [],
    program: null,
    active: null,
    history: [],
    theme: { ...THEME_PRESETS['Midnight Blue'] },
    settings: { unit: 'kg', defaultRest: 90, autoTimer: true },
  };
}

/* ---------- State ---------- */
let state;
try { state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { state = null; }
if (!state) {
  state = freshState();
  ensureTemplateRoutines('Full Body (3 days)');
}
state.settings = { unit: 'kg', defaultRest: 90, autoTimer: true, ...state.settings };
state.theme = { ...THEME_PRESETS['Midnight Blue'], ...state.theme };

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

const exById = (id) => state.exercises.find((e) => e.id === id);
const routineById = (id) => state.routines.find((r) => r.id === id);

function exerciseByName(name, group = 'Other') {
  let ex = state.exercises.find((e) => e.name.toLowerCase() === name.toLowerCase());
  if (!ex) { ex = { id: uid(), name, group }; state.exercises.push(ex); }
  return ex;
}

/** Creates the template's routines (if not already there) and returns their ids in day order. */
function ensureTemplateRoutines(templateName) {
  return templateDays(templateName).map(([rName, items]) => {
    let r = state.routines.find((x) => x.name === rName);
    if (!r) {
      r = {
        id: uid(), name: rName,
        items: items.map(([exName, sets, reps]) => ({ exId: exerciseByName(exName).id, sets, reps, rest: state.settings?.defaultRest ?? 90 })),
      };
      state.routines.push(r);
    }
    return r.id;
  });
}

/* ---------- Program logic ---------- */
function programLabel() {
  const p = state.program;
  if (!p) return '';
  if (p.completed) return 'Program complete 🎉';
  return `Week ${p.week}/${p.weeks} · Day ${p.day}/${p.daysPerWeek}`;
}
function isDeloadWeek(p = state.program) { return p && p.deload && p.week === p.weeks && p.weeks >= 4; }

function advanceProgram() {
  const p = state.program;
  if (!p || p.completed) return;
  p.doneCount = (p.doneCount || 0) + 1;
  if (p.day < p.daysPerWeek) p.day++;
  else if (p.week < p.weeks) { p.week++; p.day = 1; }
  else p.completed = true;
}

/** Suggested weight: last used weight, plus progression once per week of the program. */
function lastPerformance(exId) {
  for (let i = state.history.length - 1; i >= 0; i--) {
    const e = state.history[i].entries.find((x) => x.exId === exId);
    if (e) {
      const done = e.sets.filter((s) => s.done && s.w !== '');
      if (done.length) return { weight: Math.max(...done.map((s) => +s.w)), reps: done[0].r, week: state.history[i].week };
    }
  }
  return null;
}

/* ---------- Rendering ---------- */
let currentTab = 'today';
let routinesSub = 'routines';

function render() {
  $('#programBadge').textContent = programLabel();
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === currentTab));
  const view = $('#view');
  view.innerHTML = { today: viewToday, program: viewProgram, routines: viewRoutines, history: viewHistory, settings: viewSettings }[currentTab]();
}

/* ----- Today ----- */
function viewToday() {
  if (state.active) return viewActiveWorkout();
  const p = state.program;
  let html = '';
  if (p && !p.completed) {
    const r = routineById(p.schedule[p.day - 1]);
    html += `<div class="card highlight stack">
      <div class="row between"><h3>${esc(p.name)}</h3><span class="muted">${programLabel()}</span></div>
      <div class="progress"><div style="width:${Math.round(((p.doneCount || 0) / (p.weeks * p.daysPerWeek)) * 100)}%"></div></div>
      ${isDeloadWeek() ? '<p class="muted">🔋 Deload week — use about 60% of your normal weights.</p>' : ''}
      <p><strong>Next up:</strong> ${r ? esc(r.name) : '<em>No routine set for this day</em>'}</p>
      ${r ? `<p class="muted">${r.items.map((i) => esc(exById(i.exId)?.name)).join(' · ')}</p>` : ''}
      <div class="row">
        <button class="btn accent" data-act="start-program" ${r ? '' : 'disabled'}>Start workout</button>
        <button class="btn ghost" data-act="skip-day">Skip day</button>
      </div>
    </div>`;
  } else if (p && p.completed) {
    html += `<div class="card highlight"><h3>🎉 You finished ${esc(p.name)}!</h3>
      <p class="muted">${p.weeks} weeks done. Start a new program from the Program tab.</p>
      <button class="btn" data-goto="program">Choose a new program</button></div>`;
  } else {
    html += `<div class="card"><h3>No program running</h3>
      <p class="muted">Pick a 2–12 week program, or just start any routine below.</p>
      <button class="btn" data-goto="program">Set up a program</button></div>`;
  }
  html += `<h2>Quick start</h2>`;
  html += state.routines.length
    ? state.routines.map((r) => `<div class="card row between">
        <div class="grow"><h3>${esc(r.name)}</h3><div class="muted">${r.items.length} exercises</div></div>
        <button class="btn small" data-act="start-routine" data-id="${r.id}">Start</button></div>`).join('')
    : `<div class="empty">No routines yet. Create one in the Routines tab.</div>`;
  html += `<div class="card row between"><div class="grow"><h3>Empty workout</h3><div class="muted">Add exercises as you go</div></div>
    <button class="btn small ghost" data-act="start-empty">Start</button></div>`;
  return html;
}

function startWorkout(routine, fromProgram) {
  const p = state.program;
  const deload = fromProgram && isDeloadWeek();
  state.active = {
    id: uid(),
    routineId: routine?.id || null,
    name: routine?.name || 'Workout',
    fromProgram: !!fromProgram,
    week: fromProgram ? p.week : null,
    day: fromProgram ? p.day : null,
    startedAt: new Date().toISOString(),
    entries: (routine?.items || []).map((it) => makeEntry(it.exId, it.sets, it.reps, it.rest, deload)),
  };
  save(); render();
}

function makeEntry(exId, sets, reps, rest, deload = false) {
  const last = lastPerformance(exId);
  let w = '';
  if (last) {
    w = last.weight;
    const p = state.program;
    // Small weekly progression when running a program (add ~2.5%, rounded) if last session hit target reps.
    if (p && last.week && p.week > last.week && +last.reps >= reps) w = round(w * (1 + (p.progression || 2.5) / 100), state.settings.unit === 'kg' ? 1.25 : 2.5);
    if (deload) w = round(w * 0.6, 2.5);
  }
  return {
    exId, name: exById(exId)?.name || 'Exercise', rest: rest ?? state.settings.defaultRest,
    target: reps,
    sets: Array.from({ length: sets }, () => ({ w, r: reps, done: false })),
  };
}

function viewActiveWorkout() {
  const a = state.active;
  const unit = state.settings.unit;
  const mins = Math.floor((Date.now() - new Date(a.startedAt)) / 60000);
  let html = `<div class="row between"><h2 style="margin-top:4px">${esc(a.name)}</h2><span class="muted">⏱ ${mins} min</span></div>`;
  if (a.fromProgram) html += `<p class="muted">Week ${a.week}, Day ${a.day}${isDeloadWeek() ? ' · Deload week' : ''}</p>`;
  a.entries.forEach((e, ei) => {
    const last = lastPerformance(e.exId);
    html += `<div class="card">
      <div class="row between"><h3 class="grow">${esc(e.name)}</h3>
        <button class="icon-btn" data-act="entry-up" data-ei="${ei}" title="Move up">↑</button>
        <button class="icon-btn" data-act="entry-remove" data-ei="${ei}" title="Remove">🗑</button></div>
      <div class="muted">${last ? `Last time: ${last.weight}${unit} × ${last.reps}` : 'No previous data'} · Rest ${e.rest}s</div>
      <table class="sets"><thead><tr><th>Set</th><th>${unit}</th><th>Reps</th><th></th></tr></thead><tbody>
      ${e.sets.map((s, si) => `<tr class="${s.done ? 'done' : ''}">
        <td>${si + 1}</td>
        <td><input type="number" inputmode="decimal" step="0.5" min="0" value="${esc(s.w)}" data-field="w" data-ei="${ei}" data-si="${si}"></td>
        <td><input type="number" inputmode="numeric" min="0" value="${esc(s.r)}" data-field="r" data-ei="${ei}" data-si="${si}"></td>
        <td><button class="done-btn" data-act="toggle-set" data-ei="${ei}" data-si="${si}" aria-label="Mark set done">✓</button></td>
      </tr>`).join('')}
      </tbody></table>
      <div class="row" style="margin-top:8px">
        <button class="btn small ghost" data-act="add-set" data-ei="${ei}">+ Set</button>
        <button class="btn small ghost" data-act="remove-set" data-ei="${ei}" ${e.sets.length ? '' : 'disabled'}>− Set</button>
      </div>
    </div>`;
  });
  html += `<button class="btn ghost block" data-act="add-entry">+ Add exercise</button>
    <div class="row" style="margin-top:14px">
      <button class="btn accent grow" data-act="finish-workout">Finish workout</button>
      <button class="btn danger" data-act="cancel-workout">Discard</button>
    </div>`;
  return html;
}

/* ----- Program ----- */
const programDraft = { template: 'Full Body (3 days)', weeks: 8, days: 3, deload: true, progression: 2.5, schedule: [] };

function viewProgram() {
  const p = state.program;
  let html = '';
  if (p) {
    const total = p.weeks * p.daysPerWeek;
    html += `<div class="card stack"><div class="row between"><h3>${esc(p.name)}</h3><span class="muted">${programLabel()}</span></div>
      <div class="muted">${p.weeks} weeks · ${p.daysPerWeek} days/week · started ${fmtDate(p.startDate)}</div>
      <div class="week-grid">${Array.from({ length: p.weeks }, (_, i) => {
        const w = i + 1;
        const cls = (p.completed || w < p.week) ? 'done' : w === p.week ? 'current' : '';
        return `<div class="week-cell ${cls} ${p.deload && w === p.weeks && p.weeks >= 4 ? 'deload' : ''}" title="Week ${w}">W${w}</div>`;
      }).join('')}</div>
      <div class="progress"><div style="width:${Math.round(((p.doneCount || 0) / total) * 100)}%"></div></div>
      <div class="muted">${p.doneCount || 0} of ${total} workouts done</div>
      <h3 style="margin-top:12px">Weekly schedule</h3>
      ${p.schedule.map((rid, i) => `<div class="list-item"><strong>Day ${i + 1}</strong><span class="grow">${esc(routineById(rid)?.name || '—')}</span></div>`).join('')}
      <div class="row"><button class="btn ghost small" data-act="edit-program-length">Change length</button>
      <button class="btn danger small" data-act="end-program">End program</button></div>
    </div>`;
  }

  const d = programDraft;
  const routineOpts = (sel) => `<option value="">— Rest / none —</option>` + state.routines.map((r) => `<option value="${r.id}" ${r.id === sel ? 'selected' : ''}>${esc(r.name)}</option>`).join('');
  if (d.template !== 'Custom') {
    // Preview which routines the template uses, so the user sees the schedule before starting.
    const names = templateDays(d.template).map(([n]) => n);
    d.days = names.length;
    d.schedule = names.map((n) => state.routines.find((r) => r.name === n)?.id || `tpl:${n}`);
  } else {
    d.schedule = Array.from({ length: d.days }, (_, i) => d.schedule[i] ?? state.routines[i % Math.max(1, state.routines.length)]?.id ?? '');
  }

  html += `<h2>${p ? 'Start a different program' : 'Create a program'}</h2>
  <div class="card stack">
    <div><label>Program length</label>
      <div class="chips">${[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((w) => `<button class="chip ${d.weeks === w ? 'active' : ''}" data-act="draft-weeks" data-v="${w}">${w} wk</button>`).join('')}</div>
    </div>
    <div><label>Template</label>
      <select data-draft="template">${[...Object.keys(TEMPLATES), 'Custom'].map((t) => `<option ${t === d.template ? 'selected' : ''}>${t}</option>`).join('')}</select>
    </div>
    ${d.template === 'Custom' ? `<div><label>Days per week: <strong>${d.days}</strong></label>
      <input type="range" min="1" max="7" value="${d.days}" data-draft="days"></div>` : ''}
    <div><label>Schedule</label>
      ${d.schedule.map((rid, i) => d.template === 'Custom'
        ? `<div class="row" style="margin-bottom:6px"><span style="width:56px">Day ${i + 1}</span><select class="grow" data-draft-day="${i}">${routineOpts(rid)}</select></div>`
        : `<div class="list-item"><strong>Day ${i + 1}</strong><span class="grow">${esc(routineById(rid)?.name || rid.replace('tpl:', ''))}</span></div>`).join('')}
      ${d.template !== 'Custom' ? '<p class="muted">Routines are created automatically and you can edit them in the Routines tab.</p>' : ''}
    </div>
    <div class="row between"><label style="margin:0">Weight increase per week (%)</label>
      <input type="number" step="0.5" min="0" max="10" value="${d.progression}" data-draft="progression" style="width:90px"></div>
    <label class="row" style="margin:0"><input type="checkbox" ${d.deload ? 'checked' : ''} data-draft="deload" style="width:auto"> Make the last week a lighter deload week (4+ week programs)</label>
    <p class="muted">${d.weeks} weeks × ${d.days} days = <strong>${d.weeks * d.days} workouts</strong></p>
    <button class="btn accent block" data-act="start-program-plan">Start ${d.weeks}-week program</button>
  </div>`;
  return html;
}

/* ----- Routines & Exercises ----- */
function viewRoutines() {
  let html = `<div class="chips" style="margin-bottom:12px">
    <button class="chip ${routinesSub === 'routines' ? 'active' : ''}" data-act="sub" data-v="routines">Routines</button>
    <button class="chip ${routinesSub === 'exercises' ? 'active' : ''}" data-act="sub" data-v="exercises">Exercises</button></div>`;

  if (routinesSub === 'routines') {
    html += `<button class="btn block" data-act="new-routine" style="margin-bottom:12px">+ New routine</button>`;
    html += state.routines.length ? state.routines.map((r) => `<div class="card">
      <div class="row between"><h3 class="grow">${esc(r.name)}</h3>
        <button class="btn small ghost" data-act="edit-routine" data-id="${r.id}">Edit</button>
        <button class="icon-btn" data-act="dup-routine" data-id="${r.id}" title="Duplicate">⧉</button>
        <button class="icon-btn" data-act="del-routine" data-id="${r.id}" title="Delete">🗑</button></div>
      ${r.items.map((it) => `<div class="muted">${esc(exById(it.exId)?.name || '?')} — ${it.sets} × ${it.reps}</div>`).join('') || '<div class="muted">No exercises</div>'}
    </div>`).join('') : '<div class="empty">No routines yet.</div>';
  } else {
    html += `<button class="btn block" data-act="new-exercise" style="margin-bottom:12px">+ Add exercise</button>`;
    for (const g of MUSCLE_GROUPS) {
      const list = state.exercises.filter((e) => (e.group || 'Other') === g).sort((a, b) => a.name.localeCompare(b.name));
      if (!list.length) continue;
      html += `<h2>${g}</h2><div class="card">${list.map((e) => `<div class="list-item">
        <span class="grow">${esc(e.name)}</span>
        <button class="icon-btn" data-act="edit-exercise" data-id="${e.id}" title="Edit">✏️</button>
        <button class="icon-btn" data-act="del-exercise" data-id="${e.id}" title="Delete">🗑</button></div>`).join('')}</div>`;
    }
  }
  return html;
}

/* ----- History ----- */
function viewHistory() {
  if (!state.history.length) return '<div class="empty">No workouts logged yet. Finish a workout and it will show up here.</div>';
  const unit = state.settings.unit;
  const prs = {};
  for (const h of state.history) for (const e of h.entries) for (const s of e.sets) {
    if (!s.done || s.w === '') continue;
    if (!prs[e.name] || +s.w > prs[e.name].w) prs[e.name] = { w: +s.w, r: s.r };
  }
  const thisWeek = state.history.filter((h) => Date.now() - new Date(h.date) < 7 * 864e5).length;
  let html = `<div class="row"><div class="card grow"><div class="muted">Workouts</div><h2 style="margin:4px 0">${state.history.length}</h2></div>
    <div class="card grow"><div class="muted">Last 7 days</div><h2 style="margin:4px 0">${thisWeek}</h2></div></div>`;
  html += `<h2>Personal bests</h2><div class="card">${Object.entries(prs).sort().map(([n, v]) =>
    `<div class="list-item"><span class="grow">${esc(n)}</span><strong>${v.w}${unit}</strong>&nbsp;× ${esc(v.r)}</div>`).join('') || '<div class="muted">None yet</div>'}</div>`;
  html += `<h2>Workouts</h2>`;
  html += [...state.history].reverse().map((h) => {
    const vol = h.entries.reduce((t, e) => t + e.sets.filter((s) => s.done).reduce((a, s) => a + (+s.w || 0) * (+s.r || 0), 0), 0);
    return `<div class="card">
      <div class="row between"><h3 class="grow">${esc(h.name)}</h3><button class="icon-btn" data-act="del-history" data-id="${h.id}" title="Delete">🗑</button></div>
      <div class="muted">${fmtDate(h.date)} · ${h.duration} min · ${Math.round(vol)} ${unit} volume${h.week ? ` · Week ${h.week} Day ${h.day}` : ''}</div>
      ${h.entries.map((e) => `<div style="margin-top:6px"><strong>${esc(e.name)}</strong>
        <span class="muted">${e.sets.filter((s) => s.done).map((s) => `${s.w || 0}×${s.r}`).join(', ') || 'no sets done'}</span></div>`).join('')}
    </div>`;
  }).join('');
  return html;
}

/* ----- Settings ----- */
function viewSettings() {
  const t = state.theme;
  const s = state.settings;
  return `<h2 style="margin-top:4px">Colour themes</h2>
  <div class="swatches">${Object.entries(THEME_PRESETS).map(([name, p]) => `<button class="swatch" data-act="preset" data-v="${esc(name)}">
    <div class="dots">${['primary', 'accent', 'bg', 'surface'].map((k) => `<span style="background:${p[k]}"></span>`).join('')}</div>${esc(name)}</button>`).join('')}</div>

  <h2>Custom colours</h2>
  <div class="card">${THEME_KEYS.map(([k, label]) => `<div class="color-row"><span>${label}</span>
    <input type="color" value="${t[k]}" data-color="${k}"></div>`).join('')}
    <button class="btn ghost small" data-act="reset-theme" style="margin-top:8px">Reset colours</button>
  </div>

  <h2>Workout</h2>
  <div class="card stack">
    <div class="row between"><span>Weight unit</span>
      <div class="chips">${['kg', 'lb'].map((u) => `<button class="chip ${s.unit === u ? 'active' : ''}" data-act="unit" data-v="${u}">${u}</button>`).join('')}</div></div>
    <div class="row between"><span>Default rest (seconds)</span>
      <input type="number" min="0" step="15" value="${s.defaultRest}" data-setting="defaultRest" style="width:90px"></div>
    <label class="row" style="margin:0;color:var(--text)"><input type="checkbox" ${s.autoTimer ? 'checked' : ''} data-setting="autoTimer" style="width:auto"> Start rest timer when a set is ticked</label>
  </div>

  <h2>Your data</h2>
  <div class="card stack">
    <p class="muted">Everything is saved on this device. Export a backup to move it to another phone.</p>
    <div class="row">
      <button class="btn small" data-act="export">Export backup</button>
      <button class="btn small ghost" data-act="import">Import backup</button>
      <button class="btn small danger" data-act="reset-all">Erase all data</button>
    </div>
  </div>

  <h2>App</h2>
  <div class="card row between"><span class="muted">Version ${APP_VERSION}</span>
    <button class="btn small ghost" data-act="check-update">Check for updates</button></div>`;
}

/* ---------- Modal helpers ---------- */
function openModal(html, onSubmit) {
  const dlg = $('#modal');
  const form = $('#modalForm');
  form.innerHTML = html;
  form.onsubmit = (ev) => {
    const btn = ev.submitter?.value;
    if (btn === 'ok' && onSubmit) {
      const keep = onSubmit(form) === false;
      if (keep) { ev.preventDefault(); return; }
    }
  };
  dlg.showModal();
  return form;
}

function exerciseModal(ex, after) {
  openModal(`<h3>${ex ? 'Edit' : 'Add'} exercise</h3>
    <div class="stack">
      <div><label>Name</label><input name="name" required value="${esc(ex?.name || '')}" autofocus></div>
      <div><label>Muscle group</label><select name="group">${MUSCLE_GROUPS.map((g) => `<option ${g === (ex?.group || 'Other') ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost" value="cancel" formnovalidate>Cancel</button><button class="btn" value="ok">Save</button></div>
    </div>`, (f) => {
    const name = f.name.value.trim();
    if (!name) return false;
    let target = ex;
    if (ex) Object.assign(ex, { name, group: f.group.value });
    else { target = { id: uid(), name, group: f.group.value }; state.exercises.push(target); }
    save();
    if (after) after(target); else render();
  });
}

function routineModal(routine) {
  const draft = routine ? JSON.parse(JSON.stringify(routine)) : { id: uid(), name: '', items: [] };
  const exOpts = (sel) => [...state.exercises].sort((a, b) => a.name.localeCompare(b.name))
    .map((e) => `<option value="${e.id}" ${e.id === sel ? 'selected' : ''}>${esc(e.name)}</option>`).join('');

  const draw = () => {
    const form = openModal(`<h3>${routine ? 'Edit' : 'New'} routine</h3>
      <div class="stack">
        <div><label>Routine name</label><input name="rname" required value="${esc(draft.name)}" placeholder="e.g. Push Day"></div>
        ${draft.items.map((it, i) => `<div class="card" style="margin:0">
          <div class="row"><select class="grow" data-i="${i}" data-k="exId">${exOpts(it.exId)}</select>
            <button type="button" class="icon-btn" data-move="${i}" title="Move up">↑</button>
            <button type="button" class="icon-btn" data-del="${i}" title="Remove">🗑</button></div>
          <div class="row" style="margin-top:6px">
            <div class="grow"><label>Sets</label><input type="number" min="1" value="${it.sets}" data-i="${i}" data-k="sets"></div>
            <div class="grow"><label>Reps</label><input type="number" min="1" value="${it.reps}" data-i="${i}" data-k="reps"></div>
            <div class="grow"><label>Rest (s)</label><input type="number" min="0" step="15" value="${it.rest}" data-i="${i}" data-k="rest"></div>
          </div></div>`).join('')}
        <div class="row"><button type="button" class="btn ghost small" data-add>+ Add exercise</button>
          <button type="button" class="btn ghost small" data-newex>+ Create new exercise</button></div>
        <div class="row" style="justify-content:flex-end"><button class="btn ghost" value="cancel" formnovalidate>Cancel</button><button class="btn" value="ok">Save routine</button></div>
      </div>`, () => {
      if (!draft.name.trim()) return false;
      const idx = state.routines.findIndex((r) => r.id === draft.id);
      if (idx >= 0) state.routines[idx] = draft; else state.routines.push(draft);
      save(); render();
    });
    form.oninput = (e) => {
      if (e.target.name === 'rname') draft.name = e.target.value;
      const { i, k } = e.target.dataset;
      if (k) draft.items[i][k] = k === 'exId' ? e.target.value : +e.target.value;
    };
    form.onclick = (e) => {
      const t = e.target.closest('button'); if (!t || t.type !== 'button') return;
      if (t.hasAttribute('data-add')) draft.items.push({ exId: state.exercises[0]?.id, sets: 3, reps: 10, rest: state.settings.defaultRest });
      else if (t.dataset.del) draft.items.splice(+t.dataset.del, 1);
      else if (t.dataset.move && +t.dataset.move > 0) { const i = +t.dataset.move; [draft.items[i - 1], draft.items[i]] = [draft.items[i], draft.items[i - 1]]; }
      else if (t.hasAttribute('data-newex')) {
        $('#modal').close();
        exerciseModal(null, (ex) => { draft.items.push({ exId: ex.id, sets: 3, reps: 10, rest: state.settings.defaultRest }); draw(); });
        return;
      } else return;
      draw();
    };
  };
  draw();
}

function pickExerciseModal(onPick) {
  const opts = [...state.exercises].sort((a, b) => a.name.localeCompare(b.name)).map((e) => `<option value="${e.id}">${esc(e.name)} (${esc(e.group)})</option>`).join('');
  openModal(`<h3>Add exercise</h3><div class="stack">
    <select name="ex" size="8">${opts}</select>
    <div class="row"><div class="grow"><label>Sets</label><input type="number" name="sets" value="3" min="1"></div>
    <div class="grow"><label>Reps</label><input type="number" name="reps" value="10" min="1"></div></div>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost" value="cancel" formnovalidate>Cancel</button><button class="btn" value="ok">Add</button></div>
  </div>`, (f) => { if (!f.ex.value) return false; onPick(f.ex.value, +f.sets.value || 3, +f.reps.value || 10); });
}

function confirmModal(msg, onYes, yesLabel = 'Yes') {
  openModal(`<p>${msg}</p><div class="row" style="justify-content:flex-end">
    <button class="btn ghost" value="cancel">Cancel</button><button class="btn danger" value="ok">${yesLabel}</button></div>`, onYes);
}

/* ---------- Rest timer ---------- */
let timerEnd = 0, timerId = null;
function startTimer(sec) {
  if (!sec) return;
  timerEnd = Date.now() + sec * 1000;
  $('#timer').hidden = false;
  clearInterval(timerId);
  const tick = () => {
    const left = Math.round((timerEnd - Date.now()) / 1000);
    $('#timerValue').textContent = fmtTime(Math.max(0, left));
    if (left <= 0) { stopTimer(); navigator.vibrate?.([200, 100, 200]); }
  };
  tick(); timerId = setInterval(tick, 500);
}
function stopTimer() { clearInterval(timerId); $('#timer').hidden = true; }
$('#timerAdd').onclick = () => { timerEnd += 15000; };
$('#timerStop').onclick = stopTimer;

/* ---------- Events ---------- */
$('.tabs').addEventListener('click', (e) => {
  const t = e.target.closest('.tab'); if (!t) return;
  currentTab = t.dataset.tab; render(); window.scrollTo({ top: 0 });
});

$('#view').addEventListener('click', (e) => {
  const el = e.target.closest('[data-act],[data-goto],[data-preset]');
  if (!el) return;
  if (el.dataset.goto) { currentTab = el.dataset.goto; render(); return; }
  const { act, id, v } = el.dataset;
  const ei = +el.dataset.ei, si = +el.dataset.si;
  const a = state.active;

  switch (act) {
    case 'start-program': startWorkout(routineById(state.program.schedule[state.program.day - 1]), true); break;
    case 'skip-day': advanceProgram(); save(); render(); break;
    case 'start-routine': startWorkout(routineById(id), false); break;
    case 'start-empty': startWorkout(null, false); break;
    case 'toggle-set': {
      const s = a.entries[ei].sets[si]; s.done = !s.done; save(); render();
      if (s.done && state.settings.autoTimer) startTimer(a.entries[ei].rest);
      break;
    }
    case 'add-set': { const sets = a.entries[ei].sets; const l = sets[sets.length - 1]; sets.push({ w: l?.w ?? '', r: l?.r ?? a.entries[ei].target, done: false }); save(); render(); break; }
    case 'remove-set': a.entries[ei].sets.pop(); save(); render(); break;
    case 'entry-up': if (ei > 0) { [a.entries[ei - 1], a.entries[ei]] = [a.entries[ei], a.entries[ei - 1]]; save(); render(); } break;
    case 'entry-remove': a.entries.splice(ei, 1); save(); render(); break;
    case 'add-entry': pickExerciseModal((exId, sets, reps) => { a.entries.push(makeEntry(exId, sets, reps)); save(); render(); }); break;
    case 'finish-workout': {
      const doneSets = a.entries.reduce((t, x) => t + x.sets.filter((s) => s.done).length, 0);
      const finish = () => {
        state.history.push({
          id: a.id, name: a.name, routineId: a.routineId, date: new Date().toISOString(),
          duration: Math.max(1, Math.round((Date.now() - new Date(a.startedAt)) / 60000)),
          week: a.week, day: a.day,
          entries: a.entries.map((x) => ({ exId: x.exId, name: x.name, sets: x.sets })),
        });
        if (a.fromProgram) advanceProgram();
        state.active = null; stopTimer(); save(); render();
        applyPendingUpdate();
      };
      if (!doneSets) confirmModal('No sets are ticked as done. Finish anyway?', finish, 'Finish'); else finish();
      break;
    }
    case 'cancel-workout': confirmModal('Discard this workout? Nothing will be saved.', () => { state.active = null; stopTimer(); save(); render(); }, 'Discard'); break;

    case 'draft-weeks': programDraft.weeks = +v; render(); break;
    case 'start-program-plan': {
      const d = programDraft;
      const go = () => {
        const schedule = d.template === 'Custom' ? d.schedule.slice(0, d.days) : ensureTemplateRoutines(d.template);
        state.program = {
          name: d.template === 'Custom' ? `Custom ${d.weeks}-week program` : `${d.template.replace(/ \(.*\)/, '')} — ${d.weeks} weeks`,
          template: d.template, weeks: d.weeks, daysPerWeek: schedule.length, schedule,
          deload: d.deload, progression: d.progression, startDate: new Date().toISOString(),
          week: 1, day: 1, doneCount: 0, completed: false,
        };
        save(); currentTab = 'today'; render();
      };
      if (state.program && !state.program.completed) confirmModal('This replaces your current program (your history is kept). Continue?', go, 'Replace'); else go();
      break;
    }
    case 'edit-program-length': {
      const p = state.program;
      openModal(`<h3>Change program length</h3><div class="stack"><div class="chips">${[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((w) =>
        `<label class="chip" style="color:var(--text)"><input type="radio" name="w" value="${w}" ${w === p.weeks ? 'checked' : ''} style="width:auto"> ${w}</label>`).join('')}</div>
        <div class="row" style="justify-content:flex-end"><button class="btn ghost" value="cancel">Cancel</button><button class="btn" value="ok">Save</button></div></div>`, (f) => {
        const w = +f.w.value;
        p.weeks = w;
        if (p.week > w) { p.week = w; p.day = p.daysPerWeek; }
        p.completed = (p.doneCount || 0) >= w * p.daysPerWeek;
        save(); render();
      });
      break;
    }
    case 'end-program': confirmModal('End the current program? Your workout history is kept.', () => { state.program = null; save(); render(); }, 'End program'); break;

    case 'sub': routinesSub = v; render(); break;
    case 'new-routine': routineModal(null); break;
    case 'edit-routine': routineModal(routineById(id)); break;
    case 'dup-routine': { const r = routineById(id); state.routines.push({ ...JSON.parse(JSON.stringify(r)), id: uid(), name: `${r.name} (copy)` }); save(); render(); break; }
    case 'del-routine': {
      const used = state.program?.schedule.includes(id);
      confirmModal(`Delete this routine?${used ? ' It is used in your current program.' : ''}`, () => {
        state.routines = state.routines.filter((r) => r.id !== id);
        if (state.program) state.program.schedule = state.program.schedule.map((x) => (x === id ? '' : x));
        save(); render();
      }, 'Delete');
      break;
    }
    case 'new-exercise': exerciseModal(null); break;
    case 'edit-exercise': exerciseModal(exById(id)); break;
    case 'del-exercise': confirmModal('Delete this exercise? It will be removed from routines too (history is kept).', () => {
      state.exercises = state.exercises.filter((x) => x.id !== id);
      state.routines.forEach((r) => { r.items = r.items.filter((it) => it.exId !== id); });
      save(); render();
    }, 'Delete'); break;

    case 'del-history': confirmModal('Delete this workout from history?', () => { state.history = state.history.filter((h) => h.id !== id); save(); render(); }, 'Delete'); break;

    case 'preset': state.theme = { ...THEME_PRESETS[v] }; applyTheme(state.theme); save(); render(); break;
    case 'reset-theme': state.theme = { ...THEME_PRESETS['Midnight Blue'] }; applyTheme(state.theme); save(); render(); break;
    case 'unit': state.settings.unit = v; save(); render(); break;
    case 'export': {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `gym-tracker-backup-${new Date().toISOString().slice(0, 10)}.json` });
      link.click(); URL.revokeObjectURL(link.href);
      break;
    }
    case 'import': {
      const inp = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/json,.json' });
      inp.onchange = async () => {
        try {
          const data = JSON.parse(await inp.files[0].text());
          if (!Array.isArray(data.exercises) || !Array.isArray(data.routines)) throw new Error('bad');
          state = { ...freshState(), ...data }; save(); applyTheme(state.theme); render();
          alert('Backup imported.');
        } catch { alert('That file is not a valid Gym Tracker backup.'); }
      };
      inp.click();
      break;
    }
    case 'reset-all': confirmModal('Erase ALL workouts, routines, programs and settings on this device?', () => {
      state = freshState(); ensureTemplateRoutines('Full Body (3 days)'); save(); applyTheme(state.theme); render();
    }, 'Erase everything'); break;
    case 'check-update': checkForUpdate(true); break;
  }
});

$('#view').addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.field && state.active) {
    state.active.entries[+t.dataset.ei].sets[+t.dataset.si][t.dataset.field] = t.value === '' ? '' : +t.value;
    save();
  } else if (t.dataset.color) {
    state.theme[t.dataset.color] = t.value; applyTheme(state.theme); save();
  } else if (t.dataset.setting) {
    state.settings[t.dataset.setting] = t.type === 'checkbox' ? t.checked : +t.value; save();
  }
});

$('#view').addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.draft) {
    const k = t.dataset.draft;
    programDraft[k] = t.type === 'checkbox' ? t.checked : (k === 'template' ? t.value : +t.value);
    if (k === 'template' && t.value === 'Custom') programDraft.schedule = [];
    render();
  } else if (t.dataset.draftDay !== undefined) {
    programDraft.schedule[+t.dataset.draftDay] = t.value;
  }
});

/* ---------- Auto update (service worker) ---------- */
let swReg = null, waitingWorker = null;

function applyPendingUpdate() {
  // Update straight away unless a workout is in progress — then wait until it is finished.
  if (waitingWorker && !state.active) waitingWorker.postMessage('SKIP_WAITING');
  else if (waitingWorker) $('#updateBanner').hidden = false;
}

async function checkForUpdate(manual) {
  if (!swReg) { if (manual) alert('Updates are only available when the app is opened from its website.'); return; }
  await swReg.update().catch(() => {});
  if (manual && !swReg.installing && !swReg.waiting) alert(`You're on the latest version (${APP_VERSION}).`);
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', async () => {
    try {
      swReg = await navigator.serviceWorker.register('sw.js');
      const track = (w) => w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) { waitingWorker = w; applyPendingUpdate(); }
      });
      if (swReg.waiting && navigator.serviceWorker.controller) { waitingWorker = swReg.waiting; applyPendingUpdate(); }
      swReg.addEventListener('updatefound', () => track(swReg.installing));
      // Check for a new version whenever the app is reopened, and every 30 minutes.
      document.addEventListener('visibilitychange', () => { if (!document.hidden) swReg.update().catch(() => {}); });
      setInterval(() => swReg.update().catch(() => {}), 30 * 60 * 1000);
    } catch (err) { console.warn('Service worker failed', err); }
  });
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; location.reload(); } });
}
$('#updateNow').onclick = () => { waitingWorker?.postMessage('SKIP_WAITING'); };

/* ---------- Boot ---------- */
applyTheme(state.theme);
save();
render();
// Keep the workout clock fresh.
setInterval(() => { if (state.active && currentTab === 'today' && !$('#modal').open && !document.activeElement?.matches('input')) render(); }, 60000);
