const express = require('express');
const Job = require('../models/Job');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', async (_req, res) => res.json(await Job.find({ status: 'Active' }).sort({ posted: -1 })));
router.get('/mine', auth, async (req, res) => res.json(await Job.find({ postedBy: req.user.id }).sort({ posted: -1 })));
router.post('/', auth, async (req, res) => {
  const job = await Job.create({ ...req.body, postedBy: req.user.id });
  res.json(job);
});
router.delete('/:id', auth, async (req, res) => {
  await Job.deleteOne({ _id: req.params.id, postedBy: req.user.id });
  res.json({ ok: true });
});

module.exports = router;