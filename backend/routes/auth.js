const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/user'); // malo slovo
const { signToken } = require('../utils/jwt');
const validate = require('../middleware/validate');
const { registerRules, loginRules } = require('../validators/authValidators');

// REGISTER
router.post('/register', registerRules, validate, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ error: 'Email je već registriran.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email: email.toLowerCase(), password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'Korisnik registriran!' });
  } catch (err) {
    res.status(500).json({ error: 'Registracija nije uspjela.' });
  }
});

// LOGIN
router.post('/login', loginRules, validate, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Neispravan email ili lozinka.' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Neispravan email ili lozinka.' });

    const token = signToken({ userId: user._id }, '7d');
    const userSafe = { id: user._id, name: user.name, email: user.email, profilePic: user.profilePic };

    return res.json({ token, user: userSafe });
  } catch (err) {
    return res.status(500).json({ error: 'Prijava nije uspjela.' });
  }
});

module.exports = router;
