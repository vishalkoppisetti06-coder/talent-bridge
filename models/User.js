const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  phone: { type: String, trim: true, default: '' },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student', 'industry', 'academia'], required: true },
  department: { type: String, default: 'CSE' },
  extras: { type: mongoose.Schema.Types.Mixed, default: {} },
  resume: { type: mongoose.Schema.Types.Mixed, default: null },
  savedInternships: { type: [Number], default: [] },
  referrals: { type: Number, default: 3 },
  profileViews: { type: Number, default: 35 },
  profileViewers: [{ name: String, role: String, initials: String, color: String, time: Date }],
  theme: { type: String, default: 'light' },
}, { timestamps: true });

UserSchema.methods.verifyPassword = function (pw) { return bcrypt.compare(pw, this.passwordHash); };
UserSchema.statics.hashPassword = function (pw) { return bcrypt.hash(pw, 10); };

module.exports = mongoose.model('User', UserSchema);