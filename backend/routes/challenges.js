const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const Challenge = require('../models/challenge');
const { createChallengeRules, updateChallengeRules, idRule, listRules } = require('../validators/challengeValidators');

// Helper za status
function computeStatus(startDate, endDate) {
  const now = new Date();
  if (now < startDate) return 'upcoming';
  if (now > endDate) return 'ended';
  return 'active';
}

// CREATE
router.post('/challenges', auth, createChallengeRules, validate, async (req, res) => {
  try {
    const data = { ...req.body, creator: req.user._id };
    data.status = computeStatus(new Date(data.startDate), new Date(data.endDate));
    const c = await Challenge.create(data);
    res.status(201).json(c);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

// LIST (paginacija + filtri: q, type, mine)
router.get('/challenges', /* auth, */ listRules, validate, async (req, res) => {
  try {
    const { q, type, mine, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    // mine ima smisla samo kad je user u auth-u; ako nema auth-a, ignoriramo ga
    if ((mine === '1' || mine === 'true') && req.user?._id) filter.creator = req.user._id;
    if (q) filter.$text = { $search: q };
    filter.privacy = 'public'; // javno listanje prikazuje samo public

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Challenge.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('-__v'),
      Challenge.countDocuments(filter)
    ]);

    res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list challenges' });
  }
});

// DETAIL (public)
router.get('/challenges/:id', /* auth, */ idRule, validate, async (req, res) => {
  const item = await Challenge.findById(req.params.id)
    .populate('creator', 'name email')
    .select('-__v');
  if (!item) return res.status(404).json({ error: 'Not found' });
  if (item.privacy === 'private') return res.status(403).json({ error: 'Forbidden' });
  res.json(item);
});

// UPDATE (samo creator)
router.patch('/challenges/:id', auth, updateChallengeRules, validate, async (req, res) => {
  const c = await Challenge.findById(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  if (String(c.creator) !== String(req.user._id)) return res.status(403).json({ error: 'Forbidden' });

  Object.assign(c, req.body);
  c.status = computeStatus(new Date(c.startDate), new Date(c.endDate));
  await c.save();
  res.json(c);
});

// DELETE (samo creator)
router.delete('/challenges/:id', auth, idRule, validate, async (req, res) => {
  const c = await Challenge.findById(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  if (String(c.creator) !== String(req.user._id)) return res.status(403).json({ error: 'Forbidden' });
  await c.deleteOne();
  res.json({ ok: true });
});

// JOIN
router.post('/challenges/:id/join', auth, idRule, validate, async (req, res) => {
  try {
    const updated = await Challenge.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { participants: req.user._id } }, // sprječava duplikate
      { new: true }
    ).select('_id participants privacy');

    if (!updated) return res.status(404).json({ error: 'Not found' });
    if (updated.privacy === 'private') return res.status(403).json({ error: 'Forbidden' });

    return res.json({ joined: true, participants: updated.participants.length });
  } catch (e) {
    return res.status(500).json({ error: 'Join failed' });
  }
});

// LEAVE
router.post('/challenges/:id/leave', auth, idRule, validate, async (req, res) => {
  try {
    const updated = await Challenge.findByIdAndUpdate(
      req.params.id,
      { $pull: { participants: req.user._id } },
      { new: true }
    ).select('_id participants');

    if (!updated) return res.status(404).json({ error: 'Not found' });

    return res.json({ joined: false, participants: updated.participants.length });
  } catch (e) {
    return res.status(500).json({ error: 'Leave failed' });
  }
});

module.exports = router;
