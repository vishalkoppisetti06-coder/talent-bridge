const express = require('express');
const Document = require('../models/Document');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) =>
  res.json(await Document.find({ user: req.user.id }).sort({ uploaded: -1 })));

router.post('/', auth, async (req, res) => {
  const { name, type, size } = req.body;
  const doc = await Document.create({ user: req.user.id, name, type: type || 'pdf', size: size || '0 KB' });
  res.json(doc);
});

router.delete('/:id', auth, async (req, res) => {
  await Document.deleteOne({ _id: req.params.id, user: req.user.id });
  res.json({ ok: true });
});

module.exports = router;