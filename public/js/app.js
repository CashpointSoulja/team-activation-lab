import * as E from './engine.js';
import { SCENARIOS } from './scenarios.js';

const KEY = 'tal.state.v1';
const H = 3600000, D = 24 * H;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (v, d = 1) => v == null ? 'n/a' : `${(v * 100).toFixed(d)}%`;
const pp = v => v == null ? 'n/a' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)} pp`;
const isoMin = t => new Date(Math.round(t / 60000) * 60000).toISOString().replace('.000Z', 'Z');
const fmtT = t => new Date(t).toISOString().slice(0, 16).replace('T', ' ') + 'Z';

// Illustrative goals and plans. Lab titles are generic placeholders, not TryHackMe course material.
const GOALS = [
  { id: 'goal-soc-onboarding', title: 'Onboard new SOC analysts', why: 'Prove a new hire can triage a real-looking alert in week one.', plan: ['Kick-off: share the goal and why it matters (15 min)', 'Learner 1 and 2 start "Alert triage basics" (illustrative lab)', 'Pair review of first findings', 'Complete one meaningful lab each', 'Manager checks progress view; nudge anyone stuck', 'Second lab for anyone done early (optional)', 'Proof review: did two people reach first value?'] },
  { id: 'goal-incident-response', title: 'Rehearse incident response', why: 'Show the team can walk through a contained incident end to end.', plan: ['Kick-off: pick the scenario owner', 'Start "Contain a phishing incident" (illustrative lab)', 'Learners log their first timeline entry', 'Complete one meaningful lab each', 'Manager checks progress view; nudge anyone stuck', 'Short retro: what slowed people down?', 'Proof review: did two people reach first value?'] },
  { id: 'goal-cloud-foundations', title: 'Cloud security foundations', why: 'Check engineers can spot a misconfigured storage bucket.', plan: ['Kick-off: agree the two pilot learners', 'Start "Find the exposed bucket" (illustrative lab)', 'Share one finding in team chat', 'Complete one meaningful lab each', 'Manager checks progress view; nudge anyone stuck', 'Optional stretch lab', 'Proof review: did two people reach first value?'] },
  { id: 'goal-web-app-testing', title: 'Web app testing basics', why: 'Give developers one hands-on look at a common web flaw.', plan: ['Kick-off: pick a low-pressure slot', 'Start "Spot an injection flaw" (illustrative lab)', 'Learners note one fix they would make', 'Complete one meaningful lab each', 'Manager checks progress view; nudge anyone stuck', 'Optional stretch lab', 'Proof review: did two people reach first value?'] },
];
const ROSTER = ['Analyst A', 'Analyst B', 'Engineer C', 'Engineer D', 'Lead E', 'Analyst F'];

const fresh = () => ({
  tab: 'manager',
  manager: { accountId: 'preview-' + Math.random().toString(16).slice(2, 8), start: null, day: 0, goal: null, planCreated: false, learners: ROSTER.map((n, i) => ({ id: `L${i + 1}`, name: n, selected: false })), events: [] },
  growth: { source: 'pilot', upload: null, uploadName: null, contract: null, registeredAt: null, amended: false, inspect: null, lookup: '' },
});
let S;
try { S = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch { S = fresh(); }
let storageOk = true;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { storageOk = false; } };
const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 2600); };
function download(name, text, type = 'application/json') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------------- Tabs ----------------
function setTab(t, focus) {
  S.tab = t; save();
  for (const name of ['manager', 'growth']) {
    const tab = $(`#tab-${name}`), panel = $(`#panel-${name}`), on = name === t;
    tab.setAttribute('aria-selected', on); tab.tabIndex = on ? 0 : -1; panel.hidden = !on;
    if (on && focus) tab.focus();
  }
  render();
}
function initTabs() {
  const tabs = ['manager', 'growth'];
  for (const name of tabs) {
    const tab = $(`#tab-${name}`);
    tab.addEventListener('click', () => setTab(name));
    tab.addEventListener('keydown', e => {
      const i = tabs.indexOf(name);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); setTab(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length], true); }
      if (e.key === 'Home') { e.preventDefault(); setTab(tabs[0], true); }
      if (e.key === 'End') { e.preventDefault(); setTab(tabs[tabs.length - 1], true); }
    });
  }
}

