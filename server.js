/**
 * regloo — Express server.
 *
 * Serves the marketing site: landing page, pricing, post-checkout
 * confirmation, and legal pages. No database: the app is presentational and
 * payments are handled by Stripe Checkout (hosted links in routes/tarifs.js).
 * Add a datastore here when the operator dashboard is built.
 */
const express = require('express');
const path = require('path');
const { SITE, pageContext } = require('./lib/site');

const app = express();
const port = process.env.PORT || 3000;

// EJS view engine. Templates live in ./views/ (shared chunks in views/partials/).
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());

// Health check (used by Render). Cheap and dependency-free.
app.get('/health', (_req, res) => res.json({ status: 'healthy' }));

// Static assets (CSS, JS, favicon, robots, sitemap). `index: false` so `/`
// always renders the EJS landing page below.
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Landing page
app.get('/', (_req, res) => {
  res.render('layout', pageContext({
    canonical: '/',
    pageCss: 'landing.css',
  }));
});

// Pricing & confirmation
const tarifsRouter = require('./routes/tarifs');
app.use('/tarifs', tarifsRouter);
app.get('/confirmation', tarifsRouter.renderConfirmation);

// Legal pages
const legalRouter = require('./routes/legal');
app.use('/', legalRouter);

// 404
app.use((req, res) => {
  res.status(404).render('404', pageContext({
    title: `Page introuvable — ${SITE.name}`,
    description: 'La page demandée est introuvable.',
    canonical: req.path,
  }));
});

app.listen(port, () => {
  console.log(`${SITE.name} server running on port ${port}`);
});
