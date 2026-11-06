const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    number: { type: String, unique: true, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    outlet: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet', required: true },
    idempotencyKey: { type: String, required: true },
    requestHash: { type: String, required: true },
    items: [
      {
        menuItem: mongoose.Schema.Types.ObjectId,
        name: String,
        portion: String,
        addons: [String],
        quantity: Number,
        unitPaise: Number,
        prepMinutes: Number,
      },
    ],
    subtotalPaise: Number,
    discountPaise: Number,
    totalPaise: Number,
    gstPaise: Number,
    coupon: String,
    pointsRedeemed: { type: Number, default: 0 },
    pointsEarned: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    paymentMethod: String,
    status: {
      type: String,
      enum: ['awaiting_payment', 'confirmed', 'preparing', 'ready', 'handed_off', 'cancelled'],
      default: 'awaiting_payment',
    },
    fulfilment: { type: String, enum: ['pickup', 'delivery'], default: 'pickup' },
    deliveryAddress: String,
    instructions: String,
    estimate: {
      minutes: Number,
      rawMinutes: Number,
      confidence: String,
      source: String,
      modelVersion: String,
      validationMae: Number,
    },
    promisedAt: Date,
    originalPromisedAt: Date,
    lateNotifiedAt: Date,
    events: [{ status: String, message: String, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);
schema.index({ user: 1, idempotencyKey: 1 }, { unique: true });
schema.index({ outlet: 1, paymentStatus: 1, status: 1, createdAt: -1 });
module.exports = mongoose.model('Order', schema);
