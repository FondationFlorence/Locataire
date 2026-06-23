/**
 * Persistence — a small JSON-file store for users and properties.
 *
 * Deliberately dependency-free. Data lives in DATA_DIR/db.json. For production
 * durability, set DATA_DIR to a persistent volume (e.g. a Render disk) or swap
 * this module for a managed database — the public API below is what the rest of
 * the app depends on.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

let db = { users: [], properties: [], pendingSubscriptions: [] };

function load() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      db = {
        users: parsed.users || [],
        properties: parsed.properties || [],
        pendingSubscriptions: parsed.pendingSubscriptions || [],
      };
    }
  } catch (e) {
    console.error('store: failed to load db, starting empty —', e.message);
    db = { users: [], properties: [], pendingSubscriptions: [] };
  }
}

function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE); // atomic replace
}

load();

// ── Users ──
function findUserByEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  return db.users.find((u) => u.email === e) || null;
}
function getUser(id) { return db.users.find((u) => u.id === id) || null; }
function createUser({ email, passwordHash, name }) {
  const user = {
    id: crypto.randomUUID(),
    email: String(email).trim().toLowerCase(),
    name: name || '',
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  save();
  return user;
}

// ── Properties ──
function listByUser(userId) {
  return db.properties
    .filter((p) => p.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
function getProperty(id) { return db.properties.find((p) => p.id === id) || null; }
function createProperty(data) {
  const now = new Date().toISOString();
  const property = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...data };
  db.properties.push(property);
  save();
  return property;
}
function updateProperty(id, patch) {
  const p = getProperty(id);
  if (!p) return null;
  Object.assign(p, patch, { updatedAt: new Date().toISOString() });
  save();
  return p;
}
function deleteProperty(id) {
  const i = db.properties.findIndex((p) => p.id === id);
  if (i === -1) return false;
  db.properties.splice(i, 1);
  save();
  return true;
}

// ── Subscriptions ──
function setUserSubscription(userId, subscription) {
  const u = getUser(userId);
  if (!u) return null;
  u.subscription = subscription;
  save();
  return u;
}
function findUserByStripeCustomerId(id) {
  if (!id) return null;
  return db.users.find((u) => u.subscription && u.subscription.stripeCustomerId === id) || null;
}
function findUserBySubscriptionId(id) {
  if (!id) return null;
  return db.users.find((u) => u.subscription && u.subscription.subscriptionId === id) || null;
}

// Pending subscriptions: a payment arrived before the account existed. Keyed by
// email so signup can claim it. Latest wins for a given email.
function addPendingSubscription(email, subscription) {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return;
  db.pendingSubscriptions = db.pendingSubscriptions.filter((p) => p.email !== e);
  db.pendingSubscriptions.push({ email: e, subscription, at: new Date().toISOString() });
  save();
}
function takePendingSubscription(email) {
  const e = String(email || '').trim().toLowerCase();
  const i = db.pendingSubscriptions.findIndex((p) => p.email === e);
  if (i === -1) return null;
  const [found] = db.pendingSubscriptions.splice(i, 1);
  save();
  return found.subscription;
}

function countUsers() { return db.users.length; }

module.exports = {
  findUserByEmail, getUser, createUser,
  listByUser, getProperty, createProperty, updateProperty, deleteProperty,
  setUserSubscription, findUserByStripeCustomerId, findUserBySubscriptionId,
  addPendingSubscription, takePendingSubscription,
  countUsers, DATA_DIR,
};
