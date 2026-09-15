const mongoose = require('mongoose');
module.exports = mongoose.model('Application', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  jobId: String,
  position: String,
  company: String,
  status: { type: String, default: 'Applied' },
  statusType: { type: String, default: 'info' },
  stage: { type: String, default: 'applied' },
  date: { type: Date, default: Date.now },
}, { timestamps: true }));