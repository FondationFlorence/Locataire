/**
 * Stripe webhook — POST /webhooks/stripe
 *
 * Source of truth for subscription activation. Mounted with a raw-body parser
 * (before express.json) so the signature can be verified against the exact bytes
 * Stripe sent.
 *
 * Provisioning:
 *  - checkout.session.completed → activate the matching account, or stash a
 *    pending subscription (keyed by email) the account claims at signup.
 *  - customer.subscription.deleted → mark the account's subscription canceled.
 */
const billing = require('../lib/billing');
const store = require('../lib/store');

module.exports = function stripeWebhook(req, res) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('Stripe webhook received but STRIPE_WEBHOOK_SECRET is not set — ignoring.');
    return res.status(503).json({ error: 'webhook not configured' });
  }

  let event;
  try {
    event = billing.verifyWebhook(req.body, req.headers['stripe-signature'], secret);
  } catch (e) {
    console.warn('Stripe webhook signature rejected:', e.message);
    return res.status(400).json({ error: 'invalid signature' });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object || {};
      const email = (s.customer_details && s.customer_details.email) || s.customer_email;
      const subscription = {
        plan: billing.planFromSession(s),
        status: 'active',
        stripeCustomerId: s.customer || null,
        subscriptionId: s.subscription || null,
        since: new Date().toISOString(),
      };
      if (email) {
        const user = store.findUserByEmail(email);
        if (user) store.setUserSubscription(user.id, subscription);
        else store.addPendingSubscription(email, subscription);
        console.log(`Stripe: provisioned ${subscription.plan || 'unknown plan'} for ${email} (${user ? 'existing user' : 'pending'})`);
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object || {};
      const user = store.findUserBySubscriptionId(sub.id) || store.findUserByStripeCustomerId(sub.customer);
      if (user) {
        store.setUserSubscription(user.id, { ...(user.subscription || {}), status: 'canceled', canceledAt: new Date().toISOString() });
        console.log(`Stripe: canceled subscription for ${user.email}`);
      }
    }
  } catch (e) {
    console.error('Stripe webhook handling error:', e.message);
    // Still acknowledge so Stripe doesn't retry a payload we can't process.
  }

  res.json({ received: true });
};
