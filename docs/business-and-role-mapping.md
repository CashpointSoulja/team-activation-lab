# Business and role mapping

Quotes are from the public job description (captured 6 Oct 2026, see [source-ledger.md](source-ledger.md)). The right-hand column is what this concept demonstrates. Nothing here claims TryHackMe has the problem this concept tests.

| Role responsibility (quoted) | Where it shows up in the concept |
|---|---|
| "helping shape the future of how organisations discover, evaluate and adopt TryHackMe" | The whole loop starts at `evaluation_started` and ends at a first-value state for a team, not a single learner |
| "improve activation and conversion" | Primary metric `activated_7d`, account-level; paid conversion is listed as the *validation* outcome, not inferred |
| "Collaborate with Sales and Customer Success to build product capabilities that remove friction from the buying journey" | Stalled-account inspector suggests a CS/Sales handoff per stall step (illustrative, nothing sent) |
| "Develop features and internal tooling that help commercial teams scale" | Growth view is internal tooling: funnel, account timeline, assignment check, decision export |
| "Design, prioritise and execute high-impact experiments, measuring outcomes and sharing learnings" | Registered contract → seeded analysis → quality gates → exportable decision JSON |
| "Define success metrics, analyse experiment performance" | [metrics-and-guardrails.md](metrics-and-guardrails.md), [experiment-contract.md](experiment-contract.md) |
| "using quantitative data, customer research, sales feedback" | Qualitative card shows **0 interviews** honestly and the planned questions ([discovery-plan.md](discovery-plan.md)) |
| "learning from failures" | Scenario B: the treatment *looks* better and the lab still refuses to call it |
| "Familiarity with SQL or product analytics beyond standard dashboarding" | Account-level ITT, nesting, SRM, maturity, dedupe rules in [instrumentation-qa.md](instrumentation-qa.md) |

## What the concept deliberately does not touch

The public management dashboard already covers assignments, progress, seat usage and reporting. This concept does not rebuild any of that (no skills matrix, radar chart or assignment tables). It sits *before* that dashboard: the moment between "we signed up" and "two people did something useful".

## Company context (evidence, not diagnosis)

Ben Spring's public post describes growth squads by funnel stage, with activation as "our first and longest standing squad", hundreds of experiments, and "Sign ups are a vanity metric". That supports the *style* of this concept (measure activation, not signups). It is about the consumer-scale funnel and is **not** evidence of a specific B2B onboarding defect.
