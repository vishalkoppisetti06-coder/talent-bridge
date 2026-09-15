const express = require('express');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) =>
  res.json(await Notification.find({ user: req.user.id }).sort({ time: -1 }).limit(50)));

router.post('/', auth, async (req, res) => {
  const n = await Notification.create({ user: req.user.id, text: req.body.text, type: req.body.type || 'info' });
  res.json(n);
});

router.patch('/:id/read', auth, async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user.id }, { read: true });
  res.json({ ok: true });
});

router.patch('/read-all', auth, async (req, res) => {
  await Notification.updateMany({ user: req.user.id }, { read: true });
  res.json({ ok: true });
});

module.exports = router;