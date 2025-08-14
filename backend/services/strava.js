const axios = require('axios');
const StravaToken = require('../models/stravaToken');

const STRAVA_API = 'https://www.strava.com/api/v3';
const STRAVA_OAUTH = 'https://www.strava.com/oauth/token';

async function ensureAccessToken(userId, clientId, clientSecret) {
  const doc = await StravaToken.findOne({ user: userId });
  if (!doc) throw new Error('Strava not connected');

  const now = Math.floor(Date.now() / 1000);
  if (doc.expiresAt && doc.expiresAt > now + 60) {
    return doc.accessToken;
  }

  // refresh
  const { data } = await axios.post(STRAVA_OAUTH, {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: doc.refreshToken
  });

  doc.accessToken = data.access_token;
  doc.refreshToken = data.refresh_token || doc.refreshToken;
  doc.expiresAt = data.expires_at;
  await doc.save();
  return doc.accessToken;
}

async function fetchActivities(accessToken, afterEpoch, beforeEpoch, page = 1) {
  const res = await axios.get(`${STRAVA_API}/athlete/activities`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { after: afterEpoch, before: beforeEpoch, per_page: 100, page }
  });
  return res.data || [];
}

// Pretvori Strava aktivnost u vrijednosti koje trebaju challengeu
function normalizeActivity(act) {
  // dostupno: act.type (Run, Walk, Hike, Ride...), act.distance (m), act.moving_time (s),
  // act.total_elevation_gain (m), act.average_cadence (ovisno o uređaju), act.calories (nekad)
  return {
    type: act.type,
    distance_m: Number(act.distance || 0),
    moving_s: Number(act.moving_time || 0),
    elev_m: Number(act.total_elevation_gain || 0),
    avg_cad: typeof act.average_cadence === 'number' ? act.average_cadence : null,
    calories: typeof act.calories === 'number' ? act.calories : null,
    start_date_local: act.start_date_local
  };
}

module.exports = {
  ensureAccessToken,
  fetchActivities,
  normalizeActivity
};
