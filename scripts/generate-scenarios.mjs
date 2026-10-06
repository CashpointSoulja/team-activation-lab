// Deterministically generates the synthetic scenario CSVs in public/data/. Re-run: npm run generate
import { writeFileSync } from 'node:fs';
import { assignVariant, toCSV, DEFAULT_CONTRACT } from '../public/js/engine.js';
import { SCENARIOS } from '../public/js/scenarios.js';

function prng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const H = 3600000, D = 24 * H;
const iso = t => new Date(Math.round(t / 60000) * 60000).toISOString().replace('.000Z', 'Z');
const GOALS = ['goal-soc-onboarding', 'goal-incident-response', 'goal-cloud-foundations', 'goal-web-app-testing'];

function genAccounts({ n, prefix, start, end, seed, rand, p, loggedVariant }) {
  const events = []; let k = 0;
  const push = (e) => events.push({ event_id: `${prefix}-e${String(++k).padStart(5, '0')}`, learner_id: '', goal_id: '', plan_id: '', lab_id: '', assignment_seed: seed, ...e });
  for (let i = 1; i <= n; i++) {
    const account_id = `${prefix}-acct-${String(i).padStart(3, '0')}`;
    const assigned = assignVariant(account_id, seed);
    const variant = loggedVariant ? loggedVariant(account_id, assigned, rand) : assigned;
    const q = p[assigned];
    const t0 = start + rand() * (end - start);
    push({ account_id, event_type: 'evaluation_started', occurred_at: iso(t0), variant });
    const goal = GOALS[Math.floor(rand() * GOALS.length)];
    let planT = null;
    if (assigned === 'treatment') {
      push({ account_id, event_type: 'goal_selected', occurred_at: iso(t0 + (0.1 + rand()) * H), variant, goal_id: goal });
      if (rand() < q.plan) { planT = t0 + (0.5 + rand() * 6) * H; push({ account_id, event_type: 'plan_created', occurred_at: iso(planT), variant, goal_id: goal, plan_id: `${account_id}-proof-7d` }); }
    } else if (rand() < q.plan) { planT = t0 + (2 + rand() * 30) * H; push({ account_id, event_type: 'plan_created', occurred_at: iso(planT), variant, plan_id: `${account_id}-generic` }); }
    if (planT == null && rand() > 0.3) continue;
    const learners = 2 + Math.floor(rand() * 4);
    const engaged = rand() < q.engaged; // account-level clustering: learners in one account move together
    for (let j = 1; j <= learners; j++) {
      const learner_id = `${account_id}-l${j}`;
      const early = planT != null && rand() < q.early;
      const invT = planT != null ? (early ? planT - (0.5 + rand() * 3) * H : planT + (0.2 + rand() * 20) * H) : t0 + (1 + rand() * 48) * H;
      push({ account_id, learner_id, event_type: 'learner_invited', occurred_at: iso(invT), variant });
      if (rand() < q.optOut) { push({ account_id, learner_id, event_type: 'learner_opted_out', occurred_at: iso(invT + (1 + rand() * 24) * H), variant }); continue; }
      if (rand() > (engaged ? 0.9 : 0.45)) continue;
      const accT = invT + (0.5 + rand() * 40) * H; push({ account_id, learner_id, event_type: 'invite_accepted', occurred_at: iso(accT), variant });
      if (rand() > (engaged ? 0.85 : 0.4)) continue;
      const stT = accT + (0.2 + rand() * 36) * H; const lab = `lab-synthetic-${1 + Math.floor(rand() * 6)}`;
      push({ account_id, learner_id, event_type: 'lab_started', occurred_at: iso(stT), variant, lab_id: lab });
      if (rand() > (engaged ? 0.8 : 0.35)) continue;
      push({ account_id, learner_id, event_type: 'meaningful_lab_completed', occurred_at: iso(stT + (0.5 + rand() * 72) * H), variant, lab_id: lab });
    }
  }
  return events;
}

function build(sc, rand) {
  const s = sc.generator;
  let events = genAccounts({ ...s, start: Date.parse(sc.contract.enrollment_start), end: Date.parse(sc.contract.enrollment_end), seed: sc.contract.assignment_seed, rand,
    loggedVariant: s.biasedLogging ? (id, a, r) => (r() < s.biasedLogging ? 'treatment' : a) : null });
  // Drop accounts the "broken" pipeline lost for control, creating sample-ratio mismatch.
  if (s.dropControlShare) { const lost = new Set(); events = events.filter(e => { if (assignVariant(e.account_id, sc.contract.assignment_seed) === 'control' && (lost.has(e.account_id) || (e.event_type === 'evaluation_started' && rand() < s.dropControlShare && lost.add(e.account_id)))) return false; return true; }); }
  events = events.filter(e => Date.parse(e.occurred_at) <= Date.parse(sc.contract.analysis_as_of));
  const dups = Math.round(events.length * (s.duplicateShare || 0));
  for (let i = 0; i < dups; i++) { const e = events[Math.floor(rand() * events.length)]; events.push({ ...e }); }
  for (let i = 0; i < (s.contentDuplicates || 0); i++) { const e = events.find(x => x.event_type === 'meaningful_lab_completed' && rand() < 0.2) || events[0]; events.push({ ...e, event_id: e.event_id + '-retry' }); }
  events.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
  for (let i = 0; i < (s.outOfOrder || 0); i++) { const a = Math.floor(rand() * events.length), b = Math.floor(rand() * events.length); [events[a], events[b]] = [events[b], events[a]]; }
  let csv = toCSV(events);
  for (const line of s.badRows || []) csv += line + '\n';
  return { csv, events };
}

for (const sc of SCENARIOS) {
  const rand = prng(sc.generator.rngSeed);
  const { csv, events } = build(sc, rand);
  writeFileSync(new URL(`../public/data/${sc.file}`, import.meta.url), csv);
  console.log(`${sc.file}: ${events.length} generated events + ${(sc.generator.badRows || []).length} malformed rows`);
}
void DEFAULT_CONTRACT;
