import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../api';

export default function ChallengeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);

  // Participants modal
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [participants, setParticipants] = useState([]);

  // Leave feedback
  const [justLeft, setJustLeft] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/challenges/${id}`);
      setC(res.data); // expects: { status, participantsCount, joined, ... }
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to load challenge');
      navigate('/challenges');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const ensureAuth = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Prijavi se da bi nastavio.');
      navigate('/login');
      return false;
    }
    return true;
  };

  const join = async () => {
    try {
      if (!ensureAuth()) return;
      await API.post(`/challenges/${id}/join`);
      await load(); // točne brojke sa servera
    } catch (e) {
      alert(e?.response?.data?.error || 'Join failed');
    }
  };

  const leave = async () => {
    try {
      if (!ensureAuth()) return;
      await API.post(`/challenges/${id}/leave`);
      setJustLeft(true);
      setTimeout(() => setJustLeft(false), 1500);
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || 'Leave failed');
    }
  };

  const repeatChallenge = async () => {
    try {
      if (!ensureAuth()) return;
      const res = await API.post(`/challenges/${id}/repeat`);
      navigate(`/challenges/${res.data._id}`);
    } catch (e) {
      alert(e?.response?.data?.error || 'Repeat failed');
    }
  };

  const loadParticipants = async () => {
    try {
      const res = await API.get(`/challenges/${id}/participants`);
      setParticipants(res.data.participants || []); // [{id,name,email}]
      setParticipantsOpen(true);
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to load participants');
    }
  };

  const statusBadge = (s) => {
    const base = 'inline-block text-xs px-2 py-0.5 rounded-full';
    if (s === 'active') return <span className={`${base} bg-green-100 text-green-700`}>Active</span>;
    if (s === 'upcoming') return <span className={`${base} bg-yellow-100 text-yellow-700`}>Upcoming</span>;
    if (s === 'inactive') return <span className={`${base} bg-gray-200 text-gray-700`}>Inactive</span>;
    return null;
    };

  if (loading) return <p className="p-4">Loading...</p>;
  if (!c) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-4 p-2">
      <h1 className="text-2xl font-bold">{c.title}</h1>

      <div className="text-sm text-gray-700 space-y-1">
        <div className="flex items-center gap-2">
          <span>Type: {c.type}</span>
          {statusBadge(c.status)}
        </div>
        <div>Privacy: {c.privacy}</div>
        <div>
          Dates: {new Date(c.startDate).toLocaleDateString()} → {new Date(c.endDate).toLocaleDateString()}
        </div>
        <button className="underline text-blue-600" onClick={loadParticipants}>
          Participants: {c.participantsCount}
        </button>
      </div>

      {c.description && (
        <div className="whitespace-pre-wrap">{c.description}</div>
      )}
      {c.rules && (
        <div className="p-3 bg-gray-50 border rounded">
          <b>Rules:</b>
          <div className="whitespace-pre-wrap mt-1">{c.rules}</div>
        </div>
      )}

      <div className="flex gap-2">
        {c.joined ? (
          <button
            onClick={leave}
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            title="Click to leave"
          >
            {justLeft ? 'Leaved' : 'Joined'}
          </button>
        ) : (
          <button
            onClick={join}
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            Join
          </button>
        )}

        {c.status === 'inactive' && (
          <button
            onClick={repeatChallenge}
            className="bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-900"
            title="Create a new run of this challenge"
          >
            Repeat
          </button>
        )}
      </div>

      {/* Participants Modal */}
      {participantsOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-md">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Participants — {c.title}</h3>
              <button onClick={() => setParticipantsOpen(false)} className="text-gray-600">✕</button>
            </div>
            {participants.length === 0 ? (
              <div className="text-sm text-gray-600">No participants yet.</div>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                {participants.map(u => (
                  <li key={u.id}>{u.name || u.email}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
