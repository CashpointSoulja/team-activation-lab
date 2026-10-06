# Facts vs assumptions

| Statement | Type | Basis | How to test it |
|---|---|---|---|
| The Growth PM role spans acquisition, activation, conversion, retention and expansion, with Sales/CS/Marketing collaboration | **Fact** | S1 | — |
| TryHackMe Business publicly offers assignments, progress, seat usage and reporting | **Fact** | S2, S3, S4b | — |
| TryHackMe runs growth squads, including an activation squad, and many experiments | **Fact (company statement)** | S5 | — |
| Some evaluating managers cannot turn buying intent into a first team win | Assumption | None yet | Interviews with activated and stalled admins; event review |
| A goal-led seven-day proof plan improves seven-day account activation | Hypothesis | None yet | The registered experiment in this concept, run on real traffic |
| "Plan + 2 distinct learners complete a meaningful lab in 7 days" predicts retention or paid conversion | Hypothesis | None yet | Longitudinal analysis of past cohorts before using it as a KPI |
| Two learners is the right threshold | Assumption | Chosen as smallest "team" signal | Sensitivity analysis on 1, 2, 3 learners against later outcomes |
| Seven days is the right window | Assumption | Matches a short trial rhythm | Check time-to-first-completion distribution in real data |
| The stall is activation, not procurement or seat economics | Assumption (first falsifier) | None yet | Discovery: if stalled buyers already have a clear plan, change direction |
| All numbers in the demo | **Synthetic** | Seeded generator `scripts/generate-scenarios.mjs` | They are not evidence of anything except that the rules work |
| Scenario A effect size | **Synthetic, planted** | Generator parameters `engaged` 0.30 vs 0.50 | — |
