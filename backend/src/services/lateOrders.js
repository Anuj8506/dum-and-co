const Order = require('../models/Order');
const { broadcastOrder } = require('./realtime');
async function checkLateOrders() {
  const cutoff = new Date(Date.now() - 10 * 60000);
  const orders = await Order.find({
    status: { $in: ['confirmed', 'preparing'] },
    paymentStatus: 'paid',
    promisedAt: { $lt: cutoff },
    lateNotifiedAt: { $exists: false },
  });
  for (const order of orders) {
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, lateNotifiedAt: { $exists: false } },
      {
        $set: { lateNotifiedAt: new Date() },
        $push: {
          events: {
            status: order.status,
            message:
              'Your order is taking longer than promised. The outlet team has been alerted and will update your time.',
            at: new Date(),
          },
        },
      },
      { returnDocument: 'after' }
    );
    if (updated) broadcastOrder(updated);
  }
}
module.exports = { checkLateOrders };
