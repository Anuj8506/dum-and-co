const bcrypt = require('bcryptjs');
const { randomBytes } = require('node:crypto');
const User = require('../models/User');
const env = require('../config/env');
const { sessionCookie, revokeSession, isDemoEmail } = require('../middleware/auth.middleware');
const { closeRealtimeSession } = require('../services/realtime');

// Use the same password work factor whether or not an email exists.
const dummyHash = bcrypt.hashSync(randomBytes(32).toString('hex'), 12);
const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  outlet: user.outlet,
  points: user.points,
  marketingOptIn: user.marketingOptIn,
});

exports.register = async (req, res) => {
  const { name, email, password, marketingOptIn } = req.body;
  if (isDemoEmail(email.toLowerCase()))
    return res.status(400).json({ message: 'Choose an email outside the reserved demo domain.' });
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password: await bcrypt.hash(password, 12),
    marketingOptIn,
    consentAt: new Date(),
  });
  sessionCookie(res, user);
  res.status(201).json({ user: publicUser(user) });
};
exports.login = async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+password');
  const matches = await bcrypt.compare(req.body.password, user?.password ?? dummyHash);
  if (!user || !matches || (!env.seedDemo && isDemoEmail(user.email)))
    return res.status(401).json({ message: 'Email or password is incorrect.' });
  sessionCookie(res, user);
  res.json({ user: publicUser(user) });
};
exports.me = (req, res) => res.json({ user: publicUser(req.user) });
exports.logout = async (req, res) => {
  const sessionKey = await revokeSession(req, res);
  if (sessionKey) closeRealtimeSession(sessionKey);
  res.json({ message: 'Signed out.' });
};
