const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { validate, id, z } = require('../middleware/validate.middleware');
const { CATEGORIES } = require('../config/constants');
const c = require('../controllers/menu.controller');
router.get('/', c.list);
router.get('/nearest', c.nearest);
router.get('/recommendations', authenticate, requireRole('customer'), c.recommendations);
router.get('/admin', authenticate, requireRole('admin', 'kitchen'), c.adminList);
const menuSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().max(400),
    category: z.enum(CATEGORIES),
    image: z.string().regex(/^\/images\/[a-z0-9.-]+$/i, 'Use a bundled image path'),
    vegetarian: z.boolean(),
    spice: z.enum(['Mild', 'Medium', 'Hot']),
    allergens: z.array(z.string().max(40)).max(12),
    badge: z.string().max(40).default(''),
    prepMinutes: z.number().int().min(2).max(90),
    pricePaise: z.number().int().min(100).max(1000000),
    cityPrices: z.record(z.string(), z.number().int().min(100).max(1000000)).default({}),
    portions: z
      .array(z.object({ name: z.string().min(1).max(40), multiplier: z.number().min(0.5).max(10) }))
      .min(1)
      .max(5),
    addons: z
      .array(
        z.object({
          name: z.string().min(1).max(40),
          pricePaise: z.number().int().min(0).max(50000),
        })
      )
      .max(10),
    active: z.boolean(),
    availableFrom: z.number().int().min(0).max(23),
    availableUntil: z.number().int().min(1).max(24),
  })
  .refine((d) => d.availableFrom !== d.availableUntil, 'Menu start and end times must differ');
router.post('/', authenticate, requireRole('admin'), validate(menuSchema), c.save);
router.put('/:id', authenticate, requireRole('admin'), validate(menuSchema), c.save);
router.patch(
  '/:id/availability',
  authenticate,
  requireRole('admin', 'kitchen'),
  validate(z.object({ available: z.boolean(), outlet: id.optional() })),
  c.availability
);
module.exports = router;
