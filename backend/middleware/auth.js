const { verifyToken } = require('../utils/jwt');
const User = require('../models/user'); // malo slovo

module.exports = async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token) return res.status(401).json({ error: 'Unauthorized' });

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select('_id name email profilePic');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
