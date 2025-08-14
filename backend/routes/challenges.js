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
router.get('/challenges', softAuth, listRules, validate, async (req, res) => {
  try {
    const { q, type, mine, status, showInactive, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if ((mine === '1' || mine === 'true') && req.user?._id) filter.creator = req.user._id;
    if (q) filter.$text = { $search: q };
    filter.privacy = 'public';

    // Default: prikazujemo ACTIVE i UPCOMING; INACTIVE skrivamo osim ako status=inactive
    const now = new Date();
    const includeInactiveLegacy = showInactive === '1' || showInactive === 'true'; // BC
    if (status === 'active') {
      filter.startDate = { $lte: now };
      filter.endDate = { $gte: now };
    } else if (status === 'upcoming') {
      filter.startDate = { $gt: now };
    } else if (status === 'inactive') {
      filter.endDate = { $lt: now };
    } else if (!includeInactiveLegacy) {
      // No status filter given → default exclude inactive
      filter.endDate = { $gte: now };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const items = await Challenge.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('_id title type privacy startDate endDate creator participants');

    const mapped = items.map(c => {
      const status = computeStatus(c.startDate, c.endDate); // uses inactive after endDate
      const joined = req.user ? c.participants.some(u => String(u) === String(req.user._id)) : false;
      return {
        _id: c._id,
        title: c.title,
        type: c.type,
        privacy: c.privacy,
        startDate: c.startDate,
        endDate: c.endDate,
        status,
        participantsCount: c.participants.length,
        joined
      };
    });

    const total = await Challenge.countDocuments(filter);
    res.json({ items: mapped, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list challenges' });
  }
});


// DETAIL (public)
router.get('/challenges/:id', /* auth, */ idRule, validate, async (req, res) => {
  const itemRaw = await Challenge.findById(req.params.id)
    .select('title type privacy startDate endDate status rules participants creator') // ✅ bez -__v
    .populate('creator', 'name email')
    .lean();

  if (!itemRaw) return res.status(404).json({ error: 'Not found' });
  if (itemRaw.privacy === 'private') return res.status(403).json({ error: 'Forbidden' });

  const item = {
    ...itemRaw,
    participants: (itemRaw.participants || []).map(id => id.toString())
  };

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
      { $addToSet: { participants: req.user._id } },
      { new: true }
    ).select('_id participants privacy').lean();

    if (!updated) return res.status(404).json({ error: 'Not found' });
    if (updated.privacy === 'private') return res.status(403).json({ error: 'Forbidden' });

    return res.json({
      joined: true,
      participantsCount: (updated.participants || []).length,
      participants: (updated.participants || []).map(id => id.toString())
    });
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
    ).select('_id participants').lean();

    if (!updated) return res.status(404).json({ error: 'Not found' });

    return res.json({
      joined: false,
      participantsCount: (updated.participants || []).length,
      participants: (updated.participants || []).map(id => id.toString())
    });
  } catch (e) {
    return res.status(500).json({ error: 'Leave failed' });
  }
});

module.exports = router;
