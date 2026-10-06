import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as E from '../public/js/engine.js';
import { SCENARIOS } from '../public/js/scenarios.js';

const H = 'event_id,account_id,learner_id,event_type,occurred_at,variant,goal_id,plan_id,lab_id,assignment_seed';
const SEED = 'tal-2026-10';
const v = id => E.assignVariant(id, SEED);
const load = f => readFileSync(new URL(`../public/data/${f}`, import.meta.url), 'utf8');
// Builds one account's events. Times are hours after 2026-09-01T00:00Z.
function account(id, { plan = 1, invites = [], accepts = [], starts = [], completes = [], variant, extra = [] } = {}) {
  const t = h => new Date(Date.parse('2026-09-01T00:00:00Z') + h * 3600000).toISOString().replace('.000Z', 'Z');
  const va = variant || v(id); const rows = []; let k = 0;
  const r = (type, h, learner = '', lab = '') => rows.push(`${id}-${++k},${id},${learner},${type},${t(h)},${va},,,${lab},${SEED}`);
  r('evaluation_started', 0);
  if (plan != null) r('plan_created', plan);
  invites.forEach(([l, h]) => r('learner_invited', h, l));
  accepts.forEach(([l, h]) => r('invite_accepted', h, l));
  starts.forEach(([l, h]) => r('lab_started', h, l, 'lab-1'));
  completes.forEach(([l, h]) => r('meaningful_lab_completed', h, l, 'lab-1'));
  extra.forEach(x => rows.push(x));
  return rows;
}
const activeAccount = id => account(id, { invites: [['l1', 2], ['l2', 2]], accepts: [['l1', 3], ['l2', 3]], starts: [['l1', 4], ['l2', 4]], completes: [['l1', 10], ['l2', 20]] });

test('happy path: scenario A ships with quality gates passing', () => {
  const s = SCENARIOS[0]; const val = E.validateEvents(load(s.file)); const a = E.analyse(val, s.contract);
  assert.equal(a.decision, 'ship');
  assert.ok(a.checks.filter(c => c.kind !== 'note').every(c => c.pass));
  assert.equal(a.perVariant.control.n + a.perVariant.treatment.n, a.counts.mature);
  assert.ok(a.effect.lo > 0);
});

test('scenario B (duplicates, unbalanced randomisation, short window) returns no_decision', () => {
  const s = SCENARIOS[1]; const a = E.analyse(E.validateEvents(load(s.file)), s.contract);
  assert.equal(a.decision, 'no_decision');
  const failed = a.checks.filter(c => !c.pass).map(c => c.id);
  for (const id of ['duplicates', 'assignment', 'srm', 'maturity', 'sample']) assert.ok(failed.includes(id), `expected ${id} to fail, got ${failed}`);
  assert.ok(a.effect.diff > 0, 'treatment looks better, which is exactly why the refusal matters');
});

test('malformed rows are quarantined with row-specific errors; valid rows kept', () => {
  const csv = [H, 'x1,acc-1,,evaluation_started,2026-09-01T00:00:00Z,control,,,,s', 'x2,,,evaluation_started,2026-09-01T00:00:00Z,control,,,,s', 'x3,acc-2,,teleport,2026-09-01T00:00:00Z,control,,,,s', 'x4,acc-3,,evaluation_started,01/09/2026,control,,,,s', 'x5,acc-4,,lab_started,2026-09-01T00:00:00Z,control,,,lab,s', 'x6,acc-5,,evaluation_started,2026-09-01T00:00:00Z,blue,,,,s', 'x7,acc-6,only,three'].join('\n');
  const r = E.validateEvents(csv);
  assert.equal(r.valid.length, 1);
  assert.equal(r.quarantined.length, 6);
  const byLine = Object.fromEntries(r.quarantined.map(q => [q.line, q.errors.join('; ')]));
  assert.match(byLine[3], /account_id is missing/);
  assert.match(byLine[4], /unknown event_type "teleport"/);
  assert.match(byLine[5], /not an ISO-8601 UTC/);
  assert.match(byLine[6], /learner_id is required/);
  assert.match(byLine[7], /variant "blue"/);
  assert.match(byLine[8], /expected 10 fields/);
  assert.equal(r.quarantined.find(q => q.line === 3).reason, 'missing_account_id');
});

test('missing header column is a file-level error', () => {
  assert.match(E.validateEvents('event_id,account_id\n1,2').headerError, /Missing required column/);
  assert.match(E.validateEvents('').headerError, /empty/);
});

