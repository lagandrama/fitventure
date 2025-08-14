// backend/routes/strava.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/user');
const { signToken, verifyToken } = require('../utils/jwt');
const { buildAuthUrl, exchangeCodeForToken, refreshAccessToken, apiGet } = require('../utils/strava');
const Activity = require('../models/activity');

// 1) Redirect na Strava OAuth (prima token iz query || headera || cookieja)
router.get('/strava/connect', async (req, res) => {
  try {
    // 1) Izvuci token iz query, headera ili cookieja
    let raw =
      req.query.token ||
      req.headers.authorization ||
      (req.headers.cookie || '')
        .split(';')
        .map(s => s.trim())
        .find(c => c.startsWith('token='))?.split('=')[1];

    if (!raw) return res.status(401).json({ error: 'Unauthorized' });

    // 2) Ukloni "Bearer " prefiks ako postoji
    if (raw.startsWith('Bearer ')) raw = raw.slice(7);

    // 3) Verificiraj JWT
    let decoded;
    try {
      decoded = verifyToken(raw); // koristi tvoj JWT_SECRET
    } catch (_) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // 4) Kratkotrajni "state" koji nosi userId
    const state = signToken({ userId: decoded.userId }, '10m');
    const url = buildAuthUrl(state);
    return res.redirect(url);
  } catch (e) {
    console.error('Strava connect failed:', e?.message);
    return res.status(500).json({ error: 'Connect failed' });
  }
});



// 2) OAuth callback
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

    return res.redirect('http://localhost:5173/integrations?strava=connected');
  } catch (e) {
    console.error('Strava callback failed:', e?.response?.data || e.message);
    return res.status(500).send('Strava connection failed');
  }
});

// 3) Status integracije
router.get('/strava/status', auth, async (req, res) => {
  const u = await User.findById(req.user._id).select('strava');
  const connected = !!(u?.strava?.accessToken && u?.strava?.athleteId);
  res.json({
    connected,
    athleteId: u?.strava?.athleteId || null,
    tokenExpiresAt: u?.strava?.tokenExpiresAt || null
  });
});

// 4) Ručno povlačenje aktivnosti i spremanje u bazu
router.get('/strava/sync', auth, async (req, res) => {
  try {
    const u = await User.findById(req.user._id).select('strava');
    if (!u?.strava?.accessToken) return res.status(400).json({ error: 'Strava not connected' });

    if (u.strava.tokenExpiresAt && new Date(u.strava.tokenExpiresAt) < new Date()) {
      const refreshed = await refreshAccessToken(u.strava.refreshToken);
      u.strava.accessToken = refreshed.access_token;
      u.strava.refreshToken = refreshed.refresh_token || u.strava.refreshToken;
      u.strava.tokenExpiresAt = new Date(refreshed.expires_at * 1000);
      await u.save();
    }

    const after = req.query.after ? Number(req.query.after) : undefined;
    const per_page = req.query.per_page ? Number(req.query.per_page) : 50;

    const activities = await apiGet('/athlete/activities', u.strava.accessToken, {
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

// 5) Disconnect
router.post('/strava/disconnect', auth, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $unset: { strava: 1 }
  });
  res.json({ ok: true });
});

module.exports = router;
