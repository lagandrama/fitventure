import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../api';

export default function Challenges() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState(''); // '', 'active', 'upcoming', 'inactive'
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });

  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [participantsTitle, setParticipantsTitle] = useState('');

  const load = async (p = 1) => {
    try {
      const params = { page: p, limit: 6 };
      if (q.trim()) params.q = q.trim();
      if (type.trim()) params.type = type.trim();
      if (status.trim()) params.status = status.trim();

      const res = await API.get('/challenges', { params });
      setItems(res.data.items);
      setMeta({ total: res.data.total, pages: res.data.pages });
      setPage(res.data.page);
    } catch (e) {
      console.error('Load challenges failed:', e?.response?.data || e.message);
      alert(e?.response?.data?.error || 'Failed to load challenges');
    }
  };

  useEffect(() => { load(1); }, []);

  const join = async (id) => {
    try {
      await API.post(`/challenges/${id}/join`);
      await load(page);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to join challenge");
    }
  };

  const leave = async (id) => {
    try {
      await API.post(`/challenges/${id}/leave`);
      await load(page);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to leave challenge");
    }
  };

  const isJoined = (challenge) => {
    const userId = localStorage.getItem('userId');
    return challenge.joined || challenge.participants?.includes(userId);
  };

  const statusBadge = (s) => {
    const base = "inline-block text-xs px-2 py-0.5 rounded-full";
    if (s === 'active') return <span className={`${base} bg-green-100 text-green-700`}>Active</span>;
    if (s === 'upcoming') return <span className={`${base} bg-yellow-100 text-yellow-700`}>Upcoming</span>;
    if (s === 'inactive') return <span className={`${base} bg-gray-200 text-gray-700`}>Inactive</span>;
    return null;
  };

  const openParticipants = async (c) => {
    try {
      const res = await API.get(`/challenges/${c._id}/participants`);
      setParticipants(res.data.participants || []);
      setParticipantsTitle(c.title);
      setParticipantsOpen(true);
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to load participants');
    }
  };

  return (
    <div className="space-y-4">
      {/* FILTERS */}
      <div className="flex gap-2 flex-wrap">
        <input className="border p-2" placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} />
        <select className="border p-2" value={type} onChange={e => setType(e.target.value)}>
          <option value="">All types</option>
          <option value="running">Running</option>
          <option value="yoga">Yoga</option>
          <option value="hiit">HIIT</option>
          <option value="steps">Steps</option>
          <option value="weightloss">Weight Loss</option>
          <option value="custom">Custom</option>
        </select>
        <select className="border p-2" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Status: All</option>
          <option value="active">Active</option>
          <option value="upcoming">Upcoming</option>
          <option value="inactive">Inactive</option>
        </select>
        <button className="bg-blue-500 text-white px-3" onClick={() => load(1)}>Filter</button>
        <Link to="/challenges/new" className="ml-auto bg-green-600 text-white px-3 py-2">Create</Link>
      </div>

      {/* LISTA */}
      <div className="grid md:grid-cols-2 gap-4">
        {items.map(c => (
          <div key={c._id} className="border p-4 rounded space-y-2">
            <Link to={`/challenges/${c._id}`} className="text-xl font-bold underline">{c.title}</Link>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center gap-2">
                <span>Type: {c.type}</span>
                {statusBadge(c.status)}
              </div>
              <div>Privacy: {c.privacy}</div>
              <div>Dates: {new Date(c.startDate).toLocaleDateString()} → {new Date(c.endDate).toLocaleDateString()}</div>
              <button
                className="underline text-blue-600"
                onClick={() => openParticipants(c)}
              >
                Participants: {c.participantsCount}
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              {isJoined(c) ? (
                <button
                  onClick={() => leave(c._id)}
                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  title="Click to leave"
                >
                  Joined
                </button>
              ) : (
                <button
                  onClick={() => join(c._id)}
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  Join
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* PAGINATION */}
      <div className="flex items-center gap-2">
        <button disabled={page<=1} onClick={() => load(page-1)} className="border px-3 py-1">Prev</button>
        <div>Page {page} / {meta.pages}</div>
        <button disabled={page>=meta.pages} onClick={() => load(page+1)} className="border px-3 py-1">Next</button>
      </div>

      {/* PARTICIPANTS MODAL */}
      {participantsOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-md">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Participants — {participantsTitle}</h3>
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
