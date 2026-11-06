const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { validate, id, z } = require('../middleware/validate.middleware');
const c = require('../controllers/admin.controller');
router.use(authenticate);
router.get('/dashboard', requireRole('admin', 'kitchen'), c.dashboard);
router.get('/party', c.partyList);
router.post(
  '/party',
  requireRole('customer'),
  validate(
    z.object({
      outlet: id,
      guests: z.number().int().min(10).max(1000),
      date: z.iso.datetime(),
      notes: z.string().min(5).max(1000),
    })
  ),
  c.partyCreate
);
router.patch(
  '/party/:id',
  requireRole('admin', 'kitchen'),
  validate(z.object({ status: z.enum(['confirmed', 'declined']) })),
  c.partyUpdate
);
module.exports = router;
