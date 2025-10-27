import React, { useEffect, useState } from 'react';

const APIKeyManager = () => {
  const [keys, setKeys] = useState([]);
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/keys/list');
        const data = await res.json();
        setKeys(data?.keys || []);
      } catch (e) {
        setMessage({ type: 'error', text: 'Failed to load API keys.' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const createKey = async () => {
    try {
      setMessage(null);
      const res = await fetch('/api/keys/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label })
      });
      const data = await res.json();
      if (data?.key) {
        setKeys([data.key, ...keys]);
        setLabel('');
        setMessage({ type: 'success', text: 'API key created.' });
      } else {
        setMessage({ type: 'error', text: data?.message || 'Create failed.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error.' });
    }
  };

  const revokeKey = async (id) => {
    try {
      const res = await fetch('/api/keys/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data?.success) {
        setKeys(keys.filter(k => k.id !== id));
      }
    } catch {}
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading keys...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-8">
        <h1 className="text-2xl font-bold text-gray-900">API Key Manager</h1>
        <p className="text-gray-500 mt-1">Create and manage your API keys.</p>

        {message && (
          <div className={`mt-6 p-3 rounded ${message.type==='error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message.text}
          </div>
        )}

        <div className="mt-8 flex gap-3">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g., Production, Dev)"
            className="flex-1 border rounded px-3 py-2"
          />
          <button onClick={createKey} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded">
            Create Key
          </button>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold">Existing Keys</h2>
          {keys.length === 0 ? (
            <p className="text-sm text-gray-500 mt-2">No keys yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-200">
              {keys.map((k) => (
                <li key={k.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm">{k.masked || k.value}</p>
                    <p className="text-xs text-gray-500">{k.label} • created {k.createdAt}</p>
                  </div>
                  <button onClick={() => revokeKey(k.id)} className="text-red-600 hover:underline">Revoke</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default APIKeyManager;