test('duplicate events never inflate conversions', () => {
  const rows = account('dup-acct', { invites: [['l1', 2]], completes: [['l1', 10]] });
  const completion = rows.find(r => r.includes('meaningful_lab_completed'));
  const csv = [H, ...rows, completion, completion.replace(/^[^,]+/, 'other-id')].join('\n');
  const r = E.validateEvents(csv);
  assert.equal(r.duplicates.length, 2);
  const [acct] = E.buildAccounts(r.valid, E.DEFAULT_CONTRACT);
  assert.equal(acct.completed, 1);
  assert.equal(acct.activated, false, 'one learner completing three times is still one learner');
});

test('activation needs two distinct invited learners after plan creation, within 7 days', () => {
  const ok = E.buildAccounts(E.validateEvents([H, ...activeAccount('act-1')].join('\n')).valid)[0];
  assert.equal(ok.activated, true);
  const late = E.buildAccounts(E.validateEvents([H, ...account('late', { invites: [['l1', 2], ['l2', 2]], completes: [['l1', 10], ['l2', 24 * 7 + 1]] })].join('\n')).valid)[0];
  assert.equal(late.activated, false);
  const noPlan = E.buildAccounts(E.validateEvents([H, ...account('np', { plan: null, invites: [['l1', 2], ['l2', 2]], completes: [['l1', 10], ['l2', 11]] })].join('\n')).valid)[0];
  assert.equal(noPlan.activated, false);
  const uninvited = E.buildAccounts(E.validateEvents([H, ...account('ui', { invites: [['l1', 2]], completes: [['l1', 10], ['l9', 11]] })].join('\n')).valid)[0];
  assert.equal(uninvited.activated, false);
  assert.ok(uninvited.flags.some(f => /no invite event/.test(f)));
});

test('users invited before plan creation are flagged and only count after the plan exists', () => {
  const rows = account('early', { plan: 5, invites: [['l1', 1], ['l2', 6]], completes: [['l1', 3], ['l2', 9]] });
  const a = E.buildAccounts(E.validateEvents([H, ...rows].join('\n')).valid)[0];
  assert.equal(a.earlyInvites, 1);
  assert.equal(a.completed, 1, 'l1 completed before the plan existed');
  assert.equal(a.activated, false);
});

test('out-of-order timestamps are re-sorted and reported', () => {
  const rows = activeAccount('ooo'); const shuffled = [rows[5], rows[0], rows[8], rows[1], ...rows.slice(2, 5), rows[6], rows[7], rows[9]];
  const r = E.validateEvents([H, ...shuffled].join('\n'));
  assert.ok(r.outOfOrder > 0);
  assert.ok(r.warnings.some(w => /out of time order/.test(w)));
  assert.equal(E.buildAccounts(r.valid)[0].activated, true);
});

test('assignment is deterministic, stable across calls and never puts an account in both variants', () => {
  const ids = Array.from({ length: 2000 }, (_, i) => `acct-${i}`);
  const first = ids.map(i => E.assignVariant(i, SEED));
  assert.deepEqual(ids.map(i => E.assignVariant(i, SEED)), first);
  const share = first.filter(x => x === 'treatment').length / ids.length;
  assert.ok(share > 0.46 && share < 0.54, `share ${share}`);
  assert.notDeepEqual(ids.map(i => E.assignVariant(i, 'other-seed')), first);
});

test('cross-variant account is flagged and analysed by assignment (intent-to-treat)', () => {
  const id = 'xv-acct'; const other = v(id) === 'control' ? 'treatment' : 'control';
  const rows = activeAccount(id); rows.push(`${id}-z,${id},l3,learner_invited,2026-09-01T05:00:00Z,${other},,,,${SEED}`);
  const a = E.buildAccounts(E.validateEvents([H, ...rows].join('\n')).valid)[0];
  assert.equal(a.crossVariant, true);
  assert.equal(a.assigned, v(id));
  const an = E.analyse(E.validateEvents([H, ...rows].join('\n')), { analysis_as_of: '2026-10-01T00:00:00Z', minimum_sample_per_variant: 1 });
  assert.equal(an.checks.find(c => c.id === 'assignment').pass, false);
  assert.equal(an.decision, 'no_decision');
});

test('learners are nested in accounts: one account with many learners is n=1', () => {
  const learners = Array.from({ length: 30 }, (_, i) => `l${i}`);
  const rows = account('big', { invites: learners.map(l => [l, 2]), completes: learners.map(l => [l, 10]) });
  const an = E.analyse(E.validateEvents([H, ...rows].join('\n')), { analysis_as_of: '2026-10-01T00:00:00Z' });
  const pv = an.perVariant[v('big')];
  assert.equal(pv.n, 1); assert.equal(pv.activated, 1);
});

