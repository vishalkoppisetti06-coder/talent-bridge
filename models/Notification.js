const mongoose = require('mongoose');
module.exports = mongoose.model('Notification', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  text: String,
  type: { type: String, default: 'info' },
  read: { type: Boolean, default: false },
  time: { type: Date, default: Date.now },
}, { timestamps: true }));