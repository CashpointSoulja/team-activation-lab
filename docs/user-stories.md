# User stories and acceptance criteria

Each criterion is tagged with the automated test (T#, in `test/engine.test.mjs`) or browser check (E#, in `test/e2e/`) that exercises it. Results are in [test-strategy-and-results.md](test-strategy-and-results.md).

## Manager (treatment preview)
**US1** As an evaluating security manager, I pick one goal so the trial has a purpose.
- Four illustrative goals; one selectable; locked once a plan exists. (E1)

**US2** I see a seven-day proof plan for that goal and create it.
- Plan shows Day 1–7; labs are labelled illustrative; `plan_created` is logged locally. (E1)

**US3** I invite at least two people and see whether they reach a first useful lab.
- Invites are **simulated**: local records only; no network call is made (CSP `connect-src 'self'`, no send code exists). (E1)
- Per-learner simulated accept → start → complete; opt-out available.
- First-value checklist shows each criterion met/unmet. (E1)
- Invites before the plan exist are flagged. (T7)

## Growth PM
**US4** I load a scenario or upload a CSV and see which rows were rejected and why. (T3, T4, E2)
**US5** I see the account funnel with explicit denominator and window, no divide-by-zero. (T12, E2)
**US6** I inspect one stalled account end to end, including its timeline and flags. (E2)
**US7** I register the contract before outcomes are shown; amending it afterwards voids the decision. (T17, E2)
**US8** I check any account's stable variant assignment. (T9, T10)
**US9** I see per-variant n, rate, 95% interval, the pp difference and its interval. (T1, T18)
**US10** I see quality gates and guardrails and get ship / iterate / no decision. (T1, T2, T13–T16)
**US11** I export the decision JSON and the instrumentation spec. (T19, E2)

## Everyone
**US12** I can reset and export local state and I'm told it's only in this browser. (E2, manual M5)
