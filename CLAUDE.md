# regloo — CLAUDE.md

## What this app does
Regloo is a compliance tool for short-term rental operators (meublés de
tourisme) in France. It helps conciergeries, multi-property owners and property
managers navigate commune-level rules (90/120-day caps, Declaloc registration,
DPE, taxes de séjour). The repo contains BOTH the marketing site (landing,
pricing, legal) AND a working product core: accounts + a compliance dashboard
where each lot is evaluated against its commune's rules (see "Product core").

## Stack
Express + EJS, vanilla CSS, no front-end build. Sessions via `express-session`;
passwords hashed with Node's built-in `crypto.scrypt` (no native deps).
Persistence is a JSON-file store (`lib/store.js`, under `DATA_DIR`). Payments
via Stripe Checkout (hosted links). Deployed on Render (see `render.yaml`).

## Branding — single source of truth
All brand-specific strings live in **`lib/site.js`** (`SITE` object: name,
domain, url, email, tagline, description). Views read them as `<%= site.name %>`
etc. To rebrand, edit that one file. Do not hardcode the brand name in views.

### Visual identity (Regloo brand kit)
The brand kit ships under `public/` (`brand/`, `logos/`, `favicons/`).
- **Palette** (warm, earthy — defined as tokens in `shared.css`): encre
  `#211C18` (text, dark sections), terracotta `#C3683E` (the *single* accent —
  links, primary buttons, the logo door; do not multiply), sable `#EBE2D5`
  (cards/surfaces), crème `#F4EEE5` (page background), muted `#6E6155`.
- **Type**: Bricolage Grotesque (display/headings, 600–700), Hanken Grotesk
  (body), Spline Sans Mono (eyebrows, labels, data). Loaded via Google Fonts in
  `head.ejs`.
- **Logo**: a dome (igloo) with a terracotta door. Inlined as SVG in `nav.ejs`
  / `footer.ejs`; source files in `public/logos/` (`regloo-icon.svg`,
  `regloo-lockup.svg`, inverse variants for dark backgrounds, `favicon.svg`).
  The wordmark is **Regloo** (capital R).

## Directory map
- `server.js` — Express entry: sessions, routes, static serving, 404
- `lib/site.js` — brand config + `pageContext()` render-locals helper
- `lib/communes.js` — per-commune rules engine (day caps, registration, CU)
- `lib/compliance.js` — evaluates a property → status, checks, alerts; summarize
- `lib/store.js` — JSON-file persistence (users, properties) under `DATA_DIR`
- `lib/auth.js` — scrypt hashing + `attachUser`/`requireAuth` middleware
- `routes/tarifs.js` — `/tarifs` + `/confirmation`, Stripe links, plan metadata
- `routes/legal.js` — `/mentions-legales`, `/confidentialite`, `/cgv`
- `routes/app.js` — accounts (`/inscription`, `/connexion`, `/deconnexion`) +
  dashboard (`/app`) and property CRUD (`/app/biens/*`)
- `views/partials/` — `head.ejs`, `nav.ejs`, `footer.ejs`, `app-header.ejs`
- `views/layout.ejs` — landing page (marketing)
- `views/tarifs.ejs` / `confirmation.ejs` / `legal.ejs` / `404.ejs`
- `views/app/` — `dashboard.ejs`, `property-form.ejs`, `property-detail.ejs`,
  `login.ejs`, `signup.ejs`
- `public/css/` — `shared.css` (tokens, reset, nav, footer) + one sheet per page
  (`landing`, `tarifs`, `confirmation`, `legal`, `app`)
- `public/js/app.js` — mobile menu, scroll reveal/stagger, count-up, FAQ
- `public/{brand,logos,favicons}/`, `robots.txt`, `sitemap.xml`

## Product core
- The dashboard (`/app`) lists a user's properties, each evaluated by
  `lib/compliance.js` against `lib/communes.js`. Status is `ok` / `attention`
  / `critique`; alerts carry a recommended action.
- **Honest limitation**: day counts, DPE and registration numbers are
  user-entered. There is no automatic sync from Airbnb/Booking or from mairie
  téléservices yet, and commune rules are indicative (not legal advice). The
  dashboard says so in a banner — keep that honesty.
- To extend coverage, add a commune to `COMMUNES` in `lib/communes.js`.

## Conventions
- Every route builds locals via `pageContext({...})` so `site`, `year`,
  `title`, `description`, `canonical`, `pageCss` are always present.
- `attachUser` puts `currentUser` on `res.locals` for all views.
- `head.ejs` loads `shared.css` plus the per-page sheet named in `pageCss`.
- Page-specific CSS goes in its own file (not inline, not in shared.css).

## Pricing / Stripe
Three monthly plans: Starter €89, Professionnel €149, Premium €249. Links live
in `routes/tarifs.js`. Annual billing is offered via contact (no annual Stripe
links yet) — add them there and re-introduce a billing toggle if needed.

## Before going live
- Fill the `[À COMPLÉTER]` placeholders in `routes/legal.js` (legal name,
  SIREN, host, publication director).
- Set `SESSION_SECRET` (stable secret) and `DATA_DIR` to a **persistent**
  volume (e.g. a Render disk) so accounts/properties survive restarts — the
  default JSON store is otherwise ephemeral. For scale, swap `lib/store.js`
  for a managed database (Postgres) behind the same API.
- Sessions use the in-memory store (users are logged out on restart); add a
  persistent session store before heavy use.
- Stripe → account provisioning is NOT wired yet: paying on `/tarifs` does not
  create or upgrade an account. The honest funnel today is the free signup
  (`/inscription`). Wire a Stripe webhook before charging for the product.
- Point each Stripe link's success URL to `/confirmation?plan=<key>`.
