# Experiment registration and analysis contract

Registered in the UI (Step 3) **before** outcomes are shown. Amending after outcomes appear sets `registeredBeforeOutcomes = false` and forces `no_decision`.

| Field | Value (default) |
|---|---|
| Hypothesis | Showing a goal-led seven-day proof plan (treatment) instead of the generic signup journey (control) increases the share of evaluating accounts that reach the first-value state within seven days. |
| Unit | Account. Learners are nested in accounts; one account is one trial whatever its size. |
| Assignment | Deterministic hash of `seed:account_id`, seed `tal-2026-10`, 50/50. Stable across sessions and devices. |
| Denominator | Intent-to-treat: every eligible, mature account in the variant its hash assigns, whatever it logged or did. |
| Primary metric | `activated_7d` = plan created **and** ≥ 2 distinct invited learners complete a meaningful lab after the plan and within 7 days of `evaluation_started`. **Unvalidated product hypothesis, not a company KPI.** |
| Diagnostics | goal rate, plan rate, invite acceptance, ≥2 started, stall step, median setup hours |
| Observation window | 7 days per account; analysis as-of date set per scenario |
| Minimum sample | 100 mature accounts per variant |
| Minimum effect worth shipping | 5 pp |
| Interval | 95% Wilson per arm; 95% Newcombe hybrid score interval for the difference |
| Guardrails | see [metrics-and-guardrails.md](metrics-and-guardrails.md) |

## Decision rule
1. Any **data-quality** gate fails → **No decision.** The observed difference is shown for diagnosis only.
2. Else any **guardrail** regresses → **Iterate.**
3. Else lower bound of the difference > 0 **and** point estimate ≥ minimum effect → **Ship to a wider pilot.**
4. Else → **Iterate** (inconclusive is not "no effect").

No p-values are computed or shown. Intervals are descriptive.

## Seeded results (synthetic; they show the rule works, nothing more)
| Scenario | Control | Treatment | Difference (95% interval) | Verdict | Why |
|---|---|---|---|---|---|
| A · Clean pilot | 25/150 = 16.7% | 42/150 = 28.0% | +11.3 pp (+1.9 to +20.5) | Ship to a wider pilot | All gates pass; interval above 0; ≥ 5 pp |
| B · Broken tracking | 0/14 = 0.0% | 2/12 = 16.7% | +16.7 pp (−8.0 to +44.8) | **No decision** | Duplicates 7.9%, assignment mismatch 15.5%, SRM χ² 8.67, 73% immature, n far below 100; opt-out guardrail also regressed |

Scenario A's effect is **planted** by the generator (`engaged` 0.30 → 0.50). Scenario B shows a bigger raw gap than A and still gets no decision, which is the point.