// ---------------- Manager preview ----------------
const M = () => S.manager;
const seed = E.DEFAULT_CONTRACT.assignment_seed;
function simNow() { const m = M(); return m.start + m.day * D + (m.events.length % 50) * 60000; }
function logEvent(type, extra = {}) {
  const m = M();
  if (m.start == null) m.start = Date.now();
  m.events.push({ event_id: `${m.accountId}-${String(m.events.length + 1).padStart(3, '0')}`, account_id: m.accountId, learner_id: '', event_type: type, occurred_at: isoMin(simNow()), variant: 'treatment', goal_id: m.goal || '', plan_id: m.planCreated ? `${m.accountId}-proof-7d` : '', lab_id: '', assignment_seed: seed, ...extra });
}
function previewAccount() {
  const m = M(); if (!m.events.length) return null;
  const v = E.validateEvents(E.toCSV(m.events));
  return E.buildAccounts(v.valid, { ...E.DEFAULT_CONTRACT })[0] || null;
}
function learnerState(id) {
  const evs = M().events.filter(e => e.learner_id === id).map(e => e.event_type);
  if (evs.includes('learner_opted_out')) return 'opted out';
  if (evs.includes('meaningful_lab_completed')) return 'completed';
  if (evs.includes('lab_started')) return 'lab started';
  if (evs.includes('invite_accepted')) return 'accepted';
  if (evs.includes('learner_invited')) return 'invited (simulated)';
  return null;
}
const NEXT = { 'invited (simulated)': ['invite_accepted', 'Simulate accept'], accepted: ['lab_started', 'Simulate lab start'], 'lab started': ['meaningful_lab_completed', 'Simulate completion'] };

