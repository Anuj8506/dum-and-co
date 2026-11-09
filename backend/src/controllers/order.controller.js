const mongoose = require('mongoose');
const crypto = require('node:crypto');
const Order = require('../models/Order');
const Outlet = require('../models/Outlet');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const { STAGES } = require('../config/constants');
const { unitPrice, totals, isAvailable, indiaHour, haversine } = require('../services/pricing');
const { predictPrep } = require('../algorithms/prepTime');
const { broadcastOrder } = require('../services/realtime');
const problem = (message, status = 400) => Object.assign(new Error(message), { status });
const scope = (user) => {
  if (user.role === 'admin') return { paymentStatus: 'paid' };
  if (user.role === 'kitchen') return { outlet: user.outlet, paymentStatus: 'paid' };
  return { user: user._id };
};
const populated = (order) => Order.findById(order._id).populate('outlet').populate('user', 'name');

exports.list = async (req, res) => {
  const staff = req.user.role !== 'customer';
  const activeFilter = {
    ...scope(req.user),
    status: { $in: ['confirmed', 'preparing', 'ready'] },
  };
  const active = staff
    ? await Order.find(activeFilter).populate('outlet').populate('user', 'name')
    : [];
  const history = await Order.find({
    ...scope(req.user),
    ...(staff ? { status: { $nin: ['confirmed', 'preparing', 'ready'] } } : {}),
  })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('outlet')
    .populate('user', 'name');
  const orders = [...active, ...history].sort((a, b) => b.createdAt - a.createdAt);
  res.json({ orders });
};
exports.get = async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, ...scope(req.user) })
    .populate('outlet')
    .populate('user', 'name');
  if (!order) throw problem('Order not found.', 404);
  res.json({ order });
};
async function estimate(outlet, items) {
  const queue = await Order.find({
    outlet: outlet._id,
    paymentStatus: 'paid',
    status: { $in: ['confirmed', 'preparing'] },
  }).lean();
  return predictPrep({
    longestPrep: Math.max(...items.map((i) => i.prepMinutes)),
    queueUnits: queue.reduce((s, o) => s + o.items.reduce((q, i) => q + i.quantity, 0), 0),
    portions: items.reduce((s, i) => s + i.quantity, 0),
    capacity: outlet.capacity,
    minimumMinutes: outlet.minimumMinutes,
    hour: indiaHour(),
  });
}
exports.create = async (req, res) => {
  const body = req.body;
  const requestHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
  const existing = await Order.findOne({ user: req.user._id, idempotencyKey: body.idempotencyKey });
  if (existing) {
    if (existing.requestHash !== requestHash)
      throw problem('Checkout key already used for another cart.', 409);
    return res.json({ order: await populated(existing) });
  }
  const outlet = await Outlet.findOne({ _id: body.outlet, active: true });
  if (!outlet) throw problem('This outlet is unavailable.');
  const deliveryAddress = body.fulfilment === 'delivery' ? body.deliveryAddress.trim() : '';
  if (body.fulfilment === 'delivery') {
    if (deliveryAddress.length < 8) throw problem('Please enter a complete delivery address.');
    if (!body.location) throw problem('Share your location so we can check the delivery radius.');
    if (haversine(body.location.lat, body.location.lng, outlet.lat, outlet.lng) > outlet.radiusKm)
      throw problem(
        'Your location is outside this outlet’s delivery radius. Choose pickup or another outlet.'
      );
  }
  const menu = await MenuItem.find({ _id: { $in: body.items.map((i) => i.menuItem) } });
  const items = body.items.map((line) => {
    const item = menu.find((i) => String(i._id) === line.menuItem);
    if (!item || !isAvailable(item, outlet._id, indiaHour()))
      throw problem(
        `${item?.name || 'An item'} is no longer available. Please update your cart.`,
        409
      );
    return {
      menuItem: item._id,
      name: item.name,
      portion: line.portion,
      addons: line.addons,
      quantity: line.quantity,
      prepMinutes: item.prepMinutes,
      unitPaise: unitPrice(item, line.portion, line.addons, outlet.city),
    };
  });
  // Prices and balances always come from the server; client-submitted totals are ignored.
  const points = body.redeemPoints ? Math.min(req.user.points, 100) : 0;
  const pricing = totals(items, body.coupon, points);
  const prediction = await estimate(outlet, items);
  try {
    const order = await Order.create({
      number: `DUM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      user: req.user._id,
      outlet: outlet._id,
      idempotencyKey: body.idempotencyKey,
      requestHash,
      items,
      ...pricing,
      coupon: body.coupon,
      fulfilment: body.fulfilment,
      deliveryAddress,
      instructions: body.instructions || '',
      estimate: prediction,
      events: [{ status: 'awaiting_payment', message: 'Order created. Waiting for demo payment.' }],
    });
    res.status(201).json({ order: await populated(order) });
  } catch (error) {
    if (error.code === 11000) {
      const duplicate = await Order.findOne({
        user: req.user._id,
        idempotencyKey: body.idempotencyKey,
      });
      if (duplicate?.requestHash === requestHash)
        return res.json({ order: await populated(duplicate) });
    }
    throw error;
  }
};
exports.payment = async (req, res) => {
  let result;
  let changed;
  await mongoose.connection.transaction(async (session) => {
    changed = false;
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id }).session(session);
    if (!order) throw problem('Order not found.', 404);
    if (order.paymentStatus === 'paid') {
      result = order;
      return;
    }
    if (order.status === 'cancelled') throw problem('This order was cancelled.', 409);
    if (Date.now() - order.createdAt.getTime() > 15 * 60000)
      throw problem('Checkout expired. Please create a new order.', 409);
    if (req.body.outcome === 'failed') {
      if (order.paymentStatus === 'failed') {
        result = order;
        return;
      }
      order.paymentStatus = 'failed';
      order.events.push({
        status: 'awaiting_payment',
        message: 'Demo payment failed. No charge was made; you can retry.',
      });
    } else {
      const outlet = await Outlet.findById(order.outlet).session(session);
      if (!outlet?.active) throw problem('The outlet is no longer taking orders.', 409);
      const menu = await MenuItem.find({
        _id: { $in: order.items.map((i) => i.menuItem) },
      }).session(session);
      for (const line of order.items) {
        const item = menu.find((i) => String(i._id) === String(line.menuItem));
        if (!item || !isAvailable(item, order.outlet, indiaHour()))
          throw problem(`${line.name} is unavailable. Please start a new checkout.`, 409);
      }
      if (order.pointsRedeemed) {
        const balance = await User.updateOne(
          { _id: req.user._id, points: { $gte: order.pointsRedeemed } },
          { $inc: { points: -order.pointsRedeemed } },
          { session }
        );
        if (!balance.modifiedCount)
          throw problem('Your reward balance changed. Please start a new checkout.', 409);
      }
      order.estimate = await estimate(outlet, order.items);
      order.paymentStatus = 'paid';
      order.paymentMethod = req.body.method;
      order.status = 'confirmed';
      order.promisedAt = new Date(Date.now() + order.estimate.minutes * 60000);
      order.originalPromisedAt = order.promisedAt;
      order.events.push({
        status: 'confirmed',
        message: 'Demo payment successful. Your order has reached the kitchen.',
      });
    }
    await order.save({ session });
    result = order;
    changed = true;
  });
  if (changed) broadcastOrder(result);
  res.json({ order: await populated(result), simulated: true });
};
exports.update = async (req, res) => {
  let result;
  await mongoose.connection.transaction(async (session) => {
    const order = await Order.findOne({ _id: req.params.id, ...scope(req.user) }).session(session);
    if (!order) throw problem('Paid order not found.', 404);
    if (req.body.overrideMinutes !== undefined) {
      if (['cancelled', 'handed_off'].includes(order.status))
        throw problem('This order is already closed.', 409);
      const outlet = await Outlet.findById(order.outlet).session(session);
      const minutes = Math.max(outlet.minimumMinutes, req.body.overrideMinutes);
      order.promisedAt = new Date(Date.now() + minutes * 60000);
      order.lateNotifiedAt = undefined;
      order.events.push({
        status: order.status,
        message: `Kitchen updated the promise to ${minutes} minutes from now. ${req.body.reason}`,
      });
    } else {
      const next = req.body.status;
      const current = STAGES.indexOf(order.status);
      if (order.status === next) {
        result = order;
        return;
      }
      if (next === 'cancelled') {
        if (current < 0 || current > 1) throw problem('Only unready orders can be cancelled.', 409);
        if (order.pointsRedeemed)
          await User.updateOne(
            { _id: order.user },
            { $inc: { points: order.pointsRedeemed } },
            { session }
          );
      } else if (current < 0 || STAGES[current + 1] !== next)
        throw problem('Order changed. Refresh and follow the next preparation stage.', 409);
      order.status = next;
      if (next === 'handed_off') {
        order.pointsEarned = Math.floor(order.totalPaise / 10000);
        await User.updateOne(
          { _id: order.user },
          { $inc: { points: order.pointsEarned } },
          { session }
        );
      }
      order.events.push({
        status: next,
        message:
          next === 'cancelled'
            ? 'Kitchen cancelled the order. Demo payment needs no refund; reserved rewards returned.'
            : `Kitchen marked your order ${next.replaceAll('_', ' ')}.`,
      });
    }
    await order.save({ session });
    result = order;
  });
  broadcastOrder(result);
  res.json({ order: await populated(result) });
};
exports.scope = scope;
