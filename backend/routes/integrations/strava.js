// backend/routes/integrations/strava.js
const express = require('express');
const router = express.Router();

const auth = require('../../middleware/auth');

const User = require('../../models/user');
const Activity = require('../../models/activity');
const Challenge = require('../../models/challenge');
const ChallengeProgress = require('../../models/challengeProgress');

const { signToken, verifyToken } = require('../../utils/jwt');
const { buildAuthUrl, exchangeCodeForToken, refreshAccessToken, apiGet } = require('../../utils/strava');
const { computeSteps } = require('../../utils/steps');

const clientURL = process.env.CLIENT_URL || 'http://localhost:5173';

/* ---------------------------------------------------------
   Helper: osiguraj važeći access token (User.strava storage)
--------------------------------------------------------- */
async function ensureUserAccessToken(userId) {
  const u = await User.findById(userId).select('strava');
  if (!u || !u.strava || !u.strava.accessToken) {
    throw new Error('Strava not connected');
  }

  const isExpired =
    u.strava.tokenExpiresAt && new Date(u.strava.tokenExpiresAt).getTime() <= Date.now();

  if (!isExpired) {
    return u.strava.accessToken;
  }

  // refresh
  const refreshed = await refreshAccessToken(u.strava.refreshToken);
  u.strava.accessToken = refreshed.access_token;
  u.strava.refreshToken = refreshed.refresh_token || u.strava.refreshToken;
  u.strava.tokenExpiresAt = new Date(refreshed.expires_at * 1000);
  await u.save();

  return u.strava.accessToken;
}

/* ---------------------------------------------------------
   1) Redirect na Strava OAuth
   GET /api/strava/connect
--------------------------------------------------------- */
router.get('/strava/connect', async (req, res) => {
  try {
    // token može doći iz ?token=, Authorization headera, ili cookie-a "token"
    let raw =
      req.query.token ||
      req.headers.authorization ||
      (req.headers.cookie || '')
        .split(';')
        .map(s => s.trim())
        .find(c => c.startsWith('token='))?.split('=')[1];

    if (!raw) return res.status(401).json({ error: 'Unauthorized' });
    if (raw.startsWith('Bearer ')) raw = raw.slice(7);

    let decoded;
    try {
      decoded = verifyToken(raw);
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const state = signToken({ userId: decoded.userId }, '10m');
    const url = buildAuthUrl(state);
    return res.redirect(url);
  } catch (e) {
    console.error('Strava connect failed:', e?.message);
    return res.status(500).json({ error: 'Connect failed' });
  }
});

/* ---------------------------------------------------------
   2) OAuth callback
   GET /api/strava/callback
--------------------------------------------------------- */
router.get('/strava/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    if (error) return res.status(400).send(`Strava error: ${error}`);

    const decoded = verifyToken(state);
    const userId = decoded.userId;

    const tokenData = await exchangeCodeForToken(code);
    const update = {
      strava: {
        athleteId: tokenData?.athlete?.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: new Date(tokenData.expires_at * 1000)
      }
    };

    await User.findByIdAndUpdate(userId, update, { new: true });

    return res.redirect(`${clientURL}/integrations?strava=connected`);
  } catch (e) {
    console.error('Strava callback failed:', e?.response?.data || e.message);
    return res.status(500).send('Strava connection failed');
  }
});

/* ---------------------------------------------------------
   3) Status integracije
   GET /api/strava/status
--------------------------------------------------------- */
router.get('/strava/status', auth, async (req, res) => {
  const u = await User.findById(req.user._id).select('strava');
  const connected = !!(u?.strava?.accessToken && u?.strava?.athleteId);
  res.json({
    connected,
    athleteId: u?.strava?.athleteId || null,
    tokenExpiresAt: u?.strava?.tokenExpiresAt || null
  });
});

