const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { issueOtp } = require('../utils/otp');
const auth = require('../middleware/auth');

const router = express.Router();
const otpLimiter = rateLimit({ windowMs: 60 * 1000, max: 6, message: { error: 'Too many OTP requests. Wait a minute.' } });

function sign(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '7d' }
  );
}

function publicUser(u) {
  const initials = (u.name || 'U').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return {
    id: u._id, name: u.name, email: u.email, phone: u.phone,
    role: u.role, department: u.department, extras: u.extras,
    initials, referrals: u.referrals, profileViews: u.profileViews,
    savedInternships: u.savedInternships, theme: u.theme,
  };
}

/* ---------------- SIGNUP ---------------- */
router.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, password, role, department, extras } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ error: 'Missing required fields' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        error: existing.role === role
          ? 'Email already registered. Please sign in.'
          : `This email is registered as ${existing.role}. Cannot sign up as ${role}.`,
      });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name, email: email.toLowerCase(), phone: phone || '',
      passwordHash, role, department: department || 'CSE',
      extras: extras || {},
    });
    res.json({ token: sign(user), user: publicUser(user) });
  } catch (err) {
    console.error('signup', err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- LOGIN ---------------- */
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'No account with this email. Please sign up.' });
    if (role && user.role !== role)
      return res.status(403).json({ error: `This email is registered as ${user.role}, not ${role}.` });

    const ok = await user.verifyPassword(password);
    if (!ok) return res.status(401).json({ error: 'Incorrect password' });

    res.json({ token: sign(user), user: publicUser(user) });
  } catch (err) {
    console.error('login', err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- SEND OTP ---------------- */
router.post('/otp/send', otpLimiter, async (req, res) => {
  try {
    const { email, channel } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'No account found with this email' });

    const ch = channel === 'sms' ? 'sms' : 'email';
    let target = user.email;
    if (ch === 'sms') {
      if (!user.phone) return res.status(400).json({ error: 'No phone number on this account. Add one in your profile.' });
      target = user.phone;
    }

    const otp = await issueOtp({ identifier: target, channel: ch, purpose: 'reset-password' });

    const masked = ch === 'email'
      ? target.replace(/(.{2}).+(@.+)/, '$1***$2')
      : target.replace(/(\+\d{2})\d+(\d{4})/, '$1****$2');

    res.json({
      ok: true, channel: ch, target: masked,
      devOtp: process.env.DEV_MODE === 'true' ? otp : undefined,
    });
  } catch (err) {
    console.error('otp/send', err);
    res.status(500).json({ error: 'Failed to send OTP: ' + err.message });
  }
});

/* ---------------- VERIFY OTP ---------------- */
router.post('/otp/verify', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user) return res.status(404).json({ error: 'Account not found' });

    const ids = [user.email, user.phone].filter(Boolean);
    const record = await Otp.findOne({
      identifier: { $in: ids }, purpose: 'reset-password', consumed: false,
    }).sort({ createdAt: -1 });

    if (!record) return res.status(400).json({ error: 'No active OTP. Request a new one.' });
    if (record.expiresAt < new Date()) return res.status(400).json({ error: 'OTP expired' });
    if (record.attempts >= 5) return res.status(429).json({ error: 'Too many attempts' });

    if (record.otp !== String(otp)) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ error: `Invalid OTP. Attempt ${record.attempts}/5.` });
    }
    record.consumed = true;
    await record.save();

    const resetToken = jwt.sign(
      { id: user._id.toString(), purpose: 'reset' },
      process.env.JWT_SECRET, { expiresIn: '15m' }
    );
    res.json({ ok: true, resetToken });
  } catch (err) {
    console.error('otp/verify', err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- RESET PASSWORD ---------------- */
router.post('/password/reset', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) return res.status(400).json({ error: 'Missing fields' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password too short' });

    let payload;
    try { payload = jwt.verify(resetToken, process.env.JWT_SECRET); }
    catch { return res.status(401).json({ error: 'Reset link expired' }); }

    if (payload.purpose !== 'reset') return res.status(401).json({ error: 'Invalid reset token' });

    const user = await User.findById(payload.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.passwordHash = await User.hashPassword(newPassword);
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    console.error('password/reset', err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- ME ---------------- */
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ user: publicUser(user) });
});

module.exports = router;