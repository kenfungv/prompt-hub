import React, { useEffect, useState } from 'react';

const tabs = [
  { id: 'users', label: 'User Management' },
  { id: 'prompts', label: 'Prompt Moderation' },
  { id: 'billing', label: 'Billing' },
  { id: 'settings', label: 'Settings' },
];

const AdminPanel = () => {
  const [active, setActive] = useState('users');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ users: [], prompts: [], billing: {}, settings: {} });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/overview`);
        const json = await res.json();
        setData(json || {});
      } catch (e) {
        setMessage({ type: 'error', text: 'Failed to load admin overview.' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const approvePrompt = async (id) => {
    await fetch('/api/admin/prompts/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
  };

  const suspendUser = async (id) => {
    await fetch('/api/admin/users/suspend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-500">Manage users, prompts, billing and settings.</p>

        <div className="mt-6 flex gap-2 border-b">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`px-4 py-2 -mb-px border-b-2 ${active===t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {message && (
          <div className={`mt-4 p-3 rounded ${message.type==='error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="mt-10 text-gray-600">Loading...</div>
        ) : (
          <div className="mt-8 bg-white rounded-xl shadow p-6">
            {active === 'users' && (
              <div>
                <h2 className="text-xl font-semibold">Users</h2>
                <ul className="mt-4 divide-y divide-gray-200">
                  {data.users?.map(u => (
                    <li key={u.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{u.name} <span className="text-gray-500">({u.email})</span></p>
                        <p className="text-xs text-gray-500">Role: {u.role} • Status: {u.status}</p>
                      </div>
                      <div className="space-x-2">
                        <button onClick={() => suspendUser(u.id)} className="text-red-600 hover:underline">Suspend</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {active === 'prompts' && (
              <div>
                <h2 className="text-xl font-semibold">Prompt Moderation</h2>
                <ul className="mt-4 divide-y divide-gray-200">
                  {data.prompts?.map(p => (
                    <li key={p.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{p.title}</p>
                        <p className="text-xs text-gray-500">by {p.author}</p>
                      </div>
                      <button onClick={() => approvePrompt(p.id)} className="text-green-700 hover:underline">Approve</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {active === 'billing' && (
              <div>
                <h2 className="text-xl font-semibold">Billing Overview</h2>
                <pre className="mt-4 bg-gray-50 p-4 rounded text-sm overflow-auto">{JSON.stringify(data.billing || {}, null, 2)}</pre>
              </div>
            )}

            {active === 'settings' && (
              <div>
                <h2 className="text-xl font-semibold">System Settings</h2>
                <pre className="mt-4 bg-gray-50 p-4 rounded text-sm overflow-auto">{JSON.stringify(data.settings || {}, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
