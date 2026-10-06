# Privacy and risk model

## Data
- Demo uses synthetic data only. No real people, accounts, emails or TryHackMe data.
- Uploaded CSVs are parsed in the browser and never leave it (CSP `connect-src 'self'`; the Worker has no upload endpoint).
- `learner_id` must be pseudonymous; the spec forbids emails or names.
- No cookies, analytics, trackers or third-party requests. The Worker strips `Set-Cookie`.
- State lives in `localStorage` under `tal.state.v1`; reset clears it.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Mistaken for an official TryHackMe tool | Medium | High | Persistent independence tag, footer, notice, README, docs |
| Synthetic numbers quoted as real results | Medium | High | "Synthetic" on every result, rationale and export; planted effect disclosed |
| Activation metric adopted without validation | Medium | Medium | Labelled unvalidated everywhere; validation plan in docs |
| Real personal data uploaded | Low | Medium | Stays local; spec says pseudonymous IDs; no server storage |
| Quality gates miss subtle bias | Medium | Medium | Listed in [instrumentation-qa.md](instrumentation-qa.md); analytics owner review in rollout |
| Brand misuse | Low | Medium | Logo used unmodified for context only; no dashboard UI copied |

## Production would need
DPIA/consent review for learner tracking, retention limits, access controls on the experiment registry, and an audit trail of contract changes.
