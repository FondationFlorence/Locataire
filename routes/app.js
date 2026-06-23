/**
 * Product core routes — accounts + the compliance dashboard.
 *
 * Auth:      /inscription, /connexion, /deconnexion
 * Workspace: /app (dashboard), /app/biens/* (CRUD on properties)
 *
 * Each lot is evaluated by the compliance engine against its commune's rules;
 * the dashboard aggregates status and alerts across the portfolio.
 */
const express = require('express');
const { SITE, pageContext } = require('../lib/site');
const store = require('../lib/store');
const auth = require('../lib/auth');
const communes = require('../lib/communes');
const compliance = require('../lib/compliance');

const router = express.Router();

function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '')); }

function parseProperty(body) {
  const platforms = [].concat(body.platforms || []).filter(Boolean);
  return {
    name: (body.name || '').trim(),
    commune: body.commune || 'autre',
    communeLabel: (body.communeLabel || '').trim(),
    type: body.type === 'secondaire' ? 'secondaire' : 'principale',
    address: (body.address || '').trim(),
    registrationNumber: (body.registrationNumber || '').trim(),
    changementUsage: body.changementUsage === 'on' || body.changementUsage === 'true',
    platforms,
    daysRented: Math.max(0, parseInt(body.daysRented, 10) || 0),
    dpeClass: (body.dpeClass || '').trim().toUpperCase(),
    dpeDate: (body.dpeDate || '').trim(),
  };
}

// Resolve a property owned by the current user, or null.
function ownProperty(req) {
  const p = store.getProperty(req.params.id);
  if (!p || !req.currentUser || p.userId !== req.currentUser.id) return null;
  return p;
}

// ── SIGNUP ──
router.get('/inscription', (req, res) => {
  if (req.currentUser) return res.redirect('/app');
  res.render('app/signup', pageContext({ title: `Créer un compte — ${SITE.name}`, canonical: '/inscription', pageCss: 'app.css', error: null, values: {} }));
});

router.post('/inscription', (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const values = { name, email };
  const fail = (error) => res.status(400).render('app/signup', pageContext({ title: `Créer un compte — ${SITE.name}`, canonical: '/inscription', pageCss: 'app.css', error, values }));

  if (!isEmail(email)) return fail('Adresse e-mail invalide.');
  if (password.length < 8) return fail('Le mot de passe doit faire au moins 8 caractères.');
  if (store.findUserByEmail(email)) return fail('Un compte existe déjà avec cette adresse.');

  const user = store.createUser({ email, name, passwordHash: auth.hashPassword(password) });
  // Claim a subscription paid before the account existed (matched by email).
  const pending = store.takePendingSubscription(email);
  if (pending) store.setUserSubscription(user.id, pending);
  req.session.userId = user.id;
  res.redirect('/app');
});

// ── LOGIN ──
router.get('/connexion', (req, res) => {
  if (req.currentUser) return res.redirect('/app');
  res.render('app/login', pageContext({ title: `Connexion — ${SITE.name}`, canonical: '/connexion', pageCss: 'app.css', error: null, values: {}, suite: req.query.suite || '' }));
});

router.post('/connexion', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const suite = req.body.suite || '';
  const user = store.findUserByEmail(email);
  if (!user || !auth.verifyPassword(password, user.passwordHash)) {
    return res.status(401).render('app/login', pageContext({ title: `Connexion — ${SITE.name}`, canonical: '/connexion', pageCss: 'app.css', error: 'E-mail ou mot de passe incorrect.', values: { email }, suite }));
  }
  req.session.userId = user.id;
  res.redirect(suite && suite.startsWith('/') ? suite : '/app');
});

