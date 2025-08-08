import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';

export default function ChallengeDetail() {
  const { id } = useParams();
  const [c, setC] = useState(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const res = await API.get(`/challenges/${id}`);
      setC(res.data);
    } catch {
      alert('Not found');
      navigate('/challenges');
    }
  };

  useEffect(() => { load(); }, [id]);

  const join = async () => { await API.post(`/challenges/${id}/join`); load(); };
  const leave = async () => { await API.post(`/challenges/${id}/leave`); load(); };
  const del = async () => {
    if (!confirm('Delete challenge?')) return;
    await API.delete(`/challenges/${id}`);
    navigate('/challenges');
  };

  if (!c) return <p>Loading...</p>;

  return (
    <div className="max-w-xl mx-auto space-y-2">
      <h1 className="text-2xl font-bold">{c.title}</h1>
      <div className="text-sm text-gray-600">Type: {c.type} · Privacy: {c.privacy} · Status: {c.status}</div>
      <div className="text-sm">Dates: {new Date(c.startDate).toLocaleDateString()} → {new Date(c.endDate).toLocaleDateString()}</div>
      <p className="whitespace-pre-wrap">{c.description}</p>
      {c.rules && <div className="p-2 bg-gray-50 border"><b>Rules:</b><br/>{c.rules}</div>}
      <div className="flex gap-2 mt-3">
        <button onClick={join} className="bg-blue-500 text-white px-3 py-1">Join</button>
        <button onClick={leave} className="bg-gray-500 text-white px-3 py-1">Leave</button>
        {/* Owner-only delete (frontend ne može 100% garantirati vlasništvo, backend štiti) */}
        <button onClick={del} className="bg-red-600 text-white px-3 py-1">Delete</button>
      </div>
    </div>
  );
}
