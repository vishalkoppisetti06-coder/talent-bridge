const mongoose = require('mongoose');
module.exports = mongoose.model('Otp', new mongoose.Schema({
  identifier: { type: String, required: true, index: true },
  channel: { type: String, enum: ['email', 'sms'], required: true },
  otp: { type: String, required: true },
  purpose: { type: String, default: 'reset-password' },
  attempts: { type: Number, default: 0 },
  consumed: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true }));