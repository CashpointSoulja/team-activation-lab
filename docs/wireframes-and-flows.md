# Wireframes and flows

Screenshots of the built UI are in [screenshots/](screenshots/). The low-fidelity frames below are what was designed before building.

## Flow
```
Landing ─┬─ 1 · Manager preview
         │     goal ─▶ 7-day plan ─▶ create plan ─▶ pick ≥2 learners ─▶ simulated invites
         │     ─▶ simulate accept/start/complete ─▶ first-value check ─▶ export events CSV
         │
         └─ 2 · Growth experiment
               load scenario / upload CSV ─▶ validate + quarantine ─▶ register contract
               ─▶ funnel (denominator, window) ─▶ stalled account ─▶ assignment check
               ─▶ qualitative evidence (0 interviews) ─▶ variant analysis ─▶ quality gates
               ─▶ recommendation ─▶ export decision JSON / instrumentation spec
```

## Manager preview (desktop, two columns; stacks on mobile)
```
┌ Logo │ Team Activation Lab ─────────────── [Independent concept · synthetic data] ┐
│ Treatment preview · account preview-xxxx · day 0 of 7                            │
├──────────────────────────────┬───────────────────────────────────────────────────┤
│ Step 1  Pick one goal         │ Step 3  Invite a first cohort  [simulated]       │
│ (•) Onboard SOC analysts      │ [x] Analyst A    invited  [Simulate accept]      │
│ ( ) Incident response  …      │ [x] Analyst B    …                               │
├──────────────────────────────┤ [Create simulated invitations] [Advance day]     │
│ Step 2  Seven-day proof plan  ├───────────────────────────────────────────────────┤
│ Day 1 … Day 7                 │ First-value check  ✓ goal ✓ plan ✓ 2 invited ○ 2 │
│ [Create proof plan]           │                                                   │
├──────────────────────────────┴───────────────────────────────────────────────────┤
│ Local event log (CSV schema)                    [Export CSV] [Reset preview]      │
└───────────────────────────────────────────────────────────────────────────────────┘
```

## Growth view (single column, numbered steps)
```
Step 1 Load  │ Step 2 Validate (KPIs + quarantine table) │ Step 3 Contract (locked after register)
Step 4 Funnel table (control | treatment, n/denominator · %)
Step 5 Stalled account timeline │ Step 6 Assignment lookup
Qualitative evidence: 0 interviews
Step 7 Results table + interval plot + difference plot (0 line, min-effect line)
Step 8 Gates: PASS/FAIL/NOTE list
Step 9 Verdict card (green ship · blue iterate · amber no decision) [Export]
```
