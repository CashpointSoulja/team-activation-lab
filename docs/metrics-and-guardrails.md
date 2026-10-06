# Metric definitions and guardrails

## North-star candidate
Share of eligible evaluating accounts reaching first value in 7 days (`activated_7d`). Candidate only: it must be shown to predict retention or paid conversion before it is used as a target.

## Diagnostics (per variant, denominator = mature eligible accounts)
| Metric | Definition |
|---|---|
| Goal selected | account logged `goal_selected` in window |
| Plan rate | account logged `plan_created` in window |
| ≥1 invited | at least one `learner_invited` in window |
| Invite acceptance | accepted invites ÷ invites (learner-level, descriptive only) |
| ≥2 started | ≥ 2 learners with `lab_started` in window |
| Stall step | first unmet step: no plan → no invites → invites not accepted → no lab started → not completed |
| Median setup hours | `evaluation_started` → first `learner_invited` |

## Quality gates (fail → no decision)
| Gate | Threshold |
|---|---|
| Contract registered before outcomes | must be true |
| Valid events present | > 0 |
| Missing `account_id` rows | ≤ 2% of rows |
| Duplicate rows | ≤ 2% of rows |
| Logged variant ≠ assignment, or both variants | ≤ 1% of eligible accounts |
| Sample-ratio mismatch | χ² (1 df) < 6.635 (p ≈ 0.01) against 50/50 |
| Immature accounts | ≤ 10% of eligible |
| Minimum sample | ≥ 100 mature accounts per variant |

## Guardrails (fail with clean data → iterate)
| Guardrail | Threshold |
|---|---|
| Learner opt-out rate | treatment − control ≤ +3 pp |
| Setup time | treatment median − control median ≤ +24 h |

## Future validation outcomes (not inferred here)
90-day retention, seat expansion, paid conversion. Lab completion is **not** a security-readiness measure.
