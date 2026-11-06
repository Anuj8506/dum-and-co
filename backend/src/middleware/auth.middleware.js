const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');

function readToken(req) {
  const match = (req.headers.cookie || '')
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith('dum_session='));
  return match ? decodeURIComponent(match.slice('dum_session='.length)) : null;
}
async function authenticate(req, res, next) {
  try {
    const payload = jwt.verify(readToken(req) || '', env.secret, {
      algorithms: ['HS256'],
      issuer: 'dumco',
    });
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'Please sign in again.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Please sign in to continue.' });
  }
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
  });
  res.cookie('dum_session', token, {
    httpOnly: true,
    secure: env.production,
    sameSite: 'lax',
    maxAge: 12 * 60 * 60 * 1000,
    path: '/',
  });
}
module.exports = { authenticate, requireRole, readToken, sessionCookie };
