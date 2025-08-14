const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const softAuth = require('../middleware/softAuth');
const { validate } = require('../middleware/validate');
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

// DETAIL (public, defensive)
const mongoose = require('mongoose');

router.get('/challenges/:id', softAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // 1) Validacija ID-a bez express-validatora (da izbjegnemo 500/422 zbrku)
    if (!mongoose.isValidObjectId(id)) {
      return res.status(422).json({ error: 'Invalid challenge id' });
    }

    // 2) Dohvati dokument bez populate (sigurno i brzo)
    const itemRaw = await Challenge.findById(id)
      .select('_id title type privacy startDate endDate status rules participants creator')
      .lean();

    if (!itemRaw) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (itemRaw.privacy === 'private') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // 3) Defenzivna priprema polja
    const participantsArr = Array.isArray(itemRaw.participants) ? itemRaw.participants : [];
    // convert ObjectId -> string
    const participants = participantsArr.map(x => (x ? String(x) : '')).filter(Boolean);

    const userId = req.user ? String(req.user._id || req.user.id) : null;
    const joined = userId ? participants.includes(userId) : false;

    // 4) Response shape koji frontend očekuje
    return res.json({
      _id: String(itemRaw._id),
      title: itemRaw.title || '',
      type: itemRaw.type || '',
      privacy: itemRaw.privacy || 'public',
      startDate: itemRaw.startDate,
      endDate: itemRaw.endDate,
      status: itemRaw.status || computeStatus(new Date(itemRaw.startDate), new Date(itemRaw.endDate)),
      rules: itemRaw.rules || '',
      participants,
      participantsCount: participants.length,
      creator: itemRaw.creator ? String(itemRaw.creator) : null,
      joined
    });
  } catch (e) {
    console.error('DETAIL error:', e);
    return res.status(500).json({ error: 'Failed to load challenge' });
  }
});


// PARTICIPANTS (public for public challenges) – returns names
router.get('/challenges/:id/participants', softAuth, idRule, validate, async (req, res) => {
  const c = await Challenge.findById(req.params.id).populate('participants', 'name email').select('privacy participants');
  if (!c) return res.status(404).json({ error: 'Not found' });
  if (c.privacy === 'private') return res.status(403).json({ error: 'Forbidden' });
  const users = c.participants.map(u => ({ id: u._id, name: u.name, email: u.email }));
  res.json({ participants: users, count: users.length });
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