// ── LOGOUT ──
router.post('/deconnexion', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ── DASHBOARD ──
router.get('/app', auth.requireAuth, (req, res) => {
  const properties = store.listByUser(req.currentUser.id);
  const evaluations = properties.map((p) => ({ property: p, ...compliance.evaluate(p) }));
  const summary = compliance.summarize(evaluations);
  const alerts = evaluations
    .flatMap((e) => e.alerts)
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critique' ? -1 : 1));
  res.render('app/dashboard', pageContext({
    title: `Tableau de bord — ${SITE.name}`,
    canonical: '/app', pageCss: 'app.css',
    evaluations, summary, alerts,
    STATUS_LABEL: compliance.STATUS_LABEL,
  }));
});

// ── NEW PROPERTY ──
router.get('/app/biens/nouveau', auth.requireAuth, (req, res) => {
  res.render('app/property-form', pageContext({
    title: `Ajouter un bien — ${SITE.name}`, canonical: '/app/biens/nouveau', pageCss: 'app.css',
    mode: 'create', property: { type: 'principale', platforms: [] }, communes: communes.options(), error: null,
  }));
});

router.post('/app/biens', auth.requireAuth, (req, res) => {
  const data = parseProperty(req.body);
  if (!data.name) {
    return res.status(400).render('app/property-form', pageContext({ title: `Ajouter un bien — ${SITE.name}`, canonical: '/app/biens/nouveau', pageCss: 'app.css', mode: 'create', property: data, communes: communes.options(), error: 'Le nom du bien est obligatoire.' }));
  }
  const p = store.createProperty({ ...data, userId: req.currentUser.id });
  res.redirect('/app/biens/' + p.id);
});

// ── SEED EXAMPLES (empty-state helper) ──
// Defined before the "/:id" routes so "exemples" isn't captured as an id.
router.post('/app/biens/exemples', auth.requireAuth, (req, res) => {
  const uid = req.currentUser.id;
  const today = new Date();
  const recent = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().slice(0, 10);
  const old = new Date(today.getFullYear() - 11, today.getMonth(), today.getDate()).toISOString().slice(0, 10);
  const samples = [
    { name: 'Appartement Bellecour', commune: 'lyon', type: 'principale', address: 'Place Bellecour, Lyon 2e', registrationNumber: '69ABC12345', platforms: ['airbnb', 'booking'], daysRented: 64, dpeClass: 'C', dpeDate: recent },
    { name: 'Studio Croix-Rousse', commune: 'lyon', type: 'principale', address: 'Bd de la Croix-Rousse, Lyon 4e', registrationNumber: '69DEF67890', platforms: ['airbnb'], daysRented: 118, dpeClass: 'D', dpeDate: recent },
    { name: 'Loft Confluence', commune: 'lyon', type: 'principale', address: 'Quai Perrache, Lyon 2e', registrationNumber: '', platforms: ['airbnb', 'abritel'], daysRented: 41, dpeClass: 'F', dpeDate: old },
    { name: 'Villa Biarritz', commune: 'pays-basque', type: 'secondaire', address: 'Av. de la Plage, Biarritz', registrationNumber: '64GHI24680', changementUsage: false, platforms: ['booking'], daysRented: 0, dpeClass: 'B', dpeDate: recent },
  ];
  samples.forEach((s) => store.createProperty({ ...s, userId: uid }));
  res.redirect('/app');
});

// ── PROPERTY DETAIL ──
router.get('/app/biens/:id', auth.requireAuth, (req, res) => {
  const p = ownProperty(req);
  if (!p) return res.status(404).render('404', pageContext({ title: `Introuvable — ${SITE.name}`, canonical: req.path }));
  const evaluation = compliance.evaluate(p);
  res.render('app/property-detail', pageContext({
    title: `${p.name} — ${SITE.name}`, canonical: '/app/biens/' + p.id, pageCss: 'app.css',
    property: p, evaluation, STATUS_LABEL: compliance.STATUS_LABEL,
  }));
});

// ── EDIT PROPERTY ──
router.get('/app/biens/:id/modifier', auth.requireAuth, (req, res) => {
  const p = ownProperty(req);
  if (!p) return res.status(404).render('404', pageContext({ title: `Introuvable — ${SITE.name}`, canonical: req.path }));
  res.render('app/property-form', pageContext({
    title: `Modifier ${p.name} — ${SITE.name}`, canonical: '/app/biens/' + p.id + '/modifier', pageCss: 'app.css',
    mode: 'edit', property: p, communes: communes.options(), error: null,
  }));
});

router.post('/app/biens/:id', auth.requireAuth, (req, res) => {
  const p = ownProperty(req);
  if (!p) return res.status(404).render('404', pageContext({ title: `Introuvable — ${SITE.name}`, canonical: req.path }));
  const data = parseProperty(req.body);
  if (!data.name) {
    return res.status(400).render('app/property-form', pageContext({ title: `Modifier — ${SITE.name}`, canonical: '/app/biens/' + p.id + '/modifier', pageCss: 'app.css', mode: 'edit', property: { ...data, id: p.id }, communes: communes.options(), error: 'Le nom du bien est obligatoire.' }));
  }
  store.updateProperty(p.id, data);
  res.redirect('/app/biens/' + p.id);
});

// ── DELETE PROPERTY ──
router.post('/app/biens/:id/supprimer', auth.requireAuth, (req, res) => {
  const p = ownProperty(req);
  if (p) store.deleteProperty(p.id);
  res.redirect('/app');
});

module.exports = router;
