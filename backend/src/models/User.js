const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['customer', 'kitchen', 'admin'], default: 'customer' },
    outlet: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet' },
    points: { type: Number, default: 0, min: 0 },
    marketingOptIn: { type: Boolean, default: false },
    consentAt: { type: Date, required: true },
  },
  { timestamps: true }
);
module.exports = mongoose.model('User', schema);
