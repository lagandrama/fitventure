import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../api';

export default function Challenges() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });

  const load = async (p = 1) => {
    try {
      const params = { page: p, limit: 6 };
      if (q && q.trim()) params.q = q.trim();
      if (type && type.trim()) params.type = type.trim();

      const res = await API.get('/challenges', { params });
      setItems(res.data.items);
      setMeta({ total: res.data.total, pages: res.data.pages });
      setPage(res.data.page);
    } catch (e) {
      console.error('Load challenges failed:', e?.response?.data || e.message);
      alert(e?.response?.data?.error || 'Failed to load challenges');
    }
  };

  useEffect(() => { load(1); }, []); // initial

  const join = async (id) => {
    await API.post(`/challenges/${id}/join`);
    load(page);
  };

  const leave = async (id) => {
    await API.post(`/challenges/${id}/leave`);
    load(page);
  };

  const isJoined = (challenge) => {
    const userId = localStorage.getItem('userId'); // Spremi userId nakon login-a
    return challenge.participants?.includes(userId);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
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
        <button className="bg-blue-500 text-white px-3" onClick={() => load(1)}>Filter</button>
        <Link to="/challenges/new" className="ml-auto bg-green-600 text-white px-3 py-2">Create</Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {items.map(c => (
          <div key={c._id} className="border p-4 rounded">
            <Link to={`/challenges/${c._id}`} className="text-xl font-bold underline">{c.title}</Link>
            <div className="text-sm text-gray-600">
              <div>Type: {c.type}</div>
              <div>Privacy: {c.privacy}</div>
              <div>Dates: {new Date(c.startDate).toLocaleDateString()} → {new Date(c.endDate).toLocaleDateString()}</div>
              <div>Status: {c.status}</div>
            </div>
            {/* Novi blok s gumbom */}
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

      <div className="flex items-center gap-2">
        <button disabled={page<=1} onClick={() => load(page-1)} className="border px-3 py-1">Prev</button>
        <div>Page {page} / {meta.pages}</div>
        <button disabled={page>=meta.pages} onClick={() => load(page+1)} className="border px-3 py-1">Next</button>
      </div>
    </div>
  );
}
