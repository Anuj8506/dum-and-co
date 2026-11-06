const MenuItem = require('../models/MenuItem');
const Outlet = require('../models/Outlet');
const { haversine, isAvailable, indiaHour } = require('../services/pricing');
const { broadcastMenu } = require('../services/realtime');
const Order = require('../models/Order');
const { recommend } = require('../services/recommendations');

exports.recommendations = async (req, res) => {
  const outlet = await Outlet.findById(req.query.outlet);
  if (!outlet) return res.status(400).json({ message: 'Choose an outlet first.' });
  const items = (await MenuItem.find({ active: true }).lean()).filter((i) =>
    isAvailable(i, outlet._id, indiaHour())
  );
  const orders = await Order.find({
    user: req.user._id,
    paymentStatus: 'paid',
    status: { $ne: 'cancelled' },
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({
    suggestions: recommend(items, orders).map((s) => ({
      id: String(s.item._id),
      reason: s.reason,
    })),
  });
};

exports.list = async (req, res) => {
  const outlets = await Outlet.find({ active: true }).sort({ name: 1 }).lean();
  const outlet = outlets.find((o) => String(o._id) === req.query.outlet) || outlets[0];
  const items = await MenuItem.find({ active: true }).sort({ createdAt: 1, _id: 1 }).lean();
  items.sort((a, b) => (b.badge === 'House favourite') - (a.badge === 'House favourite'));
  res.json({
    outlets,
    outlet,
    items: items.map((i) => ({
      ...i,
      pricePaise: i.cityPrices?.[outlet?.city] ?? i.pricePaise,
      available: isAvailable(i, outlet?._id, indiaHour()),
    })),
  });
};
exports.nearest = async (req, res) => {
  const lat = Number(req.query.lat),
    lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    return res.status(400).json({ message: 'A valid location is required.' });
  const outlets = await Outlet.find({ active: true }).lean();
  const choices = outlets
    .map((o) => ({ ...o, distanceKm: haversine(lat, lng, o.lat, o.lng) }))
    .filter((o) => o.distanceKm <= o.radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
  if (!choices.length)
    return res
      .status(404)
      .json({ message: 'Outside our delivery areas. You can still choose an outlet for pickup.' });
  res.json({ outlet: choices[0] });
};
exports.adminList = async (req, res) =>
  res.json({
    items: await MenuItem.find().sort({ category: 1, name: 1 }),
    outlets: await Outlet.find(),
  });
exports.save = async (req, res) => {
  const item = req.params.id
    ? await MenuItem.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { returnDocument: 'after', runValidators: true }
      )
    : await MenuItem.create(req.body);
  if (!item) return res.status(404).json({ message: 'Menu item not found.' });
  broadcastMenu();
  res.json({ item });
};
exports.availability = async (req, res) => {
  const outlet = req.user.role === 'admin' ? req.body.outlet : String(req.user.outlet);
  if (!(await Outlet.exists({ _id: outlet })))
    return res.status(404).json({ message: 'Outlet not found.' });
  const update = req.body.available
    ? { $pull: { unavailableAt: outlet } }
    : { $addToSet: { unavailableAt: outlet } };
  const item = await MenuItem.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' });
  if (!item) return res.status(404).json({ message: 'Item not found.' });
  broadcastMenu();
  res.json({ item });
};
