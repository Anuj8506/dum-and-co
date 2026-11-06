const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { validate, id, z } = require('../middleware/validate.middleware');
const c = require('../controllers/order.controller');
router.use(authenticate);
router.get('/', c.list);
router.get('/:id', c.get);
router.post(
  '/',
  requireRole('customer'),
  validate(
    z.object({
      outlet: id,
      idempotencyKey: z.string().uuid(),
      items: z
        .array(
          z.object({
            menuItem: id,
            portion: z.string().max(40),
            addons: z.array(z.string().max(40)).max(10).default([]),
            quantity: z.number().int().min(1).max(20),
          })
        )
        .min(1)
        .max(30),
      coupon: z.string().trim().toUpperCase().max(20).default(''),
      redeemPoints: z.boolean().default(false),
      fulfilment: z.enum(['pickup', 'delivery']).default('pickup'),
      deliveryAddress: z.string().max(300).default(''),
      location: z
        .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
        .optional(),
      instructions: z.string().max(300).default(''),
    })
  ),
  c.create
);
router.post(
  '/:id/payment',
  requireRole('customer'),
  validate(z.object({ outcome: z.enum(['success', 'failed']), method: z.enum(['UPI', 'Card']) })),
  c.payment
);
router.patch(
  '/:id',
  requireRole('kitchen', 'admin'),
  validate(
    z.union([
      z.object({ status: z.enum(['preparing', 'ready', 'handed_off', 'cancelled']) }),
      z.object({
        overrideMinutes: z.number().int().min(1).max(180),
        reason: z.string().trim().min(5).max(200),
      }),
    ])
  ),
  c.update
);
module.exports = router;
