const express = require('express');
const router = express.Router();
const softAuth = require('../middleware/softAuth');
const ChallengeProgress = require('../models/challengeProgress');
const User = require('../models/user');

// GET /api/challenges/:id/leaderboard
router.get('/challenges/:id/leaderboard', softAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await ChallengeProgress.aggregate([
      { $match: { challenge: require('mongoose').Types.ObjectId.createFromHexString(id) } },
      { $group: { _id: '$user', total: { $sum: '$value' } } },
      { $sort: { total: -1 } },
      { $limit: 50 }
    ]);

    // Učitaj imena
    const userIds = rows.map(r => r._id);
    const users = await User.find({ _id: { $in: userIds } }).select('name email').lean();
    const byId = new Map(users.map(u => [String(u._id), u]));

    const leaderboard = rows.map((r, i) => ({
      rank: i + 1,
      userId: String(r._id),
      name: byId.get(String(r._id))?.name || 'Unknown',
      total: r.total
    }));

    res.json({ leaderboard });
  } catch (e) {
    console.error('Leaderboard error:', e);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

module.exports = router;
