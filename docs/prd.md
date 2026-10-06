# Supplied PRD (verbatim)

> Included unchanged as supplied. Refinements made during the build are listed at the bottom and each points to an ADR in [decision-log.md](decision-log.md).

---

# TryHackMe Team Activation Lab
6 October 2026 | Independent concept by Ayo Ahmed | Synthetic data only

## Business and role
TryHackMe sells hands-on cyber training. Its public business product provides learning assignments, seat usage, skills and progress reporting. The B2B Product Manager (Growth) role owns acquisition through expansion and retention, validates ideas with customer insight and data, and builds commercial tooling. This concept does not duplicate the existing management dashboard. It connects a buyer's intended team outcome to a measurable first-value journey and an experiment decision.

## Evidence versus hypothesis
Verified: official role asks for self-serve conversion, onboarding, commercial enablement and experiments; public product can assign paths and report engagement; Ben Spring describes squad-owned analysis and experiments.
Hypotheses: some managers cannot translate their buying intent into a first team win; a goal-led proof plan might improve seven-day activation; two first lab completions might be a useful early account signal. No interviews or TryHackMe internal analytics support these hypotheses yet.

## Users / jobs to be done
- Security manager: when evaluating training, get a concrete proof plan for my team's goal so I can judge value before a broader rollout.
- Growth PM: when an account stalls, distinguish journey friction from bad instrumentation and decide what to test next.
- Sales/CS: when helping an evaluation, see the agreed goal, invited cohort and observed progress without replacing the training manager's dashboard.

## Outcome and scope
One complete loop: synthetic CSV -> validated account funnel -> stalled account -> functional goal-led manager preview -> registered account-level experiment -> seeded analysis and quality gates -> decision export.
Non-goals: training delivery, cyber readiness claims, real invite sends, live enterprise API, pricing changes, personal-data ingestion, a general BI platform, AI diagnosis or real revenue uplift claims.

## Acceptance criteria
1. CSV import accepts documented schema, gives row-specific errors, quarantines bad rows and preserves valid rows. Reset and sample scenario are available.
2. Funnel displays eligible accounts, invited/accepted learners and completed meaningful first labs, with explicit windows and denominators. No divide-by-zero.
3. Manager chooses goal and cohort, previews a seven-day synthetic plan and creates local simulated invites. There are no outgoing emails.
4. Experiment registration captures hypothesis, account-level randomisation seed, intent-to-treat denominator, primary metric, minimum sample, maturity window and guardrails before showing outcomes.
5. Same account never enters both variants. Duplicate events do not inflate conversions. Learners within one account are not treated as independent randomisation units.
6. Primary activation hypothesis: plan created and two distinct invited learners complete a meaningful lab within seven days. Definition is labelled unvalidated and visible.
7. Analysis shows per-variant n/rate, absolute percentage-point difference and uncertainty. Sample-ratio mismatch, immature cohorts, inadequate sample, missing IDs or guardrail regression produce no-decision. Seeded figures are labelled synthetic, not production results.
8. Export includes evidence, quality failures, metric contract, recommendation and limitations. User can inspect and reset local state.

## Event/data contract
Fields: event_id, account_id, learner_id (nullable for admin events), event_type, occurred_at UTC, variant, goal_id, plan_id, lab_id, assignment_seed. Events: evaluation_started, goal_selected, plan_created, learner_invited, invite_accepted, lab_started, meaningful_lab_completed, decision_exported. Reject unknown types, invalid timestamps, absent account IDs and inconsistent variants. Document ordering, duplicate keys and eligibility rules. No invented real course content.

## Measurement
North-star candidate: fraction of eligible evaluated accounts reaching the defined first-value state in seven days. Diagnostics: admin plan rate, invite acceptance, time to first completion and stalled step. Guardrails: opt-out rate in synthetic dataset, excessive setup steps, missing tracking, randomisation integrity and time-window maturity. Retention/paid conversion are future validation outcomes, not inferred from lab completion. Pre-register before analysis; do not stop an experiment just because a seeded example looks good.

## Discovery and 5 Whys hypothesis
Symptom hypothesis: evaluation does not become team engagement. Why: invite cohort never gets a clear next step. Why: manager starts with broad catalogue rather than goal. Why: purchase/evaluation flow and training plan are separate. Why: initial value is described but not operationalised. Why: buyer and learner jobs differ. This chain is a research hypothesis, not a diagnosis of TryHackMe. Interview managers who activated and stalled; review event completeness; test goal-led plan against control. First falsifier: users already get a clear plan and the stall is procurement, not activation.

## Opportunities / prioritisation
Prioritise first-value clarity over monetisation upsell because it is bounded, testable and maps to the role. Alternatives: landing-page conversion, enterprise procurement checklist and expansion nudges. Their reach/impact figures are unknown. Do not fabricate RICE numbers. Build a narrow activation test first; change direction if discovery identifies procurement or seat economics as the actual bottleneck.

## Risks / rollout
Public logo must coexist with independent concept label. No private learning content or live user data. Browser state is not shared, authenticated or durable. Statistical quality gates can miss subtle bias: a production rollout needs analytics owner review, robust assignment, consent/privacy review and audit trail. Shadow instrumentation, validate assignment/events, pilot with explicit consent, then controlled experiment; rollback UI and assignments if quality or guardrails fail.

## Tests and results
Test malformed/duplicate/out-of-order events, missing IDs, inconsistent variants, early invitation, small sample, immature cohort, sample-ratio mismatch, zero denominator, guardrail failure, export/reset, mobile and keyboard. Results are pending implementation. Record actual commands and manual outcomes; no checklist masquerading as test success.

## Viability / roadmap
The concept would be useful only if buyer-to-team activation is a real source of loss and this signal predicts later retention or conversion. Validate that relationship before growth claims. V2: CRM/analytics contracts, shared experiment registration, longitudinal paid-conversion analysis, approved CS handoff. No live connectors promised in v1.

## Sources
- Official JD: https://careers.tryhackme.com/jobs/8198028-b2b-product-manager-growth
- Business: https://tryhackme.com/business
- Existing management dashboard: https://tryhackme.com/business/solutions/management-dashboard
- Enterprise API: https://help.tryhackme.com/en/articles/6498330-enterprise-api
- Founder growth principles: https://benspring.com/p/10-product-growth-lessons-from-4m
- Official founder profile: https://careers.tryhackme.com/people/3224146-ben-spring

---

## Documented refinements (not edits to the text above)

| # | Refinement | Why | ADR |
|---|---|---|---|
| R1 | Added `learner_opted_out` event type | The opt-out guardrail needs an event to measure it; the PRD lists the guardrail but not the event | ADR-004 |
| R2 | "Meaningful lab completed" must happen **after** `plan_created` and inside 7 days of `evaluation_started` | Makes "plan created + two completions" a sequence, not two independent facts | ADR-003 |
| R3 | Statistics: Wilson interval per arm, Newcombe hybrid interval for the difference, no p-values | "Transparent statistics suitable for binary account outcomes" | ADR-005 |
| R4 | Data-quality gate failure → `no_decision`; guardrail regression with clean data → `iterate` | Separates "we can't tell" from "we can tell, and it hurt something" | ADR-006 |
| R5 | Amending the contract after outcomes are shown voids the decision | Enforces pre-registration in the UI, not just in prose | ADR-007 |
| R6 | Enterprise API source link updated: the PRD URL now returns 404; current article is linked in the source ledger | Source hygiene | [source-ledger.md](source-ledger.md) |
