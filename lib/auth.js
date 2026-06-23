/**
 * Authentication helpers — password hashing (scrypt, built-in crypto) and
 * Express middleware. No external crypto dependency.
 */
const crypto = require('crypto');
const store = require('./store');

// Hash format: scrypt$<saltHex>$<keyHex>
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(password), salt, 64);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith('scrypt$')) return false;
  const [, saltHex, keyHex] = stored.split('$');
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(keyHex, 'hex');
  const actual = crypto.scryptSync(String(password), salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// Attaches req.currentUser (or null) and res.locals.currentUser for views.
function attachUser(req, res, next) {
  const id = req.session && req.session.userId;
  req.currentUser = id ? store.getUser(id) : null;
  res.locals.currentUser = req.currentUser;
  next();
}

// Guards a route: redirects to login if not signed in.
function requireAuth(req, res, next) {
  if (req.currentUser) return next();
  return res.redirect('/connexion?suite=' + encodeURIComponent(req.originalUrl));
}

module.exports = { hashPassword, verifyPassword, attachUser, requireAuth };
