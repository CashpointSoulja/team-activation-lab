# Test strategy with actual results

Run on 6 Oct 2026, Node 22.23.3, Chromium (Playwright 1.63.0), local `wrangler dev` (4.147.0) on port 8787. Raw outputs: [evidence/unit-tests.txt](evidence/unit-tests.txt), [evidence/e2e-browser.txt](evidence/e2e-browser.txt).

## Commands
```bash
npm run check      # node --check on all JS: passed, no output
npm test           # 20 unit tests: 20 pass, 0 fail
npm run dev        # in another shell
npm run test:e2e   # smoke + axe accessibility + edge cases: all assertions printed below
```

## Required cases → evidence
| Case | Where | Actual result |
|---|---|---|
| Happy path | T1, E1 smoke | Scenario A → **Ship to a wider pilot**; 150/150 mature accounts; +11.3 pp (+1.9 to +20.5) |
| Malformed rows | T3, E3 edge | Row errors: `account_id is missing`, `unknown event_type "teleport"`, `occurred_at "09/01/2026" is not an ISO-8601 UTC timestamp`, wrong field count; valid rows kept |
| Missing header | T4 | `Missing required column(s)` file-level error |
| Duplicates | T5, E3 | Same completion 3× → 1 completion, not activated; upload shows `duplicate event_id (first seen on line 2)` |
| Missing account IDs | T3, scenario B | Quarantined with reason `missing_account_id`; rate gate shown |
| Cross-variant accounts | T10 | Flagged `crossVariant`, analysed by hash assignment; assignment gate FAIL → no decision |
| Out-of-order timestamps | T8 | Re-sorted, warning reported, activation still correct |
| Invited before plan | T7 | `earlyInvites = 1`; pre-plan completion not counted; account not activated |
| Zero denominators | T12 | Rates `null`, difference `null`, funnel rates `null` with denominator 0, Wilson `[null, null]`, verdict no decision; no exceptions |
| Small sample | T13 | 12 accounts with a large gap → sample gate FAIL → no decision |
| Immature 7-day cohorts | T14 | Excluded, logged as `immature`, maturity gate FAIL |
| Sample-ratio mismatch | T15, T2 | χ²(40, 80) > 6.635; scenario B 34 vs 63, χ² 8.67 → FAIL |
| Guardrail regression | T16 | Tightened opt-out guardrail → **Iterate**, not ship |
| Broken-tracking scenario | T2, E1 | Treatment looks +16.7 pp better; duplicates, assignment, SRM, maturity, sample all FAIL → **No decision** |
| Pre-registration | T17, E3 | Amend after outcomes → **No decision** with "Amended after outcomes were shown" tag (see bug B2) |
| Stats correctness | T18 | Newcombe 1998 worked example reproduced to 4 dp; Wilson reference values reproduced |
| Export | T19, E1, E3 | Decision JSON has `synthetic_data: true`, failures, contract, limitations; export-all JSON downloaded |
| Reset | E3 | After reset: manager tab selected, no goal chosen, fresh state |
| Mobile + keyboard | E3 (390×844, touch) | Keyboard-only manager flow: 4/4 first-value criteria met; tabs move with Arrow keys; first Tab = "Skip to content" |
| Accessibility | E2 axe-core 4.10.2 (WCAG 2 A/AA, 2.1 AA, best practice) | Manager, growth A, growth B, desktop and mobile: **no violations** (after fixes, see below) |
| Privacy | E3 | Requests to other origins: 0. Cookies: 0. CSP header present on responses |
| No horizontal overflow on mobile | manual Playwright check | `scrollWidth > innerWidth` → false |

## Bugs found by tests and fixed
- **B1 Assignment ignored the seed.** T9 failed: `fnv1a % 2` gives the same split for any seed. Fixed with a Murmur3 finaliser (ADR-002).
- **B2 Amend loophole.** E3 showed amending and re-registering cleared the "amended" flag, so a post-hoc change could produce "Ship". Fixed; E3 now shows No decision.
- **B3 Accessibility.** First axe run: colour contrast on the no-decision step label, empty funnel header cells, unfocusable scroll regions, duplicate region labels. All fixed; re-run clean.
- **B4 Test-fixture error.** T8 initially dropped one row in its own shuffle; fixed the test, not the engine.

## Manual checks
| # | Check | Result |
|---|---|---|
| M1 | Visual review of desktop and mobile screenshots ([screenshots/](screenshots/)) | Logo top-left, independence tag visible, footer credits Ayo only |
| M2 | Inline script blocked by CSP (axe injection without bypass) | Blocked, as intended |
| M3 | `GET /healthz` | `ok` |
| M4 | Response headers | CSP, `nosniff`, `no-referrer` present; no `Set-Cookie` |
| M5 | Persistence warning visible on both tabs | Yes, "Your data stays in this browser" card |

## Not tested
- Real screen readers (NVDA, VoiceOver).
- Safari and Firefox engines (Chromium only).
- Very large uploads (> 5 MB are refused by design).
- The public Cloudflare URL (see the root README for deployment status).
