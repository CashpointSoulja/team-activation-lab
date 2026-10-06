# Instrumentation QA

What the validator catches, how it's reported, and what it can't catch.

| Fault | Detection | Effect on analysis | Test |
|---|---|---|---|
| Missing column | header check | file rejected | T4 |
| Wrong field count | per row | quarantined | T3 |
| Missing `account_id` | per row | quarantined; rate is a gate (≤ 2%) | T3 |
| Unknown `event_type` | enum | quarantined | T3 |
| Non-UTC / malformed time | regex + parse | quarantined | T3 |
| Bad `variant` value | enum | quarantined | T3 |
| Learner event with no `learner_id` | rule | quarantined | T3 |
| Duplicate `event_id` or content | key maps | dropped; rate is a gate (≤ 2%); never counted as a conversion | T5 |
| Out-of-order arrival | sequence | re-sorted; reported | T8 |
| Account logged in both variants / wrong variant | vs hash | flagged; analysed by assignment; rate is a gate | T10 |
| Invite before plan | per account | flagged; note in gates; those completions only count after the plan | T7 |
| Completion with no invite | per account | flagged; not counted | T6 |
| Unbalanced arms | χ² SRM | gate | T15, T2 |
| Immature windows | as-of date | excluded and logged; share is a gate | T14 |

## Not caught
Biased logging that is balanced across arms, bot or test accounts, clock skew within a few minutes, events silently never sent (only visible as a funnel drop), and novelty effects. A production rollout needs an analytics owner to review these.

## Shadow-mode checklist before a live test
1. Fire all events in shadow for one week with no UI change.
2. Reconcile counts against the source of truth (e.g. invites in the product DB).
3. Confirm assignment service and logged variant agree for > 99% of accounts.
4. Confirm duplicate rate < 2% and no missing account IDs.
