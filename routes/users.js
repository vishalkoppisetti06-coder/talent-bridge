const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

router.put('/me', auth, async (req, res) => {
  const allowed = ['name', 'phone', 'department', 'extras', 'theme', 'savedInternships', 'referrals', 'resume'];
  const patch = {};
  allowed.forEach(k => { if (k in req.body) patch[k] = req.body[k]; });
  const user = await User.findByIdAndUpdate(req.user.id, { $set: patch }, { new: true });
  res.json({ ok: true, user: { id: user._id, name: user.name, email: user.email, role: user.role, department: user.department, extras: user.extras } });
});

router.post('/me/view', auth, async (req, res) => {
  const names = ['Google India', 'Microsoft', 'Amazon', 'Flipkart', 'Infosys', 'TCS', 'Zoho', 'Deloitte', 'KPMG', 'Wipro'];
  const colors = ['green', 'blue', 'purple', 'orange', 'teal', 'pink'];
  const initials = ['GI', 'MI', 'AM', 'FK', 'IN', 'TC', 'ZO', 'DE', 'KP', 'WI'];
  const i = Math.floor(Math.random() * names.length);
  const viewer = { name: names[i], role: 'Recruiter', initials: initials[i], color: colors[i % colors.length], time: new Date() };
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $inc: { profileViews: 1 }, $push: { profileViewers: { $each: [viewer], $slice: -60 } } },
    { new: true }
  );
  res.json({ views: user.profileViews, viewers: user.profileViewers });
});

module.exports = router;