const mongoose = require('mongoose');
module.exports = mongoose.model('Skill', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  level: { type: Number, default: 70 },
  category: { type: String, default: 'General' },
}, { timestamps: true }));