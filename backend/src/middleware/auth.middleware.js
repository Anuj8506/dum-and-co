const jwt = require('jsonwebtoken');
const { createHash, randomUUID } = require('node:crypto');
const User = require('../models/User');
const RevokedSession = require('../models/RevokedSession');
const env = require('../config/env');

const cookieOptions = { httpOnly: true, secure: env.production, sameSite: 'lax', path: '/' };
const isDemoEmail = (email) => email.endsWith('@dumco.example');

function readToken(req) {
  const match = (req.headers.cookie || '')
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith('dum_session='));
  return match ? decodeURIComponent(match.slice('dum_session='.length)) : null;
}
function readSession(req) {
  try {
    const token = readToken(req);
    if (!token) return null;
    const payload = jwt.verify(token, env.secret, {
      algorithms: ['HS256'],
      issuer: 'dumco',
    });
    if (
      typeof payload.id !== 'string' ||
      !/^[a-f0-9]{24}$/i.test(payload.id) ||
      !Number.isSafeInteger(payload.exp)
    )
      return null;
    return {
      userId: payload.id,
      key: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(payload.exp * 1000),
    };
  } catch {
    return null;
  }
}
async function loadActiveSession(session) {
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  const user = await User.findById(session.userId);
  if (!user || (!env.seedDemo && isDemoEmail(user.email))) return null;
  if (await RevokedSession.exists({ _id: session.key })) return null;
  return { ...session, user };
}
function activeSession(req) {
  return loadActiveSession(readSession(req));
}
function realtimeTicket(session) {
  return jwt.sign(
    { id: session.userId, key: session.key, sessionExpires: session.expiresAt.getTime() },
    env.secret,
    { algorithm: 'HS256', issuer: 'dumco-realtime', expiresIn: 30 }
  );
}
function realtimeSession(req) {
  const header = req.headers['sec-websocket-protocol'];
  if (!header) return activeSession(req);
  const protocols = header.split(',').map((value) => value.trim());
  const [channel, proof] = protocols;
  if (protocols.length !== 2 || channel !== 'dumco' || !proof.startsWith('ticket.')) return null;
  try {
    const { id, key, sessionExpires } = jwt.verify(proof.slice('ticket.'.length), env.secret, {
      algorithms: ['HS256'],
      issuer: 'dumco-realtime',
    });
    return loadActiveSession({ userId: id, key, expiresAt: new Date(sessionExpires) });
  } catch {
    return null;
  }
}
async function authenticate(req, res, next) {
  const session = await activeSession(req);
  if (!session) return res.status(401).json({ message: 'Please sign in to continue.' });
  req.user = session.user;
  req.session = session;
  next();
}
const requireRole =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user.role)
      ? next()
      : res.status(403).json({ message: 'You do not have access to this workspace.' });
function sessionCookie(res, user) {
  const token = jwt.sign({ id: user.id }, env.secret, {
    algorithm: 'HS256',
    expiresIn: '12h',
    issuer: 'dumco',
    jwtid: randomUUID(),
  });
  res.cookie('dum_session', token, { ...cookieOptions, maxAge: 12 * 60 * 60 * 1000 });
}
async function revokeSession(req, res) {
  const session = readSession(req);
  if (session) {
    await RevokedSession.updateOne(
      { _id: session.key },
      { $setOnInsert: { expiresAt: session.expiresAt } },
      { upsert: true }
    );
  }
  res.clearCookie('dum_session', cookieOptions);
  return session?.key;
}
module.exports = {
  authenticate,
  requireRole,
  realtimeTicket,
  realtimeSession,
  sessionCookie,
  revokeSession,
  isDemoEmail,
};
