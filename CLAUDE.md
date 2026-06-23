# regloo — CLAUDE.md

## What this app does
regloo is a compliance tool for short-term rental operators (meublés de
tourisme) in France. It helps conciergeries, multi-property owners and property
managers navigate commune-level rules (90/120-day caps, Declaloc registration,
DPE, taxes de séjour). Today the repo is the marketing site + pricing; the
operator dashboard is on the roadmap.

## Stack
Express + EJS. No database, no front-end build, vanilla CSS. Payments via
Stripe Checkout (hosted links). Deployed on Render (see `render.yaml`).

## Branding — single source of truth
All brand-specific strings live in **`lib/site.js`** (`SITE` object: name,
domain, url, email, tagline, description). Views read them as `<%= site.name %>`
etc. To rebrand, edit that one file. Do not hardcode the brand name in views.

## Directory map
- `server.js` — Express entry: routes, static serving, 404
- `lib/site.js` — brand config + `pageContext()` render-locals helper
- `routes/tarifs.js` — `/tarifs` + `/confirmation`, Stripe links, plan metadata
- `routes/legal.js` — `/mentions-legales`, `/confidentialite`, `/cgv`
- `views/partials/` — `head.ejs`, `nav.ejs`, `footer.ejs` (shared chunks)
- `views/layout.ejs` — landing page
- `views/tarifs.ejs` / `confirmation.ejs` / `legal.ejs` / `404.ejs`
- `public/css/` — `shared.css` (tokens, reset, nav, footer) + one sheet per page
- `public/js/app.js` — mobile menu, scroll reveal, FAQ accordion
- `public/favicon.svg`, `robots.txt`, `sitemap.xml`

## Conventions
- Every route builds locals via `pageContext({...})` so `site`, `year`,
  `title`, `description`, `canonical`, `pageCss` are always present.
- `head.ejs` loads `shared.css` plus the per-page sheet named in `pageCss`.
- Page-specific CSS goes in its own file (not inline, not in shared.css).

## Pricing / Stripe
Three monthly plans: Starter €89, Professionnel €149, Premium €249. Links live
in `routes/tarifs.js`. Annual billing is offered via contact (no annual Stripe
links yet) — add them there and re-introduce a billing toggle if needed.

## Before going live
Fill the `[À COMPLÉTER]` placeholders in `routes/legal.js` (legal name, SIREN,
host, publication director). Point each Stripe link's success URL to
`/confirmation?plan=<key>`.
