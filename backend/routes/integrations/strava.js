const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Challenge = require('../models/challenge');
const ChallengeProgress = require('../models/challengeProgress');
const { ensureAccessToken, fetchActivities, normalizeActivity } = require('../services/strava');
const { computeSteps } = require('../utils/steps');

const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET } = process.env;

// Ručni sync za jedan challenge
// POST /api/integrations/strava/sync?challengeId=...
router.post('/integrations/strava/sync', auth, async (req, res) => {
  try {
    const { challengeId } = req.query;
    const challenge = await Challenge.findById(challengeId).lean();
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    // samo sudionici + creator neka mogu syncati
    const isParticipant = (challenge.participants || []).some(u => String(u) === String(req.user._id));
    const isCreator = String(challenge.creator) === String(req.user._id);
    if (!isParticipant && !isCreator) return res.status(403).json({ error: 'Not joined' });

    const token = await ensureAccessToken(req.user._id, STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET);

    const after = Math.floor(new Date(challenge.startDate).getTime() / 1000);
    const before = Math.ceil(new Date(challenge.endDate).getTime() / 1000);

    let page = 1, all = [];
    // paginacija do 1000 aktivnosti (MVP)
    while (page <= 10) {
      const batch = await fetchActivities(token, after, before, page);
      if (!batch.length) break;
      all = all.concat(batch);
      page += 1;
    }

    // Filtriraj relevantne aktivnosti (za steps: Walk/Run/Hike)
    const relevant = all
      .map(normalizeActivity)
      .filter(a => {
        const t = String(a.type || '').toLowerCase();
        return t.includes('run') || t.includes('walk') || t.includes('hike');
      });

    // Grupiraj po danu i upiši u ChallengeProgress
    const perDay = new Map(); // key: YYYY-MM-DD -> value sum
    for (const a of relevant) {
      const day = (a.start_date_local || '').slice(0, 10); // YYYY-MM-DD
      if (!day) continue;
      let inc = 0;

      // Ako je challenge tipa "steps"
      if (String(challenge.type).toLowerCase() === 'steps') {
        inc = computeSteps(a);
      } else if (String(challenge.type).toLowerCase() === 'distance') {
        inc = Math.round(a.distance_m); // metri
      } else if (String(challenge.type).toLowerCase() === 'time') {
        inc = a.moving_s; // sekunde
      } else if (String(challenge.type).toLowerCase() === 'elevation') {
        inc = Math.round(a.elev_m);
      } else if (String(challenge.type).toLowerCase() === 'calories') {
        inc = Math.round(a.calories || 0);
      }

      perDay.set(day, (perDay.get(day) || 0) + (inc || 0));
    }

    const ops = [];
    perDay.forEach((val, day) => {
      ops.push({
        updateOne: {
          filter: { challenge: challenge._id, user: req.user._id, date: day },
          update: { $set: { value: val } },
          upsert: true
        }
      });
    });
    if (ops.length) {
      await ChallengeProgress.bulkWrite(ops);
    }

    return res.json({ ok: true, days: ops.length, activitiesFetched: all.length });
  } catch (e) {
    console.error('Strava sync error:', e);
    return res.status(500).json({ error: 'Strava sync failed' });
  }
});

module.exports = router;
