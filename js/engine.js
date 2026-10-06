// Team Activation Lab engine. Pure, deterministic functions shared by the browser UI and the tests.
// All data is synthetic. Nothing here sends, tracks or connects to anything.

export const SCHEMA = ['event_id', 'account_id', 'learner_id', 'event_type', 'occurred_at', 'variant', 'goal_id', 'plan_id', 'lab_id', 'assignment_seed'];
export const EVENT_TYPES = ['evaluation_started', 'goal_selected', 'plan_created', 'learner_invited', 'invite_accepted', 'lab_started', 'meaningful_lab_completed', 'learner_opted_out', 'decision_exported'];
export const LEARNER_EVENTS = new Set(['learner_invited', 'invite_accepted', 'lab_started', 'meaningful_lab_completed', 'learner_opted_out']);
export const VARIANTS = ['control', 'treatment'];
const DAY_MS = 86400000;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/;

export const DEFAULT_CONTRACT = Object.freeze({
  hypothesis: 'Showing a goal-led seven-day proof plan (treatment) instead of the generic signup journey (control) increases the share of evaluating accounts that reach the first-value state within seven days.',
  unit: 'account',
  assignment_seed: 'tal-2026-10',
  primary_metric: 'activated_7d',
  activation_definition: { min_distinct_learners: 2, window_days: 7, requires_plan: true },
  minimum_sample_per_variant: 100,
  minimum_effect_pp: 5,
  interval_level: 0.95,
  enrollment_start: null,
  enrollment_end: null,
  analysis_as_of: null,
  guardrails: {
    max_missing_account_id_rate: 0.02,
    max_duplicate_rate: 0.02,
    max_assignment_mismatch_rate: 0.01,
    srm_chi_square_threshold: 6.635, // chi-square, 1 df, alpha 0.01
    max_immature_share: 0.1,
    max_opt_out_increase_pp: 3,
    max_setup_time_increase_hours: 24,
  },
});

// ---------- CSV ----------
export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false, line = 1, rowLine = 1;
  const s = String(text ?? '').replace(/^\uFEFF/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else { if (c === '\n') line++; field += c; }
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field); rows.push({ line: rowLine, cells: row }); row = []; field = ''; line++; rowLine = line;
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push({ line: rowLine, cells: row }); }
  return rows.filter(r => !(r.cells.length === 1 && r.cells[0].trim() === ''));
}

