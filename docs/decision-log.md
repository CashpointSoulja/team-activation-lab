# Decision log (ADRs)

**ADR-001 Static app on a Cloudflare Worker, no backend state.** Free tier, no database, no personal data held. The Worker only serves assets and adds security headers. Trade-off: no shared experiment registry (V2).

**ADR-002 Account-level hash assignment.** `mix32(fnv1a(seed:account_id))`, top-bit split. Deterministic, stable across sessions, auditable from the CSV. An early version used `fnv1a % 2`; a unit test showed the low bit of FNV-1a ignores the seed (parity is fixed by byte parity), so changing the seed changed nothing. Fixed with a Murmur3 finaliser.

**ADR-003 Activation is a sequence.** A completion counts only if the learner was invited, the plan already existed and it happened within 7 days of `evaluation_started`. Two completions by one learner count once.

**ADR-004 Add `learner_opted_out`.** Needed to measure the opt-out guardrail the PRD names.

**ADR-005 Transparent intervals, no p-values.** Wilson per arm, Newcombe hybrid for the difference. Unit test reproduces Newcombe's published worked example. Learner-level tests would overstate precision because learners cluster in accounts.

**ADR-006 Two kinds of "not ship".** Data-quality failure → `no_decision` (we can't tell). Guardrail regression on clean data → `iterate` (we can tell, and something got worse).

**ADR-007 Pre-registration enforced in UI.** Outcomes are hidden until the contract is registered. Amending afterwards is allowed but voids the decision.

**ADR-008 Mismatched variants analysed by assignment.** Keeps the ITT denominator intact, and the mismatch rate becomes a quality gate rather than a silent exclusion.

**ADR-009 Manager preview always shows treatment.** So the evaluator can try the new journey. The preview shows what the account's hash *would* assign, to be clear about this.

**ADR-010 Brand mirror with independence label.** Official logo and tokens from the public site, plus a persistent "Independent concept · synthetic data · not an official TryHackMe tool" tag and footer. No dashboard components are reproduced.

**ADR-011 Self-hosted fonts.** Source Sans 3 (OFL) and Ubuntu (UFL) served from `/fonts` so there are no third-party requests; CSP is `default-src 'self'`.

**ADR-012 Synthetic scenarios are generated, not hand-typed.** `scripts/generate-scenarios.mjs` is seeded and deterministic. Scenario A's sample size was raised from 260 to 300 accounts with a larger planted effect after the assignment fix reshuffled groups. This is stated because the effect is a generator parameter, not a finding.
