const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sessionCookie } = require('../middleware/auth.middleware');
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
  if (!user || !(await bcrypt.compare(req.body.password, user.password)))
    return res.status(401).json({ message: 'Email or password is incorrect.' });
  sessionCookie(res, user);
  res.json({ user: publicUser(user) });
};
exports.me = (req, res) => res.json({ user: publicUser(req.user) });
exports.logout = (req, res) => {
  res.clearCookie('dum_session', { path: '/' });
  res.json({ message: 'Signed out.' });
};