export function toCSV(events) {
  const esc = v => { const t = v == null ? '' : String(v); return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  return [SCHEMA.join(','), ...events.map(e => SCHEMA.map(k => esc(e[k])).join(','))].join('\n') + '\n';
}

// ---------- Assignment ----------
export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
// Murmur3 finaliser: spreads every input bit so the top bit is a fair coin for any seed.
export function mix32(h) {
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16; return h >>> 0;
}

export function assignVariant(accountId, seed) {
  return mix32(fnv1a(`${seed}:${accountId}`)) < 0x80000000 ? 'control' : 'treatment';
}

// ---------- Validation ----------
export function validateEvents(csvText) {
  const parsed = parseCSV(csvText);
  const result = { valid: [], quarantined: [], duplicates: [], warnings: [], totalRows: 0, headerError: null };
  if (!parsed.length) { result.headerError = 'File is empty.'; return result; }
  const header = parsed[0].cells.map(h => h.trim());
  const missing = SCHEMA.filter(k => !header.includes(k));
  if (missing.length) { result.headerError = `Missing required column(s): ${missing.join(', ')}.`; return result; }
  const extra = header.filter(h => !SCHEMA.includes(h));
  if (extra.length) result.warnings.push(`Ignored unknown column(s): ${extra.join(', ')}.`);
  const seenIds = new Map(), seenKeys = new Map();
  let prevTs = -Infinity, outOfOrder = 0;
  for (const { line, cells } of parsed.slice(1)) {
    result.totalRows++;
    const raw = {}; header.forEach((h, i) => { if (SCHEMA.includes(h)) raw[h] = (cells[i] ?? '').trim(); });
    const errors = [];
    if (cells.length !== header.length) errors.push(`expected ${header.length} fields, found ${cells.length}`);
    if (!raw.event_id) errors.push('event_id is empty');
    if (!raw.account_id) errors.push('account_id is missing');
    if (!EVENT_TYPES.includes(raw.event_type)) errors.push(`unknown event_type "${raw.event_type}"`);
    const ts = ISO_UTC.test(raw.occurred_at) ? Date.parse(raw.occurred_at) : NaN;
    if (Number.isNaN(ts)) errors.push(`occurred_at "${raw.occurred_at}" is not an ISO-8601 UTC timestamp (…Z)`);
    if (raw.variant && !VARIANTS.includes(raw.variant)) errors.push(`variant "${raw.variant}" must be control or treatment`);
    if (!raw.variant) errors.push('variant is empty');
    if (LEARNER_EVENTS.has(raw.event_type) && !raw.learner_id) errors.push(`learner_id is required for ${raw.event_type}`);
    if (raw.event_type === 'meaningful_lab_completed' && !raw.lab_id) errors.push('lab_id is required for meaningful_lab_completed');
    if (errors.length) { result.quarantined.push({ line, raw, errors, reason: !raw.account_id ? 'missing_account_id' : 'invalid' }); continue; }
    const ev = { ...raw, learner_id: raw.learner_id || null, ts, line };
    if (seenIds.has(ev.event_id)) { result.duplicates.push({ line, raw, errors: [`duplicate event_id (first seen on line ${seenIds.get(ev.event_id)})`] }); continue; }
    const key = [ev.account_id, ev.learner_id, ev.event_type, ev.lab_id, ev.occurred_at].join('|');
    if (seenKeys.has(key)) { result.duplicates.push({ line, raw, errors: [`duplicate event content (same as line ${seenKeys.get(key)})`] }); continue; }
    seenIds.set(ev.event_id, line); seenKeys.set(key, line);
    if (ts < prevTs) outOfOrder++; prevTs = ts;
    result.valid.push(ev);
  }
  result.valid.sort((a, b) => a.ts - b.ts || a.line - b.line);
  result.outOfOrder = outOfOrder;
  if (outOfOrder) result.warnings.push(`${outOfOrder} row(s) arrived out of time order; events were re-sorted by occurred_at before analysis.`);
  return result;
}

// ---------- Account model ----------
export function buildAccounts(events, contract = DEFAULT_CONTRACT) {
  const by = new Map();
  for (const e of events) {
    if (!by.has(e.account_id)) by.set(e.account_id, []);
    by.get(e.account_id).push(e);
  }
  const def = contract.activation_definition;
  const accounts = [];
  for (const [id, evs] of by) {
    evs.sort((a, b) => a.ts - b.ts);
    const assigned = assignVariant(id, contract.assignment_seed);
    const logged = [...new Set(evs.map(e => e.variant))];
    const start = evs.find(e => e.event_type === 'evaluation_started');
    const plan = evs.find(e => e.event_type === 'plan_created');
    const startTs = start ? start.ts : null;
    const windowEnd = startTs != null ? startTs + def.window_days * DAY_MS : null;
    const learners = new Map();
    const flags = [];
    for (const e of evs) {
      if (!e.learner_id) continue;
      if (!learners.has(e.learner_id)) learners.set(e.learner_id, { id: e.learner_id });
      const l = learners.get(e.learner_id);
      if (e.event_type === 'learner_invited' && l.invited == null) l.invited = e.ts;
      if (e.event_type === 'invite_accepted' && l.accepted == null) l.accepted = e.ts;
      if (e.event_type === 'lab_started' && l.started == null) l.started = e.ts;
      if (e.event_type === 'meaningful_lab_completed' && l.completed == null) l.completed = e.ts;
      if (e.event_type === 'learner_opted_out' && l.optedOut == null) l.optedOut = e.ts;
    }
    const ls = [...learners.values()];
    const earlyInvites = plan ? ls.filter(l => l.invited != null && l.invited < plan.ts).length : 0;
    if (earlyInvites) flags.push(`${earlyInvites} learner(s) invited before plan_created`);
    const uninvitedCompleters = ls.filter(l => l.completed != null && l.invited == null).length;
    if (uninvitedCompleters) flags.push(`${uninvitedCompleters} completion(s) from learners with no invite event (not counted)`);
    if (logged.length > 1) flags.push(`events logged under both variants (${logged.join(' + ')})`);
    else if (logged[0] !== assigned) flags.push(`logged variant "${logged[0]}" differs from hash assignment "${assigned}"`);
    if (!start) flags.push('no evaluation_started event (not eligible)');
    // A learner counts when invited, and completes a meaningful lab after the plan exists and inside the window.
    const qualifying = ls.filter(l => l.invited != null && l.completed != null && startTs != null && l.completed <= windowEnd && (!def.requires_plan || (plan && l.completed >= plan.ts)));
    const activationTs = qualifying.length >= def.min_distinct_learners ? qualifying.map(l => l.completed).sort((a, b) => a - b)[def.min_distinct_learners - 1] : null;
    const inWin = t => t != null && startTs != null && t <= windowEnd;
    const firstInvite = Math.min(...ls.map(l => l.invited ?? Infinity));
    accounts.push({
      id, assigned, logged, events: evs, flags,
      startTs, windowEnd,
      crossVariant: logged.length > 1, mismatch: logged.length === 1 && logged[0] !== assigned,
      goal: evs.some(e => e.event_type === 'goal_selected' && inWin(e.ts)),
      plan: !!plan && inWin(plan.ts), planTs: plan?.ts ?? null,
      invited: ls.filter(l => inWin(l.invited)).length,
      accepted: ls.filter(l => inWin(l.accepted)).length,
      started: ls.filter(l => inWin(l.started)).length,
      completed: qualifying.length,
      optedOut: ls.filter(l => inWin(l.optedOut)).length,
      activated: activationTs != null,
      activationTs,
      setupHours: Number.isFinite(firstInvite) && startTs != null ? (firstInvite - startTs) / 3600000 : null,
      earlyInvites,
    });
  }
  return accounts;
}

export function stalledStep(a, def = DEFAULT_CONTRACT.activation_definition) {
  if (a.activated) return 'activated';
  if (!a.plan) return 'no plan created';
  if (a.invited === 0) return 'no learners invited';
  if (a.accepted < def.min_distinct_learners) return 'invites not accepted';
  if (a.started < def.min_distinct_learners) return 'accepted, no lab started';
  return 'labs started, not completed';
}

// ---------- Statistics (transparent, binary account outcomes) ----------
export function wilson(x, n, z = 1.959964) {
  if (!n) return [null, null];
  const p = x / n, d = 1 + z * z / n;
  const c = (p + z * z / (2 * n)) / d, h = (z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}
// Newcombe (1998) hybrid score interval for p2 - p1.
export function newcombeDiff(x1, n1, x2, n2, z = 1.959964) {
  if (!n1 || !n2) return { diff: null, lo: null, hi: null };
  const p1 = x1 / n1, p2 = x2 / n2, [l1, u1] = wilson(x1, n1, z), [l2, u2] = wilson(x2, n2, z);
  const d = p2 - p1;
  return { diff: d, lo: d - Math.sqrt((p2 - l2) ** 2 + (u1 - p1) ** 2), hi: d + Math.sqrt((u2 - p2) ** 2 + (p1 - l1) ** 2) };
}
export function srmChiSquare(nControl, nTreatment) {
  const n = nControl + nTreatment; if (!n) return 0;
  const e = n / 2; return ((nControl - e) ** 2 + (nTreatment - e) ** 2) / e;
}
const rate = (x, n) => (n ? x / n : null);
const median = arr => { const a = arr.filter(v => v != null).sort((x, y) => x - y); if (!a.length) return null; const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };

// ---------- Funnel ----------
export function funnel(accounts, def = DEFAULT_CONTRACT.activation_definition) {
  const steps = [
    ['Eligible evaluations', () => true],
    ['Goal selected', a => a.goal],
    ['Plan created', a => a.plan],
    ['≥1 learner invited', a => a.invited >= 1],
    [`≥${def.min_distinct_learners} invites accepted`, a => a.accepted >= def.min_distinct_learners],
    [`≥${def.min_distinct_learners} learners started a lab`, a => a.started >= def.min_distinct_learners],
    [`Activated (≥${def.min_distinct_learners} completions in ${def.window_days}d)`, a => a.activated],
  ];
  const out = {};
  for (const v of VARIANTS) {
    const pool = accounts.filter(a => a.assigned === v);
    const base = pool.length;
    out[v] = steps.map(([label, fn]) => { const n = pool.filter(fn).length; return { label, n, denominator: base, rate: rate(n, base) }; });
  }
  return out;
}

// ---------- Full analysis ----------
export function analyse(validation, contractIn = DEFAULT_CONTRACT, opts = {}) {
  const contract = { ...DEFAULT_CONTRACT, ...contractIn, guardrails: { ...DEFAULT_CONTRACT.guardrails, ...(contractIn.guardrails || {}) }, activation_definition: { ...DEFAULT_CONTRACT.activation_definition, ...(contractIn.activation_definition || {}) } };
  const g = contract.guardrails, def = contract.activation_definition;
  const events = validation.valid;
  const lastEvent = events.length ? events[events.length - 1].ts : null;
  const asOf = contract.analysis_as_of ? Date.parse(contract.analysis_as_of) : lastEvent;
  const enrolStart = contract.enrollment_start ? Date.parse(contract.enrollment_start) : -Infinity;
  const enrolEnd = contract.enrollment_end ? Date.parse(contract.enrollment_end) : Infinity;
  const all = buildAccounts(events, contract);
  const exclusions = [];
  const eligible = [];
  for (const a of all) {
    if (a.startTs == null) { exclusions.push({ account_id: a.id, reason: 'no evaluation_started' }); continue; }
    if (a.startTs < enrolStart || a.startTs > enrolEnd) { exclusions.push({ account_id: a.id, reason: 'evaluation started outside enrollment window' }); continue; }
    eligible.push(a);
  }
  // Intent-to-treat: every eligible account is analysed under its hash assignment, whatever was logged.
  const mature = eligible.filter(a => a.windowEnd <= asOf);
  const immature = eligible.filter(a => a.windowEnd > asOf);
  for (const a of immature) exclusions.push({ account_id: a.id, reason: `immature: ${def.window_days}-day window ends after analysis date` });
  const perVariant = {};
  for (const v of VARIANTS) {
    const pool = mature.filter(a => a.assigned === v);
    const x = pool.filter(a => a.activated).length, n = pool.length;
    const invited = pool.reduce((s, a) => s + a.invited, 0);
    const opted = pool.reduce((s, a) => s + a.optedOut, 0);
    perVariant[v] = {
      eligible: eligible.filter(a => a.assigned === v).length,
      n, activated: x, rate: rate(x, n), interval: wilson(x, n),
      plan_rate: rate(pool.filter(a => a.plan).length, n),
      invite_acceptance: rate(pool.reduce((s, a) => s + a.accepted, 0), invited),
      learners_invited: invited,
      opt_out_rate: rate(opted, invited),
      median_setup_hours: median(pool.map(a => a.setupHours)),
      median_hours_to_activation: median(pool.filter(a => a.activated).map(a => (a.activationTs - a.startTs) / 3600000)),
    };
  }
  const c = perVariant.control, t = perVariant.treatment;
  const effect = newcombeDiff(c.activated, c.n, t.activated, t.n);

  const totalRows = validation.totalRows || 0;
  const missingIds = validation.quarantined.filter(q => q.reason === 'missing_account_id').length;
  const crossOrMismatch = eligible.filter(a => a.crossVariant || a.mismatch).length;
  const srm = srmChiSquare(c.eligible, t.eligible);
  const checks = [];
  const add = (id, label, kind, pass, detail) => checks.push({ id, label, kind, pass, detail });
  const pct = v => (v == null ? 'n/a' : (v * 100).toFixed(1) + '%');
  add('contract_locked', 'Contract registered before outcomes were viewed', 'quality', opts.registeredBeforeOutcomes !== false, opts.registeredBeforeOutcomes === false ? 'The contract changed after outcomes were shown. Re-register and re-run on fresh data.' : 'Registered before outcomes.');
  add('data_present', 'Valid events present', 'quality', events.length > 0, `${events.length} valid of ${totalRows} rows.`);
  add('missing_ids', 'Missing account IDs within limit', 'quality', rate(missingIds, totalRows) == null ? true : rate(missingIds, totalRows) <= g.max_missing_account_id_rate, `${missingIds} of ${totalRows} rows (${pct(rate(missingIds, totalRows))}); limit ${pct(g.max_missing_account_id_rate)}.`);
  add('duplicates', 'Duplicate events within limit', 'quality', (rate(validation.duplicates.length, totalRows) ?? 0) <= g.max_duplicate_rate, `${validation.duplicates.length} duplicate rows removed (${pct(rate(validation.duplicates.length, totalRows))}); limit ${pct(g.max_duplicate_rate)}. Duplicates never count as conversions.`);
  add('assignment', 'Logged variant matches account assignment', 'quality', (rate(crossOrMismatch, eligible.length) ?? 0) <= g.max_assignment_mismatch_rate, `${crossOrMismatch} of ${eligible.length} eligible accounts logged a different or second variant (${pct(rate(crossOrMismatch, eligible.length))}); limit ${pct(g.max_assignment_mismatch_rate)}. Analysed by assignment (intent-to-treat).`);
  add('srm', 'No sample-ratio mismatch (50/50)', 'quality', srm <= g.srm_chi_square_threshold, `Eligible accounts ${c.eligible} control / ${t.eligible} treatment. Chi-square ${srm.toFixed(2)} vs threshold ${g.srm_chi_square_threshold}.`);
  add('maturity', 'Cohorts mature for the observation window', 'quality', (rate(immature.length, eligible.length) ?? 0) <= g.max_immature_share, `${immature.length} of ${eligible.length} eligible accounts have not finished their ${def.window_days}-day window (${pct(rate(immature.length, eligible.length))}); limit ${pct(g.max_immature_share)}.`);
  add('sample', 'Minimum sample per variant reached', 'quality', c.n >= contract.minimum_sample_per_variant && t.n >= contract.minimum_sample_per_variant, `Mature accounts ${c.n} control / ${t.n} treatment; pre-registered minimum ${contract.minimum_sample_per_variant} each.`);
  const optDiff = c.opt_out_rate != null && t.opt_out_rate != null ? (t.opt_out_rate - c.opt_out_rate) * 100 : null;
  add('guard_opt_out', 'Guardrail: learner opt-out not worse', 'guardrail', optDiff == null || optDiff <= g.max_opt_out_increase_pp, `Opt-out ${pct(c.opt_out_rate)} control vs ${pct(t.opt_out_rate)} treatment (${optDiff == null ? 'n/a' : optDiff.toFixed(1) + ' pp'}); limit +${g.max_opt_out_increase_pp} pp.`);
  const setupDiff = c.median_setup_hours != null && t.median_setup_hours != null ? t.median_setup_hours - c.median_setup_hours : null;
  add('guard_setup', 'Guardrail: setup time not worse', 'guardrail', setupDiff == null || setupDiff <= g.max_setup_time_increase_hours, `Median hours from evaluation start to first invite: ${fmtNum(c.median_setup_hours)} control vs ${fmtNum(t.median_setup_hours)} treatment; limit +${g.max_setup_time_increase_hours} h.`);

  const early = eligible.reduce((s, a) => s + a.earlyInvites, 0);
  add('early_invites', 'Note: learners invited before plan creation', 'note', true, `${early} learner invite(s) arrived before plan_created. Those learners still count only if they complete a lab after the plan exists.`);
  const failedQuality = checks.filter(k => k.kind === 'quality' && !k.pass);
  const failedGuard = checks.filter(k => k.kind === 'guardrail' && !k.pass);
  let decision, rationale;
  if (failedQuality.length) {
    decision = 'no_decision';
    rationale = `No decision. ${failedQuality.length} data-quality gate(s) failed: ${failedQuality.map(k => k.label.toLowerCase()).join('; ')}. The observed difference is shown for diagnosis only and is not evidence of an effect.`;
  } else if (failedGuard.length) {
    decision = 'iterate';
    rationale = `Iterate. Data quality passed, but guardrail(s) regressed: ${failedGuard.map(k => k.label.replace('Guardrail: ', '')).join('; ')}. Do not ship until the regression is understood.`;
  } else if (effect.lo > 0 && effect.diff * 100 >= contract.minimum_effect_pp) {
    decision = 'ship';
    rationale = `Ship to a wider pilot. The ${(contract.interval_level * 100).toFixed(0)}% interval for the difference is entirely above zero and the point estimate meets the pre-registered minimum effect of ${contract.minimum_effect_pp} pp. Synthetic data: this demonstrates the decision rule, not a real result.`;
  } else {
    decision = 'iterate';
    rationale = `Iterate. Quality gates pass, but the interval for the difference includes zero or the effect is below the ${contract.minimum_effect_pp} pp minimum. Treat this as inconclusive, not as proof of no effect.`;
  }
  return {
    contract, asOf, perVariant, effect, checks, decision, rationale, exclusions,
    counts: { totalRows, valid: events.length, quarantined: validation.quarantined.length, duplicates: validation.duplicates.length, accounts: all.length, eligible: eligible.length, mature: mature.length, immature: immature.length, outOfOrder: validation.outOfOrder || 0 },
    funnel: funnel(mature, def),
    accounts: all, eligible, mature,
  };
}
function fmtNum(v) { return v == null ? 'n/a' : v.toFixed(1); }

// ---------- Export ----------
export function buildDecisionExport(analysis, validation, meta = {}) {
  const { contract, perVariant, effect, checks, decision, rationale, counts, exclusions } = analysis;
  return {
    kind: 'team_activation_lab.experiment_decision',
    version: 1,
    synthetic_data: true,
    notice: 'Independent concept by Ayo Ahmed. Synthetic data only. Not an official TryHackMe tool. Figures are seeded examples, not production results.',
    generated_at: meta.generatedAt || new Date().toISOString(),
    scenario: meta.scenario || 'custom upload',
    recommendation: { decision, rationale },
    metric_contract: {
      hypothesis: contract.hypothesis,
      randomisation_unit: contract.unit,
      assignment: `mix32(fnv1a("${contract.assignment_seed}:" + account_id)) < 2^31 → control, otherwise treatment`,
      denominator: 'intent-to-treat: all eligible accounts with evaluation_started in the enrollment window and a mature observation window, analysed by assignment',
      primary_metric: 'activated_7d',
      activation_definition: { ...contract.activation_definition, text: `Admin creates a plan, and at least ${contract.activation_definition.min_distinct_learners} distinct invited learners complete a meaningful lab after the plan exists and within ${contract.activation_definition.window_days} days of evaluation_started.`, status: 'unvalidated product hypothesis, not a company KPI' },
      minimum_sample_per_variant: contract.minimum_sample_per_variant,
      minimum_effect_pp: contract.minimum_effect_pp,
      interval: 'Wilson score per variant; Newcombe hybrid score interval for the difference (95%)',
      enrollment_window: [contract.enrollment_start, contract.enrollment_end],
      analysis_as_of: analysis.asOf ? new Date(analysis.asOf).toISOString() : null,
      guardrails: contract.guardrails,
      registered_at: meta.registeredAt || null,
    },
    evidence: {
      per_variant: perVariant,
      difference_pp: effect.diff == null ? null : +(effect.diff * 100).toFixed(2),
      difference_interval_pp: effect.lo == null ? null : [+(effect.lo * 100).toFixed(2), +(effect.hi * 100).toFixed(2)],
      counts,
    },
    quality_checks: checks,
    quality_failures: checks.filter(k => !k.pass).map(k => k.id),
    exclusions_logged: exclusions.length,
    exclusions_sample: exclusions.slice(0, 50),
    quarantined_rows: (validation?.quarantined || []).slice(0, 50).map(q => ({ line: q.line, errors: q.errors })),
    duplicate_rows: (validation?.duplicates || []).slice(0, 50).map(q => ({ line: q.line, errors: q.errors })),
    limitations: [
      'All events are synthetic and seeded. No real accounts, learners or TryHackMe data.',
      'The activation definition is an unvalidated hypothesis; it must be checked against later retention and paid conversion before use.',
      'Quality gates catch obvious instrumentation and randomisation faults, not subtle bias.',
      'Lab completion is not evidence of security readiness.',
      'A production experiment needs an analytics owner, a robust assignment service, consent and privacy review and an audit trail.',
    ],
  };
}

export const INSTRUMENTATION_SPEC = {
  kind: 'team_activation_lab.instrumentation_spec',
  version: 1,
  fields: [
    { name: 'event_id', type: 'string', required: true, rule: 'globally unique; repeated IDs are dropped as duplicates' },
    { name: 'account_id', type: 'string', required: true, rule: 'randomisation unit; rows without it are quarantined' },
    { name: 'learner_id', type: 'string|null', required: 'for learner events', rule: 'pseudonymous ID, never an email or name' },
    { name: 'event_type', type: 'enum', required: true, values: EVENT_TYPES },
    { name: 'occurred_at', type: 'ISO-8601 UTC', required: true, rule: 'must end in Z; analysis re-sorts by this field' },
    { name: 'variant', type: 'enum', required: true, values: VARIANTS, rule: 'must equal the account hash assignment; mismatches are flagged and analysed by assignment' },
    { name: 'goal_id', type: 'string', required: false },
    { name: 'plan_id', type: 'string', required: false },
    { name: 'lab_id', type: 'string', required: 'for meaningful_lab_completed' },
    { name: 'assignment_seed', type: 'string', required: false, rule: 'seed that produced the assignment, for audit' },
  ],
  dedupe: 'drop repeated event_id; also drop identical (account_id, learner_id, event_type, lab_id, occurred_at)',
  ordering: 'sort by occurred_at; out-of-order arrival is counted and reported, not an error',
  eligibility: 'account has evaluation_started inside the enrollment window; mature when evaluation_started + 7 days ≤ analysis_as_of',
};