/* ---------------------------------------------------------
   4) Ručni sync aktivnosti u Activity kolekciju (općenito)
   GET /api/strava/sync?after=<epoch>&per_page=50
--------------------------------------------------------- */
router.get('/strava/sync', auth, async (req, res) => {
  try {
    const accessToken = await ensureUserAccessToken(req.user._id);

    const after = req.query.after ? Number(req.query.after) : undefined;
    const per_page = req.query.per_page ? Number(req.query.per_page) : 50;

    const activities = await apiGet('/athlete/activities', accessToken, {
      after, per_page, page: 1
    });

    let upserts = 0;
    for (const a of activities) {
      const doc = {
        user: req.user._id,
        source: 'strava',
        sourceId: String(a.id),
        type: a.type,
        startDate: a.start_date ? new Date(a.start_date) : null,
        movingTime: a.moving_time,
        elapsedTime: a.elapsed_time,
        distance: a.distance,
        totalElevationGain: a.total_elevation_gain,
        averageHeartrate: a.average_heartrate,
        maxHeartrate: a.max_heartrate,
        calories: a.calories,
        raw: a
      };

      const resUp = await Activity.updateOne(
        { user: req.user._id, source: 'strava', sourceId: String(a.id) },
        { $set: doc },
        { upsert: true }
      );
      if (resUp.upsertedCount || resUp.modifiedCount) upserts++;
    }

    res.json({ fetched: activities.length, upserts });
  } catch (e) {
    console.error('Strava sync failed:', e?.response?.data || e.message);
    res.status(500).json({ error: 'Strava sync failed' });
  }
});

/* ---------------------------------------------------------
   5) Challenge Sync (puni ChallengeProgress)
   POST /api/integrations/strava/sync?challengeId=...
--------------------------------------------------------- */
router.post('/integrations/strava/sync', auth, async (req, res) => {
  try {
    const { challengeId } = req.query;
    const challenge = await Challenge.findById(challengeId).lean();
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const isParticipant = (challenge.participants || []).some(u => String(u) === String(req.user._id));
    const isCreator = String(challenge.creator) === String(req.user._id);
    if (!isParticipant && !isCreator) return res.status(403).json({ error: 'Not joined' });

    const accessToken = await ensureUserAccessToken(req.user._id);

    const after = Math.floor(new Date(challenge.startDate).getTime() / 1000);
    const before = Math.ceil(new Date(challenge.endDate).getTime() / 1000);

    // Strava pagination
    let page = 1, all = [];
    while (page <= 10) {
      const batch = await apiGet('/athlete/activities', accessToken, {
        after, before, per_page: 100, page
      });
      if (!batch.length) break;
      all = all.concat(batch);
      page += 1;
    }

    // Relevantne aktivnosti
    const relevant = all.filter(a => {
      const t = String(a.type || '').toLowerCase();
      return t.includes('run') || t.includes('walk') || t.includes('hike');
    });

    // Zbroji po danu prema vrsti challenga
    const perDay = new Map(); // YYYY-MM-DD -> value
    for (const a of relevant) {
      const day = (a.start_date_local || '').slice(0, 10);
      if (!day) continue;

      // normalizacija iz raw Strava objekta
      const distance_m = Number(a.distance || 0);
      const moving_s = Number(a.moving_time || 0);
      const elev_m = Number(a.total_elevation_gain || 0);
      const avg_cad = typeof a.average_cadence === 'number' ? a.average_cadence : null;
      const calories = typeof a.calories === 'number' ? a.calories : null;

      let inc = 0;
      const type = String(challenge.type || '').toLowerCase();

      if (type === 'steps') {
        inc = computeSteps({
          type: a.type,
          distance_m,
          moving_s,
          avg_cad,
          elev_m,
          calories,
          start_date_local: a.start_date_local
        });
      } else if (type === 'distance') {
        inc = Math.round(distance_m); // u metrima
      } else if (type === 'time') {
        inc = moving_s; // u sekundama
      } else if (type === 'elevation') {
        inc = Math.round(elev_m);
      } else if (type === 'calories') {
        inc = Math.round(calories || 0);
      }

      perDay.set(day, (perDay.get(day) || 0) + (inc || 0));
    }

    // Upsert u ChallengeProgress
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
    if (ops.length) await ChallengeProgress.bulkWrite(ops);

    return res.json({ ok: true, days: ops.length, activitiesFetched: all.length });
  } catch (e) {
    console.error('Strava challenge sync error:', e?.response?.data || e.message);
    return res.status(500).json({ error: 'Strava sync failed' });
  }
});

/* ---------------------------------------------------------
   6) Debug env (ukloni u produkciji)
   GET /api/strava/debug/env
--------------------------------------------------------- */
router.get('/strava/debug/env', (req, res) => {
  res.json({
    STRAVA_CLIENT_ID: String(process.env.STRAVA_CLIENT_ID || '').trim(),
    STRAVA_REDIRECT_URI: String(process.env.STRAVA_REDIRECT_URI || '').trim(),
    CLIENT_URL: String(process.env.CLIENT_URL || '').trim()
  });
});

/* ---------------------------------------------------------
   7) Disconnect
   POST /api/strava/disconnect
--------------------------------------------------------- */
router.post('/strava/disconnect', auth, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { strava: 1 } });
  res.json({ ok: true });
});

module.exports = router;
