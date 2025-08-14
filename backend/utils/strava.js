// backend/utils/strava.js
const axios = require('axios');

const STRAVA_AUTH = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN = 'https://www.strava.com/oauth/token';
const STRAVA_API = 'https://www.strava.com/api/v3';

const {
  STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET,
  STRAVA_REDIRECT_URI
} = process.env;

/**
 * Gradi Strava OAuth URL
 * @param {string} state - JWT ili random string za povezivanje sesije
 * @param {string} scope - Strava scope (default: read,activity:read_all)
 */
function buildAuthUrl(state, scope = 'read,activity:read_all') {
  const cid = Number(String(STRAVA_CLIENT_ID || '').trim());
  const redirect = String(STRAVA_REDIRECT_URI || '').trim();

  if (!cid || Number.isNaN(cid)) {
    throw new Error('STRAVA_CLIENT_ID is missing/invalid. Check your .env');
  }
  if (!redirect) {
    throw new Error('STRAVA_REDIRECT_URI is missing. Check your .env');
  }

  const params = new URLSearchParams({
    client_id: String(cid),
    response_type: 'code',
    redirect_uri: redirect,
    approval_prompt: 'auto',
    scope,
    state
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

/**
 * Zamjena auth code -> access i refresh token
 */
async function exchangeCodeForToken(code) {
  const { data } = await axios.post(STRAVA_TOKEN, {
    client_id: STRAVA_CLIENT_ID,
    client_secret: STRAVA_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code'
  });
  return data;
}

/**
 * Refresh access token
 */
async function refreshAccessToken(refreshToken) {
  const { data } = await axios.post(STRAVA_TOKEN, {
    client_id: STRAVA_CLIENT_ID,
    client_secret: STRAVA_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });
  return data;
}

/**
 * GET prema Strava API-u s access tokenom
 */
async function apiGet(path, accessToken, params = {}) {
  const { data } = await axios.get(`${STRAVA_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params
  });
  return data;
}

module.exports = {
  buildAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  apiGet
};
