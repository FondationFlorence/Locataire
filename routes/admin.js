/**
 * Admin metrics — GET /admin
 *
 * Business dashboard for the operator (you): accounts, subscriptions, MRR,
 * portfolio compliance. Gated by ADMIN_EMAILS (comma-separated allowlist);
 * non-admins get a 404 so the route isn't discoverable.
 */
const express = require('express');
const { SITE, pageContext } = require('../lib/site');
const store = require('../lib/store');
const auth = require('../lib/auth');
const billing = require('../lib/billing');
const compliance = require('../lib/compliance');

const router = express.Router();
const DAY = 86400000;

router.get('/admin', auth.requireAuth, (req, res) => {
  if (!auth.isAdmin(req.currentUser)) {
    return res.status(404).render('404', pageContext({ title: `Page introuvable — ${SITE.name}`, canonical: req.path }));
  }

  const users = store.allUsers();
  const props = store.allProperties();
  const pending = store.allPendingSubscriptions();
  const now = Date.now();
  const within = (d, ts) => ts && (now - new Date(ts).getTime()) <= d * DAY;

  // Subscriptions
  const active = users.filter((u) => u.subscription && u.subscription.status === 'active');
  const canceled = users.filter((u) => u.subscription && u.subscription.status === 'canceled');
  const byPlan = { starter: 0, professionnel: 0, premium: 0 };
  active.forEach((u) => { if (byPlan[u.subscription.plan] != null) byPlan[u.subscription.plan]++; });
  const mrr = active.reduce((s, u) => s + (billing.PLAN_PRICE[u.subscription.plan] || 0), 0);

  // Compliance distribution across all properties
  const dist = { ok: 0, attention: 0, critique: 0 };
  props.forEach((p) => { dist[compliance.evaluate(p).status]++; });

  // Communes distribution
  const byCommuneMap = {};
  props.forEach((p) => { const k = p.communeLabel || p.commune || '—'; byCommuneMap[k] = (byCommuneMap[k] || 0) + 1; });
  const byCommune = Object.entries(byCommuneMap).sort((a, b) => b[1] - a[1]);

  const recent = users.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 12);

  const metrics = {
    users: { total: users.length, last7: users.filter((u) => within(7, u.createdAt)).length, last30: users.filter((u) => within(30, u.createdAt)).length },
    properties: { total: props.length, last30: props.filter((p) => within(30, p.createdAt)).length, perUser: users.length ? (props.length / users.length) : 0 },
    subs: { active: active.length, canceled: canceled.length, pending: pending.length, byPlan, mrr, arr: mrr * 12 },
    dist, byCommune, recent,
  };

  res.render('app/admin', pageContext({
    title: `Admin — ${SITE.name}`, canonical: '/admin', pageCss: 'app.css',
    navActive: 'admin', metrics, PLAN_LABEL: billing.PLAN_LABEL, STATUS_LABEL: compliance.STATUS_LABEL,
  }));
});

module.exports = router;
