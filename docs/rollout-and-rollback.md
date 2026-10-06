# Rollout and rollback plan

| Stage | Exit criteria | Rollback trigger |
|---|---|---|
| 0. Discovery | Interview evidence supports Opportunity A ([discovery-plan.md](discovery-plan.md)) | Falsifier holds → stop |
| 1. Shadow instrumentation | QA checklist passes for 1 week ([instrumentation-qa.md](instrumentation-qa.md)) | Any gate fails → fix tracking |
| 2. Consent pilot (handful of accounts, CS-assisted) | Admins complete the flow; no support spikes | Opt-out or complaints up → pause |
| 3. Registered A/B, 50/50 by account | Pre-registered sample and maturity reached | Guardrail breach or SRM → stop and investigate |
| 4. Decision | Ship / iterate / no decision per contract | — |
| 5. Wider rollout behind a flag | Retention/conversion follow-up planned | Later outcomes regress → revert |

**Rollback mechanics:** feature flag returns everyone to control; the assignment seed is retired, not reused; partial data is kept and labelled, never re-analysed as if complete.
