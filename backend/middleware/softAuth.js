// backend/middleware/softAuth.js
const { verifyToken } = require('../utils/jwt');
const User = require('../models/user');

module.exports = async function softAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [type, token] = header.split(' ');

    if (type === 'Bearer' && token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select('_id name email profilePic');
      if (user) req.user = user; // nije obavezno, ali dostupno ako postoji
    }
  } catch (_) {
    // Ignoriši greške tokena – ovo je "soft" varijanta, ne blokira zahtjev
  }
  next();
};
