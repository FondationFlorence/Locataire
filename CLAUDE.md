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
- `routes/webhook.js` — `POST /webhooks/stripe` (raw body, signature verified)
- `routes/admin.js` — `/admin` metrics (gated by `ADMIN_EMAILS`)
- `views/partials/` — `head.ejs`, `nav.ejs`, `footer.ejs`, `app-header.ejs`
- `views/layout.ejs` — landing page (marketing)
- `views/tarifs.ejs` / `confirmation.ejs` / `legal.ejs` / `404.ejs`
- `views/app/` — `dashboard.ejs`, `property-form.ejs`, `property-detail.ejs`,
  `login.ejs`, `signup.ejs`, `admin.ejs`

## Metrics & analytics
- **Business metrics** live at `/admin` (`routes/admin.js`) — accounts,
  subscriptions by plan, MRR/ARR, portfolio compliance, communes, recent
  signups. Computed from the store; gated by `ADMIN_EMAILS`. `attachUser` sets
  `res.locals.isAdmin` so `app-header.ejs` shows the Admin link.
- **Web analytics**: self-hosted Umami. `head.ejs` injects the tracking script
  only when both `UMAMI_WEBSITE_ID` and `UMAMI_SRC` are set (off by default — no
  tracking otherwise). Deploy recipes in `umami/` (docker-compose + Render).
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
Three monthly plans: Starter €89, Professionnel €149, Premium €249. Checkout
links live in `routes/tarifs.js`; when a user is logged in, `tarifs.ejs` appends
`?prefilled_email=` so the payment email matches the account.

**Webhook → activation** (`routes/webhook.js`, `lib/billing.js`): Stripe posts
to `POST /webhooks/stripe` (mounted with a raw-body parser before `express.json`).
The signature is verified with `crypto` (no Stripe SDK) against
`STRIPE_WEBHOOK_SECRET`. On `checkout.session.completed` the plan is derived from
the amount (8900/14900/24900 → starter/pro/premium) and the account is activated
by email; if no account exists yet, a *pending subscription* is stored and
claimed at signup. `customer.subscription.deleted` marks it canceled. The
dashboard shows the subscription banner. Annual billing is still via contact.

## Before going live
- Fill the `[À COMPLÉTER]` placeholders in `routes/legal.js` (legal name,
  SIREN, host, publication director).
- Set `SESSION_SECRET` (stable secret) and `DATA_DIR` to a **persistent**
  volume (e.g. a Render disk) so accounts/properties survive restarts — the
  default JSON store is otherwise ephemeral. For scale, swap `lib/store.js`
  for a managed database (Postgres) behind the same API.
- Sessions use the in-memory store (users are logged out on restart); add a
  persistent session store before heavy use.
- Stripe → account provisioning IS wired (`routes/webhook.js`). To enable it:
  create a webhook endpoint in Stripe pointing to `https://<domaine>/webhooks/stripe`
  for `checkout.session.completed` and `customer.subscription.deleted`, then set
  `STRIPE_WEBHOOK_SECRET`. Without that env var the endpoint returns 503 and the
  free signup remains the funnel.
- Point each Stripe link's success URL to `/confirmation?plan=<key>`.
- For scale beyond the JSON store, migrate `lib/store.js` to Postgres (validate
  against a real instance before relying on it).
