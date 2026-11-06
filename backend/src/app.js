const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('node:path');
const fs = require('node:fs');
const { rateLimit } = require('express-rate-limit');
const env = require('./config/env');
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', env.production ? 1 : false);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", ...env.origins, ...env.origins.map((o) => o.replace(/^http/, 'ws'))],
        fontSrc: ["'self'"],
      },
    },
  })
);
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || env.origins.includes(origin)),
    credentials: true,
  })
);
app.use(express.json({ limit: '128kb' }));
app.use(
  '/api',
  rateLimit({
    windowMs: 60000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Please slow down and try again.' },
  })
);
app.use('/api', (req, res, next) => {
  if (
    ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) &&
    req.headers.origin &&
    !env.origins.includes(req.headers.origin)
  )
    return res.status(403).json({ message: 'This origin is not permitted.' });
  res.set('Cache-Control', 'no-store');
  next();
});
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', demo: env.seedDemo, payments: 'simulated' })
);
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/menu', require('./routes/menu.routes'));
app.use('/api/orders', require('./routes/order.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api', (req, res) => res.status(404).json({ message: 'API endpoint not found.' }));
const frontend = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontend)) {
  app.use(express.static(frontend));
  app.get('/{*path}', (req, res) => res.sendFile(path.join(frontend, 'index.html')));
}
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.code === 11000)
    return res.status(409).json({ message: 'That email or request already exists.' });
  const status =
    error.status || (['ValidationError', 'CastError'].includes(error.name) ? 400 : 500);
  if (status >= 500) console.error('Request failed:', error.message);
  res
    .status(status)
    .json({ message: status >= 500 ? 'Something went wrong. Please retry.' : error.message });
});
module.exports = app;
