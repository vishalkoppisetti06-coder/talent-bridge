const express = require('express');
const Skill = require('../models/Skill');
const Job = require('../models/Job');
const auth = require('../middleware/auth');
const router = express.Router();

function calcMatch(userSkills, jobSkills) {
  if (!jobSkills || !jobSkills.length) return 50;
  const set = new Set(userSkills.map(s => s.toLowerCase()));
  const matched = jobSkills.filter(s => set.has(s.toLowerCase())).length;
  return Math.min(99, Math.round((matched / jobSkills.length) * 100));
}

router.get('/matches', auth, async (req, res) => {
  const skills = await Skill.find({ user: req.user.id });
  const jobs = await Job.find({ status: 'Active' });
  const names = skills.map(s => s.name);
  const scored = jobs
    .map(j => ({ ...j.toObject(), match: calcMatch(names, j.skills) }))
    .sort((a, b) => b.match - a.match);
  res.json(scored);
});

module.exports = router;