# Event / data dictionary and CSV schema

Machine-readable version: **Instrumentation spec (JSON)** button in the app, or `INSTRUMENTATION_SPEC` in `public/js/engine.js`.

## CSV schema
Header row required. Column order is free; extra columns are ignored with a warning. Missing columns reject the file.

| Column | Type | Required | Rule |
|---|---|---|---|
| `event_id` | string | yes | Unique. A repeated ID is dropped as a duplicate. |
| `account_id` | string | yes | Randomisation unit. Empty → row quarantined (`missing_account_id`). |
| `learner_id` | string | for learner events | Pseudonymous ID. Never an email or name. |
| `event_type` | enum | yes | One of the events below. Unknown → quarantined. |
| `occurred_at` | ISO-8601 UTC ending `Z` | yes | e.g. `2026-09-04T10:00:00Z`. Anything else → quarantined. |
| `variant` | `control` \| `treatment` | yes | Must equal the hashed assignment; mismatches are kept, flagged and analysed by assignment. |
| `goal_id` | string | no | |
| `plan_id` | string | no | |
| `lab_id` | string | for `meaningful_lab_completed` | |
| `assignment_seed` | string | no | Audit only. |

## Events
| event_type | Actor | Meaning |
|---|---|---|
| `evaluation_started` | admin | Account enters the experiment. Starts the 7-day window. Required for eligibility. |
| `goal_selected` | admin | Treatment only: admin picked a goal. |
| `plan_created` | admin | A plan exists (goal-led in treatment, generic in control). |
| `learner_invited` | learner | Invite created (simulated in the demo). |
| `invite_accepted` | learner | |
| `lab_started` | learner | |
| `meaningful_lab_completed` | learner | Completion of a lab the plan marks as meaningful. |
| `learner_opted_out` | learner | Learner declined or left. Feeds the opt-out guardrail. (Added, ADR-004.) |
| `decision_exported` | PM | Reserved for audit of decisions. |

## Processing rules
1. **Validation** per row; every failure reason is listed with the CSV line number.
2. **Dedupe:** drop repeated `event_id`; also drop identical (`account_id`, `learner_id`, `event_type`, `lab_id`, `occurred_at`) under a new ID (retry resends).
3. **Ordering:** rows are re-sorted by `occurred_at`; the number of out-of-order arrivals is reported, not treated as an error.
4. **Eligibility:** account has `evaluation_started` inside the enrollment window.
5. **Maturity:** `evaluation_started + 7 days ≤ analysis_as_of`. Immature accounts are excluded and logged.
6. **Assignment:** `mix32(fnv1a(seed + ":" + account_id)) < 2^31` → control, else treatment.
