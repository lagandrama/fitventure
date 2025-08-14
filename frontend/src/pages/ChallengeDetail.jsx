// frontend/src/pages/ChallengeDetail.jsx
import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../api';

export default function ChallengeDetail() {
  const { id } = useParams();

  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const parseError = (e) =>
    e?.response?.data?.error ||
    e?.response?.data?.errors?.[0]?.msg || // express-validator format
    e?.message ||
    'Failed to load challenge';

  const load = async () => {
    try {
      setErr('');
      setLoading(true);
      const { data } = await API.get(`/challenges/${id}`); // backend vraća direktno objekt
      setChallenge(data);
    } catch (e) {
      setErr(parseError(e));
      setChallenge(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleJoin = async () => {
    try {
      await API.post(`/challenges/${challenge._id}/join`);
      await load(); // povuci svježe stanje sa servera (joined, participantsCount...)
    } catch (e) {
      alert(parseError(e));
    }
  };

  const handleLeave = async () => {
    try {
      await API.post(`/challenges/${challenge._id}/leave`);
      await load();
    } catch (e) {
      alert(parseError(e));
    }
  };

  const status = useMemo(() => {
    if (!challenge) return '';
    // koristi status sa servera ako postoji; fallback na lokalni izračun
    if (challenge.status) return prettyStatus(challenge.status);
    return statusFromDates(challenge.startDate, challenge.endDate);
  }, [challenge]);

  if (loading) return <div className="p-4">Loading…</div>;
  if (err) return <div className="p-4 text-red-600">{err}</div>;
  if (!challenge) return null;

  const {
    title, type, privacy, startDate, endDate, rules,
    participantsCount = 0, joined = false
  } = challenge;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="mb-3">
        <Link className="text-blue-600 hover:underline" to="/challenges">← Back to Challenges</Link>
      </div>

      <h1 className="text-2xl font-bold mb-2">{title}</h1>

      <div className="text-sm text-gray-700 space-y-1">
        <div><b>Type:</b> {type}</div>
        <div>
          <b>Status:</b>{' '}
          <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-green-100">
            {status}
          </span>
        </div>
        <div><b>Privacy:</b> {privacy}</div>
        <div>
          <b>Dates:</b>{' '}
          {formatDate(startDate)} → {formatDate(endDate)}
        </div>
        <div><b>Participants:</b> {participantsCount}</div>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded border">
        <div className="font-semibold mb-1">Rules:</div>
        <div className="whitespace-pre-wrap">{rules || 'No rules'}</div>
      </div>

      <div className="mt-4">
        {joined ? (
          <button
            onClick={handleLeave}
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            title="Click to leave"
          >
            Leave
          </button>
        ) : (
          <button
            onClick={handleJoin}
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            Join
          </button>
        )}
      </div>
    </div>
  );
}

// Utils
function formatDate(d) {
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString();
}

function statusFromDates(start, end) {
  const now = new Date();
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s) || isNaN(e)) return 'Active';
  if (now < s) return 'Upcoming';
  if (now > e) return 'Ended';
  return 'Active';
}

function prettyStatus(s) {
  const map = { active: 'Active', upcoming: 'Upcoming', ended: 'Ended', inactive: 'Ended' };
  return map[s] || s;
}
