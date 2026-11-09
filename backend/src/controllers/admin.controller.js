const Order = require('../models/Order');
const PartyRequest = require('../models/PartyRequest');
const Outlet = require('../models/Outlet');
const { scope } = require('./order.controller');
const { broadcastOrder } = require('../services/realtime');
function summary(orders) {
  const prepared = orders.filter((o) => o.events.some((e) => e.status === 'ready'));
  const customers = new Map();
  for (const o of orders.filter((o) => o.status !== 'cancelled'))
    customers.set(String(o.user), (customers.get(String(o.user)) || 0) + 1);
  return {
    totalOrders: orders.length,
    revenuePaise: orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((s, o) => s + o.totalPaise, 0),
    active: orders.filter((o) => ['confirmed', 'preparing', 'ready'].includes(o.status)).length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
    repeatCustomers: [...customers.values()].filter((n) => n > 1).length,
    completed: orders.filter((o) => o.status === 'handed_off').length,
    averagePrepMinutes: prepared.length
      ? Math.round(
          prepared.reduce(
            (s, o) =>
              s +
              Math.max(
                0,
                (new Date(o.events.find((e) => e.status === 'ready').at) -
                  new Date(o.events.find((e) => e.status === 'confirmed')?.at || o.createdAt)) /
                  60000
              ),
            0
          ) / prepared.length
        )
      : null,
  };
}
exports.dashboard = async (req, res) => {
  const orders = await Order.find(scope(req.user)).populate('outlet').lean();
  const outlets = await Outlet.find(
    req.user.role === 'kitchen' ? { _id: req.user.outlet } : {}
  ).lean();
  res.json({
    ...summary(orders),
    outlets: outlets.map((o) => ({
      ...o,
      ...summary(orders.filter((r) => String(r.outlet?._id) === String(o._id))),
    })),
    orders: orders.sort((a, b) => b.createdAt - a.createdAt).slice(0, 30),
  });
};
exports.partyCreate = async (req, res) => {
  if (new Date(req.body.date).getTime() < Date.now() + 48 * 3600000)
    return res.status(400).json({ message: 'Party orders need at least 48 hours’ notice.' });
  if (!(await Outlet.exists({ _id: req.body.outlet, active: true })))
    return res.status(400).json({ message: 'Choose an active outlet.' });
  const request = await PartyRequest.create({
    ...req.body,
    name: req.user.name,
    user: req.user._id,
  });
  broadcastOrder(request, 'party.changed');
  res.status(201).json({ request });
};
exports.partyList = async (req, res) =>
  res.json({
    requests: await PartyRequest.find(
      req.user.role === 'customer'
        ? { user: req.user._id }
        : req.user.role === 'kitchen'
          ? { outlet: req.user.outlet }
          : {}
    )
      .populate('outlet')
      .sort({ createdAt: -1 }),
  });
exports.partyUpdate = async (req, res) => {
  const query = {
    _id: req.params.id,
    ...(req.user.role === 'kitchen' ? { outlet: req.user.outlet } : {}),
  };
  const request = await PartyRequest.findOneAndUpdate(
    query,
    { status: req.body.status },
    { returnDocument: 'after' }
  );
  if (!request) return res.status(404).json({ message: 'Request not found.' });
  broadcastOrder(request, 'party.changed');
  res.json({ request });
};
