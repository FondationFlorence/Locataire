/**
 * Pricing routes — /tarifs and /confirmation.
 *
 * Owns: rendering the pricing page (with Stripe Checkout links) and the
 * post-payment confirmation page.
 * Does NOT own: Stripe webhook handling or subscription state.
 *
 * Stripe success URL: configure each Checkout link to redirect to
 * /confirmation?plan=<key> so the confirmation page can show the right plan.
 */
const express = require('express');
const { SITE, pageContext } = require('../lib/site');

const router = express.Router();

// Live Stripe Checkout subscription links (monthly billing).
const STRIPE_LINKS = {
  starter: 'https://buy.stripe.com/00w9AT2lR89984ZcZ60kE0c',
  professionnel: 'https://buy.stripe.com/eVq9AT1hN755etn6AI0kE0d',
  premium: 'https://buy.stripe.com/5kQ6oH9Ojdtt84ZaQY0kE0e',
};

// Plan metadata, used by both the pricing grid and the confirmation page.
const PLANS = {
  starter: { name: 'Starter', lots: '1 à 20 lots', price: '89 €/mois' },
  professionnel: { name: 'Professionnel', lots: '21 à 50 lots', price: '149 €/mois' },
  premium: { name: 'Premium', lots: '51 à 100 lots', price: '249 €/mois' },
};

// GET /tarifs — pricing page
router.get('/', (_req, res) => {
  res.render('tarifs', pageContext({
    title: `Tarifs — ${SITE.name}`,
    description:
      'Tarification simple par nombre de lots. Starter, Professionnel, Premium — ' +
      'choisissez le plan adapté à votre portefeuille. Sans engagement.',
    canonical: '/tarifs',
    pageCss: 'tarifs.css',
    navActive: 'tarifs',
    starterLink: STRIPE_LINKS.starter,
    proLink: STRIPE_LINKS.professionnel,
    premiumLink: STRIPE_LINKS.premium,
  }));
});

/**
 * Renders the confirmation page. Exported separately so server.js can mount
 * it at /confirmation without nesting it under /tarifs.
 */
function renderConfirmation(req, res) {
  const planKey = req.query.plan || 'professionnel';
  const plan = PLANS[planKey] || PLANS.professionnel;
  res.render('confirmation', pageContext({
    title: `Bienvenue — ${SITE.name}`,
    description: 'Votre abonnement est en cours d’activation.',
    canonical: '/confirmation',
    pageCss: 'confirmation.css',
    planName: plan.name,
    planLots: plan.lots,
    planPrice: plan.price,
  }));
}

module.exports = router;
module.exports.renderConfirmation = renderConfirmation;
