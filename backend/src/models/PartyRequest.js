const mongoose = require('mongoose');
module.exports = mongoose.model(
  'PartyRequest',
  new mongoose.Schema(
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      outlet: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet' },
      name: String,
      guests: Number,
      date: Date,
      notes: String,
      status: { type: String, enum: ['new', 'confirmed', 'declined'], default: 'new' },
    },
    { timestamps: true }
  )
);
