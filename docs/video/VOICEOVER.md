# Walkthrough voiceover script

Vertical 1080×1920 live UI walkthrough of the local build (synthetic data only). Timecodes match `team-activation-lab-walkthrough.mp4` and `team-activation-lab-walkthrough.srt`.

| Start | Line |
|---|---|
| 0:00.0 | This is Team Activation Lab, an independent concept I built for the B2B Growth P M role. It uses synthetic data, and it is not an official TryHackMe tool. |
| 0:12.4 | A company tries cyber training, but signing up does not mean the team gets useful practice. So first, the manager picks one goal. |
| 0:21.9 | The goal becomes a seven day proof plan. Creating it logs a plan event, locally, in the same schema the growth view reads. |
| 0:31.2 | Now invite two learners. These invitations are simulated. Nothing is sent. They are local records only. |
| 0:40.4 | I simulate each learner accepting, starting, and completing a meaningful lab. The first value check turns green when two distinct invited learners finish within seven days. |
| 0:58.5 | Second half. Is this journey worth shipping? The growth view loads a seeded pilot of three hundred accounts, and validates every row. Malformed rows are quarantined with a reason, and duplicates are dropped. |
| 1:13.7 | Before any outcome appears, I register the contract. The unit is the account, assigned by a seeded hash, with an intent to treat denominator, a minimum sample, and a minimum effect. |
| 1:26.5 | The funnel shows every step with its denominator, so you can see exactly who was counted. |
| 1:33.1 | Results are absolute rates with ninety five percent intervals, and the percentage point difference. All quality gates pass, so the verdict is ship to a wider pilot. |
| 1:45.0 | Now the failure case. This file has duplicate events, a variant logging bug, unbalanced groups, and only three days of observation. |
| 1:55.3 | Treatment even looks better here. But the gates fail, so the lab refuses to call a winner. The verdict is no decision. |
| 2:08.5 | Every verdict exports as a decision record, with the evidence, the failed checks, and the limitations. It is fake data, but a real product and measurement loop. Independent concept by Ayo Ahmed. |
