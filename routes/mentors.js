const express = require('express');
const router = express.Router();

const MENTORS = [
  { id: 1, name: 'Rajesh Kumar', initials: 'RK', color: 'green', title: 'Senior SDE · Google · 15 yrs exp', expertise: ['DSA', 'System Design', 'Career'], rating: 4.9 },
  { id: 2, name: 'Meera Nair', initials: 'MN', color: 'purple', title: 'Engineering Manager · Microsoft', expertise: ['Frontend', 'TypeScript', 'Leadership'], rating: 4.8 },
  { id: 3, name: 'Sanjay Gupta', initials: 'SG', color: 'blue', title: 'Founder · TechStartup', expertise: ['Entrepreneurship', 'Full Stack', 'Product'], rating: 4.7 },
  { id: 4, name: 'Kavita Joshi', initials: 'KJ', color: 'orange', title: 'ML Engineer · Amazon', expertise: ['Machine Learning', 'Python', 'Deep Learning'], rating: 4.6 },
];

router.get('/', (_req, res) => res.json(MENTORS));
module.exports = router;