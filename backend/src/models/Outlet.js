const mongoose = require('mongoose');
module.exports = mongoose.model(
  'Outlet',
  new mongoose.Schema(
    {
      name: String,
      city: String,
      address: String,
      fssai: String,
      lat: Number,
      lng: Number,
      radiusKm: Number,
      minimumMinutes: Number,
      capacity: Number,
      active: { type: Boolean, default: true },
    },
    { timestamps: true }
  )
);
