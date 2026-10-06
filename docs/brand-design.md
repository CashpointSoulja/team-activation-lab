# Brand and design capture

Captured 6 October 2026 (UTC) from the public pages below with a headless Chromium (1440×900 and 390×844 viewports), reading computed styles and the page's own `:root` CSS custom properties. Nothing here comes from private product areas. Tokens are copied, not invented; where the concept needs something the public pages don't define, it is marked **concept-only**.

Sources:
- https://tryhackme.com/business
- https://tryhackme.com/business/solutions/management-dashboard

Visual guide: [brand/visual-guide.html](brand/visual-guide.html). Screenshots: [brand/screenshots/](brand/screenshots/).

## Independence rule
This is an independent synthetic-data concept by Ayo Ahmed. It is not a TryHackMe product, not endorsed by TryHackMe and not connected to any TryHackMe account or API. The TryHackMe Business logo is used top-left only to show how the concept would sit inside the real product, and it is always paired with a visible "Independent concept · synthetic data" label. The logo and name belong to TryHackMe.

## Logo
- File: `public/brand/tryhackme-business-logo.svg`. It is the inline SVG served in the public site header (`aria-label="TryHackMe Business logo."`, viewBox `0 0 106.488 59.779`, all fills `#fff`). Only the styled-components class attribute was removed.
- Rendered at about 114×64 px in the public header. The concept uses 86×48 px on desktop and 64×36 px on mobile.
- Not recoloured, cropped or redrawn.

## Colour tokens (from `--thmv-colors-*` on tryhackme.com)
| Role | Token | Value |
|---|---|---|
| Page background (marketing) | computed `body` | `#151c2b` (with near-black `#00000a` / `#0f0f1b` hero) |
| Background main / card | `background-main` | `#1c2538` |
| Background lighter / table odd | `background-lighter` | `#212c42` |
| Background lightest / hover | `background-lightest` | `#3e475a` |
| Background darkest | `background-darkest` | `#0b0c26` |
| Border main | `border-main` | `#212c42` |
| Border light / divider | `border-light`, `divider` | `#3e475a` |
| Primary (CTA, highlight, radio selected) | `primary-main` | `#a3ea2a` |
| Primary dark (hover) | `primary-dark` | `#9cdf29` |
| Text main | `text-main` | `#f9f9fb` |
| Paragraph | `paragraph` | `#eeeff2` |
| Text tertiary | `text-tertiary` | `#b8bec9` |
| Text secondary | `text-secondary` | `#9ca4b4` |
| Text on primary | `text-invert` | `#151c2b` |
| Grey 300 (body copy on hero) | `grey-300` | `#d4d8df` |
| Info | `info-main` / `info-secondary` | `#719cf9` / `#1153e4` |
| Success | `success-main` | `#3bc81e` |
| Warning | `warning-main` | `#ffbb45` |
| Error | `error-main` | `#ff5b67` |
| Purple (management-dashboard eyebrow) | computed | `#ae6bff`, token `purple-main` `#d752ff` |
| Status tag complete / in progress / not started | `statusTag-*` | `#224633` / `#273654` / `#49433b` (icon `#ff8d00`) |

## Typography
- Body and headings: **Source Sans Pro** (`"Source Sans Pro", sans-serif`), 400 body; headings 600. Concept uses its successor **Source Sans 3** (same design, SIL OFL), self-hosted.
- UI controls, eyebrows, card titles: **Ubuntu** 400/500 (buttons, nav-adjacent labels, h3 card titles).
- Observed scale: h1 60/84 px (600), h2 44/52.8 px (600), h3 32/38.4 px (600) or Ubuntu 24 px (500), hero body 20/28 px, body 14–18 px, eyebrow 16 px weight 300 uppercase with wide letter-spacing (`#b8bec9`, or `#ae6bff` on the dashboard page).
- Concept scale (product UI, denser than marketing): h1 32 px, h2 22 px, h3 17 px, body 15–16 px.

## Components observed
- Primary button: bg `#a3ea2a`, text `#151c2b`, 1 px solid `#a3ea2a` border, radius **4 px**, padding `10px 16px` (hero `10px 36px`), Ubuntu 16–18 px weight 400, height ≈ 38–43 px.
- Secondary button: transparent bg, text `#f9f9fb`, 1 px solid `#a3ea2a` border, same radius and padding.
- Cookie-banner buttons use radius 6 px; cards use about 8 px radius on `#1c2538`-ish surfaces with `rgba(255,255,255,.07)` hairlines.
- Pills/tags: tinted backgrounds (`rgba(113,156,249,.1)`-style soft tints) with coloured text (info blue, purple, orange).
- Header: 90 px tall, content max-width **1320 px**, logo left, icon-over-label nav, CTAs right.

## How the concept applies it
- Dark product shell on `#151c2b` with `#1c2538` cards and `#3e475a` dividers, matching the management-dashboard look rather than the marketing hero.
- `#a3ea2a` is reserved for the primary action and "activated" states; status uses the official success/warning/error/info tokens.
- A persistent label next to the logo says "Independent concept · synthetic data · not an official TryHackMe tool".
- Footer: "Independent concept by Ayo Ahmed." with the non-affiliation and synthetic-data notice.
- Does **not** reproduce the management dashboard's skills matrix, radar chart or assignment tables. The concept covers a different job: a buyer's first-value journey and an experiment decision.

## Concept-only additions (not on the public pages)
- Focus ring: 2 px `#a3ea2a` outline with 2 px offset (WCAG 2.2 focus visibility).
- Chart colours for control vs treatment: control `#719cf9` (info-main), treatment `#a3ea2a` (primary-main).
- "No decision" state uses `warning-main` `#ffbb45` on `warning-lighter` `#2c2727`.
