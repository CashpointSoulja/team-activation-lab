# Support runbook (demo)

| Symptom | Likely cause | Fix |
|---|---|---|
| "File rejected: Missing required column(s)" | Header names differ | Use the schema in [event-dictionary.md](event-dictionary.md); download a scenario CSV as a template |
| Many quarantined rows | Non-UTC timestamps (`04/09/2026`), blank `account_id`, unknown event names | Export ISO-8601 with `Z`; check event names |
| Outcomes don't appear | Contract not registered | Press **Register contract and show outcomes** |
| Always "No decision" on my file | Sample < 100/arm, windows immature, or blank as-of date | Read the FAIL lines in Step 8; adjust before registering, not after |
| Decision says contract amended | Contract changed after outcomes were shown | Expected: re-run as a new registration |
| State lost | Private window, cleared site data, other device | Export JSON before leaving |
| Upload not saved after reload | File > ~2 MB exceeds localStorage | Re-upload; it is still analysed in-session |
| Stuck or odd state | Old saved state | **Reset everything** |

**Health check:** `GET /healthz` returns `ok`.
**Deploy:** `npm run deploy` (needs Cloudflare credentials). **Local:** `npm run dev`.
