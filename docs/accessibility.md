# Accessibility

Target: WCAG 2.1 AA.

- Keyboard: skip link first in tab order; tabs follow the ARIA tabs pattern (Arrow Left/Right, Home, End); all actions are native buttons, inputs and selects; focus is returned to the relevant control after each re-render.
- Visible focus: 3 px lime outline on `:focus-visible`.
- Touch targets ≥ 44 px for primary controls (36 px for small inline buttons).
- Colour is never the only signal: gates say PASS/FAIL/NOTE; verdicts are words; checklists include "(met)/(not yet)" for screen readers.
- Charts are SVG with `role="img"` and a text `aria-label` giving the numbers; the same numbers are in a table.
- Live regions: verdict card and first-value check are `aria-live="polite"`; toasts use `role="status"`.
- Scrollable tables are focusable regions with unique labels.
- `prefers-reduced-motion` removes transitions.

Automated and manual results: [test-strategy-and-results.md](test-strategy-and-results.md).
Known gaps: no screen-reader session with NVDA/VoiceOver has been recorded; confirm dialogs use the native `confirm()`.
