const express = require('express');
const Application = require('../models/Application');
const Job = require('../models/Job');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) =>
  res.json(await Application.find({ user: req.user.id }).sort({ date: -1 })));

router.post('/', auth, async (req, res) => {
  const { jobId, position, company } = req.body;
  if (!position || !company) return res.status(400).json({ error: 'Missing fields' });
  const existing = await Application.findOne({ user: req.user.id, position });
  if (existing) return res.status(409).json({ error: 'Already applied' });

  const app = await Application.create({ user: req.user.id, jobId, position, company });
  if (jobId) { try { await Job.findByIdAndUpdate(jobId, { $inc: { applicants: 1 } }); } catch (e) {} }
  await Notification.create({ user: req.user.id, text: `Application sent to ${company}`, type: 'info' });
  res.json(app);
});

router.patch('/:id', auth, async (req, res) => {
  const app = await Application.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id }, { $set: req.body }, { new: true });
  if (!app) return res.status(404).json({ error: 'Not found' });
  res.json(app);
});

router.delete('/:id', auth, async (req, res) => {
  await Application.deleteOne({ _id: req.params.id, user: req.user.id });
  res.json({ ok: true });
});

module.exports = router;