function renderManager() {
  const m = M(), goal = GOALS.find(g => g.id === m.goal), acct = previewAccount();
  const invited = m.learners.filter(l => learnerState(l.id));
  const selected = m.learners.filter(l => l.selected && !learnerState(l.id));
  const def = E.DEFAULT_CONTRACT.activation_definition;
  const assigned = E.assignVariant(m.accountId, seed);
  const crit = [
    ['Admin chose a team goal', !!m.goal],
    ['Admin created the seven-day proof plan', !!acct?.plan],
    [`At least ${def.min_distinct_learners} learners invited`, (acct?.invited || 0) >= def.min_distinct_learners],
    [`At least ${def.min_distinct_learners} distinct invited learners completed a meaningful lab within ${def.window_days} days`, !!acct?.activated],
  ];
  $('#panel-manager').innerHTML = `
  <div class="card"><p class="small muted" style="margin:0">You are previewing the <strong>treatment</strong> (goal-led) experience as a security manager on a trial. Preview account <code>${esc(m.accountId)}</code>, simulated day <strong>${m.day}</strong> of ${def.window_days}. In a live test this account's hash would assign it to <span class="tag ${assigned === 'control' ? 'ctl' : 'trt'}">${assigned}</span>; the preview always shows treatment so you can try it.</p></div>
  <div class="grid2">
    <div>
      <div class="card step"><p class="step-n">Step 1</p><h2>Pick one goal for the trial</h2>
        <fieldset style="border:0;padding:0;margin:0"><legend class="sr">Team goal</legend><div class="grid4" style="grid-template-columns:1fr">
        ${GOALS.map(g => `<label class="goal"><input type="radio" name="goal" value="${g.id}" ${m.goal === g.id ? 'checked' : ''} ${m.planCreated ? 'disabled' : ''}><b>${esc(g.title)}</b><span>${esc(g.why)}</span></label>`).join('')}
        </div></fieldset>
        ${m.planCreated ? '<p class="small muted">Goal is locked once the plan exists. Reset the preview to change it.</p>' : ''}
      </div>
      <div class="card step"><p class="step-n">Step 2</p><h2>Seven-day proof plan</h2>
        ${goal ? `<ol class="plan">${goal.plan.map((p, i) => `<li><span class="d">Day ${i + 1}</span><span>${esc(p)}</span></li>`).join('')}</ol>
        <p class="small muted">Lab titles are illustrative placeholders, not real course content.</p>
        <button class="btn primary" id="create-plan" ${m.planCreated ? 'disabled' : ''}>${m.planCreated ? 'Plan created' : 'Create proof plan'}</button>` : '<p class="muted">Choose a goal to see the plan.</p>'}
      </div>
    </div>
    <div>
      <div class="card step"><p class="step-n">Step 3</p><h2>Invite a first cohort</h2>
        <p class="small">Choose at least two people. Invitations are <span class="tag sim">simulated</span>: they create local records only and nothing is emailed.</p>
        <fieldset style="border:0;padding:0;margin:0"><legend class="sr">Learners</legend>
        ${m.learners.map(l => { const st = learnerState(l.id); return `<div class="row" style="justify-content:space-between;border-bottom:1px solid var(--bg-light);padding:4px 0">
          <label class="check"><input type="checkbox" data-learner="${l.id}" ${l.selected || st ? 'checked' : ''} ${st ? 'disabled' : ''}> ${esc(l.name)} <span class="muted small">(${l.id})</span></label>
          <span class="row">${st ? `<span class="tag ${st === 'completed' ? 'ok' : st === 'opted out' ? 'err' : 'sim'}">${st}</span>` : ''}
          ${NEXT[st] ? `<button class="btn secondary small" data-advance="${l.id}">${NEXT[st][1]}</button>` : ''}
          ${st && st !== 'completed' && st !== 'opted out' ? `<button class="btn danger small" data-optout="${l.id}" aria-label="Simulate ${esc(l.name)} opting out">Opt out</button>` : ''}</span></div>`; }).join('')}
        </fieldset>
        <div class="row" style="margin-top:12px">
          <button class="btn primary" id="invite" ${selected.length ? '' : 'disabled'}>Create ${selected.length || ''} simulated invitation${selected.length === 1 ? '' : 's'}</button>
          <button class="btn secondary" id="advance-day" ${m.start == null || m.day >= 9 ? 'disabled' : ''}>Advance simulated day</button>
        </div>
        ${invited.length && !m.planCreated ? '<p class="flag small">Invites sent before the plan exists are flagged in the event log; those learners only count once the plan is created.</p>' : ''}
      </div>
      <div class="card" aria-live="polite"><h3>First-value check</h3>
        <ul class="criteria">${crit.map(([t, d]) => `<li class="${d ? 'done' : ''}"><span class="ic" aria-hidden="true">${d ? '✓' : ''}</span><span>${esc(t)}<span class="sr">${d ? ' (met)' : ' (not yet)'}</span></span></li>`).join('')}</ul>
        <p style="margin:12px 0 0">${acct?.activated ? '<strong style="color:var(--ok)">This preview account reached the proposed first-value state.</strong> That is a product hypothesis, not proof of security readiness.' : m.day > def.window_days ? '<strong class="flag">The seven-day window has passed without activation.</strong> In the growth view this account would count as not activated.' : `<span class="muted">Status: ${esc(acct ? E.stalledStep(acct) : 'not started')}.</span>`}</p>
        ${acct?.flags?.length ? `<p class="flag small">${acct.flags.map(esc).join('<br>')}</p>` : ''}
      </div>
    </div>
  </div>
  <div class="card"><h3>Local event log (${m.events.length})</h3>
    <p class="small muted">Each action writes one row in the same CSV schema the growth view reads. Learner IDs are pseudonymous.</p>
    ${m.events.length ? `<div class="scroll" tabindex="0" role="region" aria-label="Local event log table"><table><thead><tr><th>occurred_at</th><th>event_type</th><th>learner_id</th><th>goal_id</th></tr></thead><tbody>${m.events.slice().reverse().slice(0, 30).map(e => `<tr><td>${esc(e.occurred_at)}</td><td>${esc(e.event_type)}</td><td>${esc(e.learner_id)}</td><td>${esc(e.goal_id)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No events yet.</p>'}
    <div class="row" style="margin-top:12px"><button class="btn secondary" id="export-preview" ${m.events.length ? '' : 'disabled'}>Export preview events (CSV)</button><button class="btn danger" id="reset-preview">Reset preview</button></div>
  </div>`;
}
function bindManager() {
  const p = $('#panel-manager');
  p.addEventListener('change', e => {
    const m = M();
    if (e.target.name === 'goal') { m.goal = e.target.value; if (!m.events.some(x => x.event_type === 'evaluation_started')) logEvent('evaluation_started'); logEvent('goal_selected', { goal_id: m.goal }); save(); render(`input[value="${m.goal}"]`); }
    if (e.target.dataset.learner) { const l = m.learners.find(x => x.id === e.target.dataset.learner); l.selected = e.target.checked; save(); render(`[data-learner="${l.id}"]`); }
  });
  p.addEventListener('click', e => {
    const m = M(), b = e.target.closest('button'); if (!b) return;
    if (b.id === 'create-plan') { m.planCreated = true; logEvent('plan_created'); toast('Proof plan created (local only).'); save(); render('#invite'); }
    if (b.id === 'invite') {
      if (!m.events.length) logEvent('evaluation_started');
      const sel = m.learners.filter(l => l.selected && !learnerState(l.id));
      sel.forEach(l => logEvent('learner_invited', { learner_id: l.id }));
      toast(`${sel.length} simulated invitation(s) recorded locally. Nothing was sent.`); save(); render('#advance-day');
    }
    if (b.dataset.advance) { const st = learnerState(b.dataset.advance); const [type] = NEXT[st]; logEvent(type, { learner_id: b.dataset.advance, lab_id: type === 'invite_accepted' ? '' : `lab-illustrative-${m.goal || 'none'}` }); save(); render(`[data-advance="${b.dataset.advance}"]`); }
    if (b.dataset.optout) { logEvent('learner_opted_out', { learner_id: b.dataset.optout }); save(); render(); }
    if (b.id === 'advance-day') { m.day += 1; save(); render('#advance-day'); toast(`Simulated day ${m.day}.`); }
    if (b.id === 'export-preview') download(`preview-events-${m.accountId}.csv`, E.toCSV(m.events), 'text/csv');
    if (b.id === 'reset-preview' && confirm('Reset the manager preview? This clears its local events.')) { S.manager = fresh().manager; save(); render('#tab-manager'); toast('Preview reset.'); }
  });
}

// ---------------- Growth view ----------------
const G = () => S.growth;
let cache = { key: null };
function scenario() { return SCENARIOS.find(s => s.id === G().source) || null; }
async function sourceCSV() {
  const g = G();
  if (g.source === 'upload') return g.upload || '';
  const sc = scenario();
  if (!cache[sc.file]) cache[sc.file] = await (await fetch(`/data/${sc.file}`)).text();
  return cache[sc.file];
}
function draftContract() {
  const g = G(); const sc = scenario();
  return g.contract || { ...E.DEFAULT_CONTRACT, ...(sc ? sc.contract : {}), guardrails: { ...E.DEFAULT_CONTRACT.guardrails } };
}
async function computed() {
  const g = G(), csv = await sourceCSV(), key = `${g.source}|${csv.length}|${JSON.stringify(g.contract)}|${g.amended}`;
  if (cache.key === key) return cache.val;
  const validation = E.validateEvents(csv);
  const analysis = g.registeredAt ? E.analyse(validation, g.contract, { registeredBeforeOutcomes: !g.amended }) : null;
  cache.key = key; cache.val = { validation, analysis, csv };
  return cache.val;
}
function intervalSVG(pv) {
  const W = 520, Hh = 92, x0 = 110, x1 = W - 20; const max = Math.min(1, Math.max(0.1, ...['control', 'treatment'].map(v => pv[v].interval[1] || 0)) + 0.05);
  const X = v => x0 + (x1 - x0) * v / max;
  const rows = ['control', 'treatment'].map((v, i) => { const p = pv[v], y = 28 + i * 34, c = v === 'control' ? 'var(--c-control)' : 'var(--c-treat)';
    return p.rate == null ? `<text x="0" y="${y + 4}">${v}: no data</text>` : `<text x="0" y="${y + 4}">${v} (n=${p.n})</text><line x1="${X(p.interval[0])}" x2="${X(p.interval[1])}" y1="${y}" y2="${y}" stroke="${c}" stroke-width="3"/><circle cx="${X(p.rate)}" cy="${y}" r="6" fill="${c}"/><text x="${X(p.interval[1]) + 6}" y="${y + 4}">${pct(p.rate)}</text>`; }).join('');
  const ticks = [0, max / 2, max].map(t => `<line x1="${X(t)}" x2="${X(t)}" y1="10" y2="${Hh - 16}" stroke="#3e475a"/><text x="${X(t) - 10}" y="${Hh - 2}">${(t * 100).toFixed(0)}%</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${Hh}" width="100%" role="img" aria-label="Activation rate with 95% interval by variant: control ${pct(pv.control.rate)}, treatment ${pct(pv.treatment.rate)}">${ticks}${rows}</svg>`;
}
function diffSVG(eff, minPP) {
  if (eff.diff == null) return '<p class="muted">No difference can be computed: one variant has no mature accounts.</p>';
  const W = 520, Hh = 70, lo = Math.min(-0.05, eff.lo - 0.02), hi = Math.max(minPP / 100 + 0.05, eff.hi + 0.02), X = v => 20 + (W - 40) * (v - lo) / (hi - lo);
  return `<svg viewBox="0 0 ${W} ${Hh}" width="100%" role="img" aria-label="Difference treatment minus control ${pp(eff.diff)}, 95% interval ${pp(eff.lo)} to ${pp(eff.hi)}">
    <line x1="${X(0)}" x2="${X(0)}" y1="6" y2="48" stroke="#b8bec9" stroke-dasharray="3 3"/><text x="${X(0) - 4}" y="64">0</text>
    <line x1="${X(minPP / 100)}" x2="${X(minPP / 100)}" y1="6" y2="48" stroke="#ae6bff" stroke-dasharray="2 4"/><text x="${X(minPP / 100) - 30}" y="64">min ${minPP} pp</text>
    <line x1="${X(eff.lo)}" x2="${X(eff.hi)}" y1="28" y2="28" stroke="#f9f9fb" stroke-width="3"/><circle cx="${X(eff.diff)}" cy="28" r="6" fill="#a3ea2a"/>
    <text x="${X(eff.lo)}" y="18">${pp(eff.lo)}</text><text x="${X(eff.hi) - 40}" y="18">${pp(eff.hi)}</text></svg>`;
}
async function renderGrowth() {
  const g = G(), { validation: v, analysis: a } = await computed(), c = draftContract(), locked = !!g.registeredAt, sc = scenario();
  const contractField = (k, label, type = 'number', val = c[k]) => `<div><label class="f" for="c-${k}">${label}</label><input id="c-${k}" data-contract="${k}" type="${type}" value="${esc(val ?? '')}" ${locked ? 'disabled' : ''} ${type === 'number' ? 'min="0" inputmode="numeric"' : ''}></div>`;
  const stalled = a ? a.mature.filter(x => !x.activated) : [];
  const inspect = a && (a.accounts.find(x => x.id === g.inspect) || stalled[0]);
  const lookupId = g.lookup.trim();
  $('#panel-growth').innerHTML = `
  <div class="card step"><p class="step-n">Step 1 · Load events</p><h2>Choose a synthetic scenario or upload a CSV</h2>
    <div class="grid2">
      <div><label class="f" for="source">Data source</label><select id="source">${SCENARIOS.map(s => `<option value="${s.id}" ${g.source === s.id ? 'selected' : ''}>${esc(s.title)}</option>`).join('')}<option value="upload" ${g.source === 'upload' ? 'selected' : ''}>Uploaded CSV${g.uploadName ? ': ' + esc(g.uploadName) : ''}</option></select>
        <p class="small muted">${esc(sc ? sc.summary : 'Your own file, parsed in this browser only. Use the documented schema.')}</p></div>
      <div><label class="f" for="upload">Upload events CSV (stays in your browser)</label><input id="upload" type="file" accept=".csv,text/csv" style="min-height:44px">
        <div class="row" style="margin-top:8px"><button class="btn secondary small" id="dl-sample">Download scenario CSV</button><button class="btn secondary small" id="dl-spec">Instrumentation spec (JSON)</button></div></div>
    </div>
  </div>
  <div class="card step"><p class="step-n">Step 2 · Validate</p><h2>Schema check and quarantine</h2>
    ${v.headerError ? `<p class="flag"><strong>File rejected:</strong> ${esc(v.headerError)}</p>` : `
    <div class="kpis"><div class="kpi"><b>${v.totalRows}</b><span>rows read</span></div><div class="kpi"><b>${v.valid.length}</b><span>valid events kept</span></div><div class="kpi"><b style="color:${v.quarantined.length ? 'var(--err)' : 'inherit'}">${v.quarantined.length}</b><span>quarantined</span></div><div class="kpi"><b style="color:${v.duplicates.length ? 'var(--warn)' : 'inherit'}">${v.duplicates.length}</b><span>duplicates dropped</span></div><div class="kpi"><b>${v.outOfOrder}</b><span>out-of-order, re-sorted</span></div></div>
    ${v.warnings.length ? `<ul class="small">${v.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
    ${v.quarantined.length ? `<details ${v.quarantined.length < 8 ? 'open' : ''}><summary>Quarantined rows (${v.quarantined.length})</summary><div class="scroll" tabindex="0" role="region" aria-label="Quarantined rows table"><table><thead><tr><th>Line</th><th>Problem</th><th>Raw</th></tr></thead><tbody>${v.quarantined.slice(0, 100).map(q => `<tr><td>${q.line}</td><td>${esc(q.errors.join('; '))}</td><td><code>${esc(Object.values(q.raw || {}).join(',').slice(0, 80))}</code></td></tr>`).join('')}</tbody></table></div></details>` : ''}
    ${v.duplicates.length ? `<details><summary>Duplicate rows (${v.duplicates.length})</summary><div class="scroll" tabindex="0" role="region" aria-label="Duplicate rows table"><table><thead><tr><th>Line</th><th>Reason</th></tr></thead><tbody>${v.duplicates.slice(0, 100).map(q => `<tr><td>${q.line}</td><td>${esc(q.errors.join('; '))}</td></tr>`).join('')}</tbody></table></div></details>` : ''}`}
  </div>
  <div class="card step"><p class="step-n">Step 3 · Register the experiment before looking</p><h2>Experiment contract</h2>
    <p class="small">${esc(c.hypothesis)}</p>
    <p class="small"><strong>Primary metric, activated_7d:</strong> admin creates a plan and at least ${c.activation_definition.min_distinct_learners} distinct invited learners complete a meaningful lab within ${c.activation_definition.window_days} days of evaluation start. <span class="tag sim">Unvalidated product hypothesis</span></p>
    <p class="small"><strong>Unit and denominator:</strong> the account. Every eligible account is counted in the variant its hash assigns (intent-to-treat), whatever it logged. Learners are nested inside accounts and never counted as separate trials. Assignment: <code>hash("${esc(c.assignment_seed)}:" + account_id)</code>.</p>
    <div class="grid4">
      ${contractField('minimum_sample_per_variant', 'Minimum mature accounts per variant')}
      ${contractField('minimum_effect_pp', 'Minimum effect worth shipping (pp)')}
      ${contractField('enrollment_start', 'Enrollment start (UTC, ISO)', 'text')}
      ${contractField('enrollment_end', 'Enrollment end (UTC, ISO)', 'text')}
      ${contractField('analysis_as_of', 'Analysis as of (UTC, ISO; blank = last event)', 'text')}
    </div>
    <p class="small muted">Guardrails: missing account IDs ≤ ${pct(c.guardrails.max_missing_account_id_rate)}, duplicates ≤ ${pct(c.guardrails.max_duplicate_rate)}, assignment mismatch ≤ ${pct(c.guardrails.max_assignment_mismatch_rate)}, SRM chi-square &lt; ${c.guardrails.srm_chi_square_threshold}, immature share ≤ ${pct(c.guardrails.max_immature_share, 0)}, opt-out increase ≤ ${c.guardrails.max_opt_out_increase_pp} pp, setup-time increase ≤ ${c.guardrails.max_setup_time_increase_hours} h.</p>
    <div class="row">${locked ? `<span class="tag ok">Registered ${esc(g.registeredAt)}</span>${g.amended ? '<span class="tag err">Amended after outcomes were shown</span>' : ''}<button class="btn secondary" id="amend">Amend contract (voids decision)</button>` : '<button class="btn primary" id="register">Register contract and show outcomes</button><span class="small muted">Outcomes stay hidden until the contract is registered.</span>'}</div>
  </div>
  ${a ? `
  <div class="card step"><p class="step-n">Step 4 · Account funnel</p><h2>Where accounts drop off</h2>
    <p class="small">Denominator: <strong>${a.counts.mature}</strong> mature eligible accounts (evaluation started ${c.enrollment_start ? `${esc(c.enrollment_start.slice(0, 10))} to ${esc((c.enrollment_end || '').slice(0, 10))}` : 'in the file'}, full ${c.activation_definition.window_days}-day window observed by ${esc(new Date(a.asOf || 0).toISOString().slice(0, 10))}). ${a.counts.immature} immature and ${a.exclusions.length - a.counts.immature} other excluded accounts are logged below.</p>
    <div class="scroll" tabindex="0" role="region" aria-label="Funnel table"><table class="funnel"><thead><tr><th>Stage</th><th class="num">Control</th><th><span class="sr">Control bar</span></th><th class="num">Treatment</th><th><span class="sr">Treatment bar</span></th></tr></thead><tbody>
      ${a.funnel.control.map((s, i) => { const t = a.funnel.treatment[i]; return `<tr><td>${esc(s.label)}</td><td class="num">${s.n}/${s.denominator} · ${pct(s.rate, 0)}</td><td><div class="bar"><i style="width:${(s.rate || 0) * 100}%;background:var(--c-control)"></i></div></td><td class="num">${t.n}/${t.denominator} · ${pct(t.rate, 0)}</td><td><div class="bar"><i style="width:${(t.rate || 0) * 100}%;background:var(--c-treat)"></i></div></td></tr>`; }).join('')}
    </tbody></table></div>
    ${a.exclusions.length ? `<details><summary>Exclusion log (${a.exclusions.length})</summary><div class="scroll" tabindex="0" role="region" aria-label="Exclusion log table"><table><thead><tr><th>Account</th><th>Reason</th></tr></thead><tbody>${a.exclusions.slice(0, 200).map(x => `<tr><td>${esc(x.account_id)}</td><td>${esc(x.reason)}</td></tr>`).join('')}</tbody></table></div></details>` : ''}
  </div>
  <div class="grid2">
    <div class="card step"><p class="step-n">Step 5 · Inspect a stalled buyer</p><h2>One account, end to end</h2>
      ${stalled.length ? `<label class="f" for="inspect">Stalled mature account (${stalled.length})</label><select id="inspect">${stalled.slice(0, 300).map(x => `<option value="${esc(x.id)}" ${inspect && inspect.id === x.id ? 'selected' : ''}>${esc(x.id)} · ${x.assigned} · ${esc(E.stalledStep(x))}</option>`).join('')}</select>` : '<p class="muted">No stalled mature accounts.</p>'}
      ${inspect ? `<p class="small" style="margin-top:10px">Assigned <span class="tag ${inspect.assigned === 'control' ? 'ctl' : 'trt'}">${inspect.assigned}</span> · logged ${inspect.logged.map(esc).join(', ') || 'none'} · stalled at <strong>${esc(E.stalledStep(inspect))}</strong> · ${inspect.invited} invited, ${inspect.accepted} accepted, ${inspect.started} started, ${inspect.completed} qualifying completions.</p>
      ${inspect.flags.length ? `<p class="flag small">${inspect.flags.map(esc).join('<br>')}</p>` : ''}
      <ol class="timeline" tabindex="0" aria-label="Account event timeline">${inspect.events.map(e => `<li><time>${fmtT(e.ts)}</time><span>${esc(e.event_type)}${e.learner_id ? ` · ${esc(e.learner_id)}` : ''}${e.variant !== inspect.assigned ? ' <span class="flag">(logged ' + esc(e.variant) + ')</span>' : ''}</span></li>`).join('')}</ol>
      <p class="small muted">Suggested handoff: ${inspect.plan ? (inspect.invited < 2 ? 'CS nudge the admin to invite a second learner.' : 'CS check whether invited learners hit an access or time blocker.') : 'Sales/CS offer a 15-minute goal-setting call; the admin never created a plan.'} (Illustrative play; nothing is sent.)</p>` : ''}
    </div>
    <div class="card step"><p class="step-n">Step 6 · Check group assignment</p><h2>Is this account in the right arm?</h2>
      <label class="f" for="lookup">Account ID</label><input id="lookup" type="text" value="${esc(g.lookup)}" placeholder="e.g. ${esc(a.accounts[0]?.id || 'a-acct-001')}" autocomplete="off" spellcheck="false">
      ${lookupId ? (() => { const x = a.accounts.find(y => y.id === lookupId); const asg = E.assignVariant(lookupId, c.assignment_seed); return `<p class="small">Hash assignment with seed <code>${esc(c.assignment_seed)}</code>: <span class="tag ${asg === 'control' ? 'ctl' : 'trt'}">${asg}</span>. ${x ? `Logged variant(s): ${x.logged.map(esc).join(', ')}. ${x.crossVariant ? '<span class="flag">Logged in both variants.</span>' : x.mismatch ? '<span class="flag">Logged variant disagrees with assignment.</span>' : 'Matches.'}` : 'Not in this file; assignment shown for reference.'} The same ID always gets the same arm.</p>`; })() : '<p class="small muted">Type any ID to see its stable assignment.</p>'}
      <p class="small">Eligible accounts: ${a.perVariant.control.eligible} control / ${a.perVariant.treatment.eligible} treatment.</p>
    </div>
  </div>
  <div class="card step"><p class="step-n">Qualitative evidence</p><h2>What customers have said</h2>
    <p><span class="tag err">0 interviews conducted</span> No customer research supports the activation hypothesis yet, so none is shown here. The funnel above can show <em>where</em> synthetic accounts stall, not <em>why</em>.</p>
    <details><summary>Planned discovery questions (from the interview plan)</summary><ol class="small">
      <li>Walk me through the last time you evaluated training for your team. What did you need to see before buying?</li>
      <li>After signing up, what was the first thing you tried to get the team to do?</li>
      <li>Where did the evaluation slow down: picking content, getting people to join, time, or procurement?</li>
      <li>How did you judge whether the trial was worth it?</li>
      <li>Who else (Sales, CS, finance, security leadership) was involved, and when?</li></ol></details>
    <label class="f" for="notes" style="margin-top:10px">Your notes (local only; never sent)</label>
    <textarea id="notes" rows="3" style="width:100%;font:inherit;color:var(--text);background:var(--bg);border:1px solid var(--divider);border-radius:4px;padding:8px">${esc(g.notes || '')}</textarea>
  </div>
  <div class="card step"><p class="step-n">Step 7 · Analyse seeded variants</p><h2>Seven-day account activation</h2>
    <div class="scroll" tabindex="0" role="region" aria-label="Activation results table"><table><thead><tr><th>Variant</th><th class="num">Mature accounts (n)</th><th class="num">Activated</th><th class="num">Rate</th><th class="num">95% interval</th><th class="num">Opt-out rate</th><th class="num">Median setup h</th></tr></thead><tbody>
    ${['control', 'treatment'].map(k => { const p = a.perVariant[k]; return `<tr><td><span class="tag ${k === 'control' ? 'ctl' : 'trt'}">${k}</span></td><td class="num">${p.n}</td><td class="num">${p.activated}</td><td class="num">${pct(p.rate)}</td><td class="num">${p.interval[0] == null ? 'n/a' : `${pct(p.interval[0])} to ${pct(p.interval[1])}`}</td><td class="num">${pct(p.opt_out_rate)}</td><td class="num">${p.median_setup_hours == null ? 'n/a' : p.median_setup_hours.toFixed(1)}</td></tr>`; }).join('')}
    </tbody></table></div>
    ${intervalSVG(a.perVariant)}
    <h3 style="margin-top:12px">Difference, treatment minus control: ${pp(a.effect.diff)} ${a.effect.lo != null ? `<span class="muted">(95% interval ${pp(a.effect.lo)} to ${pp(a.effect.hi)})</span>` : ''}</h3>
    ${diffSVG(a.effect, c.minimum_effect_pp)}
    <p class="small muted">Wilson score intervals per arm; Newcombe hybrid interval for the difference. Descriptive only: no p-value is shown, and these are seeded synthetic figures, not results from a real experiment.</p>
  </div>
  <div class="card step"><p class="step-n">Step 8 · Quality gates and guardrails</p><h2>Can this data support a decision?</h2>
    <ul class="gates">${a.checks.map(k => `<li class="${k.kind === 'note' ? 'note' : k.pass ? '' : 'fail'}"><span class="tag ${k.kind === 'note' ? '' : k.pass ? 'ok' : 'err'}">${k.kind === 'note' ? 'NOTE' : k.pass ? 'PASS' : 'FAIL'}</span><span>${esc(k.label)}<small>${esc(k.detail)}</small></span></li>`).join('')}</ul>
  </div>
  <div class="card step decision ${a.decision}" aria-live="polite"><p class="step-n">Step 9 · Recommendation</p>
    <p class="verdict">${{ ship: 'Ship to a wider pilot', iterate: 'Iterate', no_decision: 'No decision' }[a.decision]}</p>
    <p>${esc(a.rationale)}</p>
    <div class="row"><button class="btn primary" id="dl-decision">Export decision (JSON)</button><button class="btn secondary" id="dl-spec2">Export instrumentation spec (JSON)</button></div>
  </div>` : ''}
  <div class="row"><button class="btn danger" id="reset-growth">Reset growth view</button></div>`;
}
function bindGrowth() {
  const p = $('#panel-growth');
  p.addEventListener('change', async e => {
    const g = G(), t = e.target;
    if (t.id === 'source') { g.source = t.value; g.contract = null; g.registeredAt = null; g.amended = false; g.inspect = null; save(); render('#source'); }
    if (t.id === 'upload' && t.files[0]) {
      const f = t.files[0]; if (f.size > 5e6) { toast('File over 5 MB; please trim it.'); return; }
      g.upload = await f.text(); g.uploadName = f.name; g.source = 'upload'; g.contract = null; g.registeredAt = null; g.amended = false; g.inspect = null; save();
      if (g.upload.length > 2e6) toast('Large file: parsed, but it may not persist after reload.');
      render('#source'); toast(`Loaded ${f.name} locally.`);
    }
    if (t.dataset.contract) { const c = draftContract(); const k = t.dataset.contract; c[k] = t.type === 'number' ? Math.max(0, Number(t.value) || 0) : (t.value.trim() || null); g.contract = c; save(); }
    if (t.id === 'inspect') { g.inspect = t.value; save(); render('#inspect'); }
  });
  p.addEventListener('input', e => { if (e.target.id === 'notes') { G().notes = e.target.value; save(); return; } if (e.target.id === 'lookup') { G().lookup = e.target.value; save(); clearTimeout(bindGrowth.h); bindGrowth.h = setTimeout(() => render('#lookup'), 250); } });
  p.addEventListener('click', async e => {
    const g = G(), b = e.target.closest('button'); if (!b) return;
    if (b.id === 'register') { g.contract = draftContract(); g.registeredAt = new Date().toISOString().replace(/\.\d+Z$/, 'Z'); save(); render('#dl-decision'); }
    if (b.id === 'amend' && confirm('Amending the contract after outcomes were shown means any decision becomes "no decision". Continue?')) { g.registeredAt = null; g.amended = true; save(); render('#c-minimum_sample_per_variant'); }
    if (b.id === 'dl-sample') { const csv = await sourceCSV(); download(scenario()?.file || 'uploaded.csv', csv, 'text/csv'); }
    if (b.id === 'dl-spec' || b.id === 'dl-spec2') download('instrumentation-spec.json', JSON.stringify({ ...E.INSTRUMENTATION_SPEC, notice: 'Independent synthetic-data concept. Not an official TryHackMe specification.' }, null, 2));
    if (b.id === 'dl-decision') { const { validation, analysis } = await computed(); download(`experiment-decision-${g.source}.json`, JSON.stringify(E.buildDecisionExport(analysis, validation, { scenario: scenario()?.title || g.uploadName, registeredAt: g.registeredAt }), null, 2)); toast('Decision exported to your device.'); }
    if (b.id === 'reset-growth' && confirm('Reset the growth view? Uploaded data and contract registration are cleared.')) { S.growth = fresh().growth; save(); render('#source'); toast('Growth view reset.'); }
  });
}

// ---------------- Render loop ----------------
let rendering = Promise.resolve();
function render(focusSel) {
  rendering = rendering.then(async () => {
    const y = window.scrollY;
    if (S.tab === 'manager') renderManager(); else await renderGrowth();
    window.scrollTo(0, y);
    if (focusSel) { const f = document.querySelector(focusSel); if (f && !f.disabled) f.focus({ preventScroll: true }); }
    if (!storageOk) $('#concept-tag').textContent = 'Independent concept · synthetic data · storage unavailable: state will not persist';
  }).catch(err => { console.error(err); $(`#panel-${S.tab}`).innerHTML = `<div class="card"><p class="flag">Something went wrong rendering this view: ${esc(err.message)}. Try “Reset everything”.</p></div>`; });
  return rendering;
}

initTabs(); bindManager(); bindGrowth();
$('#export-all').addEventListener('click', () => download('team-activation-lab-state.json', JSON.stringify({ notice: 'Local state from an independent synthetic-data concept.', exported_at: new Date().toISOString(), state: S }, null, 2)));
$('#reset-all').addEventListener('click', () => { if (!confirm('Reset everything stored by this demo in this browser?')) return; localStorage.removeItem(KEY); S = fresh(); cache = { key: null }; setTab('manager', true); toast('All local state cleared.'); });
setTab(S.tab || 'manager');
