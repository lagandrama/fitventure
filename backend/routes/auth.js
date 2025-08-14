// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const User = require('../models/user');
const { signToken } = require('../utils/jwt');
const { registerRules, loginRules } = require('../validators/authValidators');
const { validate } = require('../middleware/validate');

// POST /api/register
router.post('/register', registerRules, validate, async (req, res) => {
  const { name, email, password } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ error: 'Email already in use' });

  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hash });

  const token = signToken({ userId: user._id });
  res.json({
    token,
    user: { _id: user._id, name: user.name, email: user.email, profilePic: user.profilePic || '' }
  });
});

// POST /api/login
router.post('/login', loginRules, validate, async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken({ userId: user._id });
  res.json({
    token,
    user: { _id: user._id, name: user.name, email: user.email, profilePic: user.profilePic || '' }
  });
});

module.exports = router;
