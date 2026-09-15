const mongoose = require('mongoose');
module.exports = mongoose.model('Document', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  name: String,
  type: { type: String, default: 'pdf' },
  size: String,
  uploaded: { type: Date, default: Date.now },
}, { timestamps: true }));