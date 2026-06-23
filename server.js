/**
 * Regloo — Express server.
 *
 * Serves both the marketing site (landing, pricing, legal) and the product
 * core: accounts and the compliance dashboard (see routes/app.js). Data is
 * persisted by lib/store.js (JSON file under DATA_DIR).
 */
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const session = require('express-session');
const { SITE, pageContext } = require('./lib/site');
const auth = require('./lib/auth');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1); // Render terminates TLS at a proxy

// Stripe webhook needs the raw body for signature verification — must be
// registered before the JSON body parser.
app.post('/webhooks/stripe', express.raw({ type: '*/*' }), require('./routes/webhook'));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check (used by Render). Cheap and dependency-free.
app.get('/health', (_req, res) => res.json({ status: 'healthy' }));

// Static assets. `index: false` so `/` renders the EJS landing page.
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Sessions + current user (after static so assets skip this work).
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: 'auto', maxAge: 1000 * 60 * 60 * 24 * 30 },
}));
app.use(auth.attachUser);

// Landing page
app.get('/', (_req, res) => {
  res.render('layout', pageContext({ canonical: '/', pageCss: 'landing.css' }));
});

// Pricing & confirmation
const tarifsRouter = require('./routes/tarifs');
app.use('/tarifs', tarifsRouter);
app.get('/confirmation', tarifsRouter.renderConfirmation);

// Legal pages
app.use('/', require('./routes/legal'));

// Product core — accounts + compliance dashboard
app.use('/', require('./routes/app'));

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
