const mongoose = require('mongoose');
module.exports = mongoose.model('Job', new mongoose.Schema({
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  company: { type: String, default: '' },
  location: { type: String, default: 'Not specified' },
  department: { type: String, default: '' },
  type: { type: String, default: 'Internship' },
  salary: { type: String, default: 'Negotiable' },
  description: { type: String, default: '' },
  skills: { type: [String], default: [] },
  status: { type: String, default: 'Active' },
  applicants: { type: Number, default: 0 },
  shortlisted: { type: Number, default: 0 },
  posted: { type: Date, default: Date.now },
}, { timestamps: true }));