/**
 * Stripe billing helpers — webhook verification + plan mapping.
 *
 * Verification is done with Node's built-in crypto (no Stripe SDK dependency),
 * implementing Stripe's documented signature scheme:
 *   signed_payload = `${t}.${rawBody}`
 *   expected       = HMAC_SHA256(secret, signed_payload)  // hex
 * compared in constant time against the `v1` signatures in `Stripe-Signature`.
 */
const crypto = require('crypto');

// Map a Checkout amount (in cents) to our plan key. Mirrors routes/tarifs.js.
const PLAN_BY_AMOUNT = { 8900: 'starter', 14900: 'professionnel', 24900: 'premium' };
const PLAN_LABEL = { starter: 'Starter', professionnel: 'Professionnel', premium: 'Premium' };

function verifyWebhook(rawBody, sigHeader, secret, toleranceSec = 300) {
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  if (!sigHeader) throw new Error('missing Stripe-Signature header');

  let t = null;
  const v1 = [];
  sigHeader.split(',').forEach((kv) => {
    const idx = kv.indexOf('=');
    if (idx === -1) return;
    const k = kv.slice(0, idx).trim();
    const v = kv.slice(idx + 1).trim();
    if (k === 't') t = v;
    else if (k === 'v1') v1.push(v);
  });
  if (!t || v1.length === 0) throw new Error('malformed Stripe-Signature header');

  const payload = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${payload}`, 'utf8').digest('hex');
  const expBuf = Buffer.from(expected);
  const match = v1.some((sig) => {
    const sigBuf = Buffer.from(sig);
    return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
  });
  if (!match) throw new Error('signature verification failed');

  if (toleranceSec > 0) {
    const age = Math.abs(Date.now() / 1000 - Number(t));
    if (!Number.isFinite(age) || age > toleranceSec) throw new Error('timestamp outside tolerance');
  }
  return JSON.parse(payload);
}

function planFromAmount(amount) { return PLAN_BY_AMOUNT[amount] || null; }
function planFromSession(session) {
  return (session.metadata && session.metadata.plan) || planFromAmount(session.amount_total);
}

module.exports = { verifyWebhook, planFromAmount, planFromSession, PLAN_BY_AMOUNT, PLAN_LABEL };
