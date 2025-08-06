const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcrypt');

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();
    res.status(201).json({ message: 'Korisnik registriran!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registracija nije uspjela.' });
  }
});

module.exports = router;
