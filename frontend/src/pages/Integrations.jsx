// frontend/src/pages/Integrations.jsx
import { useEffect, useState } from 'react';
import API from '../api';

export default function Integrations() {
  const [status, setStatus] = useState({ connected: false, athleteId: null, tokenExpiresAt: null });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await API.get('/strava/status');
      setStatus(data);
    } catch (e) {
      // Ako user nije logiran ili nije povezao Stravu:
      console.warn(e?.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const connect = () => {
    const token = localStorage.getItem('token');
    if (!token) { alert('You must be logged in.'); return; }
  // šaljemo token i kroz query (browser navigacija nema header)
    window.location.href = `${API.defaults.baseURL}/strava/connect?token=${encodeURIComponent(token)}`;
};



  const disconnect = async () => {
    if (!confirm('Disconnect Strava?')) return;
    await API.post('/strava/disconnect');
    await load();
  };

  const syncNow = async () => {
    try {
      const since24h = Math.floor((Date.now() - 24 * 3600 * 1000) / 1000);
      const { data } = await API.get(`/strava/sync?after=${since24h}&per_page=50`);
      await load();
      alert(`Synced ${data.upserts} activities (fetched ${data.fetched}).`);
    } catch (e) {
      alert(e?.response?.data?.error || 'Strava sync failed');
    }
  };

  if (loading) return <div className="p-4">Loading…</div>;

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Integrations</h1>

      <div className="border rounded p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">Strava</div>
            {status.connected ? (
              <div className="text-sm text-green-700">
                Connected as athlete #{status.athleteId}{' '}
                {status.tokenExpiresAt && (
                  <>— token expires: {new Date(status.tokenExpiresAt).toLocaleString()}</>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-600">Not connected</div>
            )}
          </div>

          <div className="flex gap-2">
            {!status.connected ? (
              <button
                onClick={connect}
                className="bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700"
              >
                Connect Strava
              </button>
            ) : (
              <>
                <button onClick={syncNow} className="border px-3 py-1 rounded">
                  Sync last 24h
                </button>
                <button
                  onClick={disconnect}
                  className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                >
                  Disconnect
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        Napomena: “Sync last 24h” povlači nedavne aktivnosti sa Strave i sprema ih u bazu. Napredak
        u challengu računa se iz tih aktivnosti.
      </p>
    </div>
  );
}
