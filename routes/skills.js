const express = require('express');
const Skill = require('../models/Skill');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  res.json(await Skill.find({ user: req.user.id }).sort({ createdAt: 1 }));
});

router.post('/', auth, async (req, res) => {
  const { name, level, category } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const dup = await Skill.findOne({ user: req.user.id, name: new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
  if (dup) return res.status(409).json({ error: 'Skill already exists' });
  const skill = await Skill.create({ user: req.user.id, name, level: level != null ? level : 70, category: category || 'General' });
  res.json(skill);
});

router.put('/:id', auth, async (req, res) => {
  const skill = await Skill.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { $set: req.body }, { new: true });
  if (!skill) return res.status(404).json({ error: 'Not found' });
  res.json(skill);
});

router.delete('/:id', auth, async (req, res) => {
  await Skill.deleteOne({ _id: req.params.id, user: req.user.id });
  res.json({ ok: true });
});

module.exports = router;