const router = require('express').Router();
const { rateLimit } = require('express-rate-limit');
const { truncates } = require('bcryptjs');
const { validate, z } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const c = require('../controllers/auth.controller');
const limiter = rateLimit({
  windowMs: 15 * 60000,
  limit: 40,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
});
const email = z.string().trim().email().max(180);
const password = (minimum) =>
  z
    .string()
    .min(minimum)
    .refine((value) => !truncates(value), 'Use at most 72 bytes.');
router.post('/login', limiter, validate(z.object({ email, password: password(1) })), c.login);
router.post(
  '/register',
  limiter,
  validate(
    z.object({
      name: z.string().trim().min(2).max(80),
      email,
      password: password(10),
      consent: z.literal(true),
      marketingOptIn: z.boolean().default(false),
    })
  ),
  c.register
);
router.get('/me', authenticate, c.me);
router.post('/logout', c.logout);
module.exports = router;