test('zero denominators do not divide by zero', () => {
  const an = E.analyse(E.validateEvents(H), {});
  assert.equal(an.perVariant.control.rate, null);
  assert.equal(an.effect.diff, null);
  assert.equal(an.decision, 'no_decision');
  const f = E.funnel([]);
  assert.ok(f.control.every(s => s.rate === null && s.denominator === 0));
  assert.deepEqual(E.wilson(0, 0), [null, null]);
});

test('small sample returns no_decision even with a large observed gap', () => {
  const rows = []; for (let i = 0; i < 12; i++) { const id = `s-${i}`; rows.push(...(v(id) === 'treatment' ? activeAccount(id) : account(id))); }
  const an = E.analyse(E.validateEvents([H, ...rows].join('\n')), { analysis_as_of: '2026-10-01T00:00:00Z' });
  assert.equal(an.checks.find(c => c.id === 'sample').pass, false);
  assert.equal(an.decision, 'no_decision');
});

test('immature seven-day cohorts are excluded and logged', () => {
  const rows = activeAccount('imm');
  const an = E.analyse(E.validateEvents([H, ...rows].join('\n')), { analysis_as_of: '2026-09-04T00:00:00Z', minimum_sample_per_variant: 0 });
  assert.equal(an.counts.immature, 1); assert.equal(an.counts.mature, 0);
  assert.ok(an.exclusions.some(x => /immature/.test(x.reason)));
  assert.equal(an.checks.find(c => c.id === 'maturity').pass, false);
});

test('sample-ratio mismatch is detected', () => {
  assert.ok(E.srmChiSquare(50, 50) === 0);
  assert.ok(E.srmChiSquare(40, 80) > 6.635);
  assert.ok(E.srmChiSquare(95, 105) < 6.635);
});

test('guardrail regression yields iterate, not ship', () => {
  const s = SCENARIOS[0]; const val = E.validateEvents(load(s.file));
  const an = E.analyse(val, { ...s.contract, guardrails: { max_opt_out_increase_pp: -5 } });
  assert.equal(an.checks.find(c => c.id === 'guard_opt_out').pass, false);
  assert.equal(an.decision, 'iterate');
});

test('changing the contract after viewing outcomes forces no_decision', () => {
  const s = SCENARIOS[0]; const an = E.analyse(E.validateEvents(load(s.file)), s.contract, { registeredBeforeOutcomes: false });
  assert.equal(an.decision, 'no_decision');
});

test('statistics: Wilson and Newcombe match published reference values', () => {
  // Newcombe (1998) Table II example: 56/70 vs 48/80 → difference 0.2, 95% CI 0.0524 to 0.3339.
  const r = E.newcombeDiff(48, 80, 56, 70);
  assert.ok(Math.abs(r.diff - 0.2) < 1e-9);
  assert.ok(Math.abs(r.lo - 0.0524) < 5e-4, `lo ${r.lo}`);
  assert.ok(Math.abs(r.hi - 0.3339) < 5e-4, `hi ${r.hi}`);
  const [l, u] = E.wilson(81, 263); assert.ok(Math.abs(l - 0.2553) < 5e-4 && Math.abs(u - 0.3662) < 5e-4);
});

test('export contains evidence, failures, contract, recommendation and limitations', () => {
  const s = SCENARIOS[1]; const val = E.validateEvents(load(s.file)); const an = E.analyse(val, s.contract);
  const x = E.buildDecisionExport(an, val, { scenario: s.id, generatedAt: '2026-10-06T00:00:00Z', registeredAt: '2026-10-05T23:00:00Z' });
  assert.equal(x.synthetic_data, true);
  assert.equal(x.recommendation.decision, 'no_decision');
  assert.ok(x.quality_failures.includes('srm'));
  assert.equal(x.metric_contract.activation_definition.status, 'unvalidated product hypothesis, not a company KPI');
  assert.ok(x.limitations.length >= 4);
  assert.ok(Array.isArray(x.evidence.difference_interval_pp));
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(x)));
});

test('CSV round-trip preserves quoted fields', () => {
  const ev = [{ event_id: '1', account_id: 'a,b', learner_id: 'say "hi"', event_type: 'evaluation_started', occurred_at: '2026-09-01T00:00:00Z', variant: 'control' }];
  const back = E.parseCSV(E.toCSV(ev));
  assert.equal(back[1].cells[1], 'a,b'); assert.equal(back[1].cells[2], 'say "hi"');
});
