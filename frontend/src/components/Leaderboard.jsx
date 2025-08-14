import { useEffect, useState } from 'react';
import API from '../api';

export default function Leaderboard({ challengeId }) {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setErr('');
        const { data } = await API.get(`/challenges/${challengeId}/leaderboard`);
        setRows(data.leaderboard || []);
      } catch (e) {
        setErr(e?.response?.data?.error || 'Failed to load leaderboard');
      }
    })();
  }, [challengeId]);

  if (err) return <div className="text-red-600 text-sm">{err}</div>;
  return (
    <div className="mt-6">
      <h3 className="font-semibold mb-2">Leaderboard</h3>
      <div className="border rounded">
        {rows.map(r => (
          <div key={r.userId} className="flex justify-between px-3 py-2 border-b last:border-b-0">
            <div className="flex gap-3">
              <span className="w-6 text-right">{r.rank}.</span>
              <span>{r.name}</span>
            </div>
            <div className="font-mono">{r.total}</div>
          </div>
        ))}
        {!rows.length && <div className="px-3 py-2 text-sm opacity-70">No entries yet.</div>}
      </div>
    </div>
  );
}
