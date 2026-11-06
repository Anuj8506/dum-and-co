const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    category: String,
    image: String,
    vegetarian: Boolean,
    spice: { type: String, enum: ['Mild', 'Medium', 'Hot'], default: 'Medium' },
    allergens: [String],
    badge: String,
    prepMinutes: Number,
    pricePaise: { type: Number, required: true, min: 0 },
    cityPrices: { type: Map, of: Number, default: {} },
    portions: [{ name: String, multiplier: Number }],
    addons: [{ name: String, pricePaise: Number }],
    unavailableAt: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Outlet' }],
    active: { type: Boolean, default: true },
    availableFrom: { type: Number, default: 0 },
    availableUntil: { type: Number, default: 24 },
  },
  { timestamps: true }
);
module.exports = mongoose.model('MenuItem', schema);
