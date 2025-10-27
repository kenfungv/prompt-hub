import React, { useEffect, useMemo, useState } from 'react';

// Admin tabs configuration
const tabs = [
  { id: 'users', label: 'User Management' },
  { id: 'prompts', label: 'Prompt Moderation' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'teams', label: 'Team Collaboration' },
  { id: 'integrations', label: 'Webhooks & API Keys' },
  { id: 'settings', label: 'Settings' },
];

export default function AdminPanel() {
  const [active, setActive] = useState('users');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // master overview so each tab has quick context
  const [overview, setOverview] = useState({
    users: [],
    prompts: [],
    subscriptions: [],
    teams: [],
    webhooks: [],
    apiKeys: [],
    settings: {},
    stats: {},
  });

  const showToast = (type, text) => setMessage({ type, text });

  const refreshOverview = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/overview');
      const json = await res.json();
      setOverview((prev) => ({ ...prev, ...(json || {}) }));
    } catch (e) {
      showToast('error', 'Failed to load admin overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshOverview();
  }, []);

  // Actions: Users
  const updateUserRole = async (userId, role) => {
    try {
      setLoading(true);
      await fetch('/api/admin/users/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });
      showToast('success', 'User role updated');
      refreshOverview();
    } catch (e) {
      showToast('error', 'Failed to update user role');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId, suspended) => {
    try {
      setLoading(true);
      await fetch('/api/admin/users/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, suspended }),
      });
      showToast('success', suspended ? 'User suspended' : 'User reactivated');
      refreshOverview();
    } catch (e) {
      showToast('error', 'Failed to update user status');
    } finally {
      setLoading(false);
    }
  };

  // Actions: Prompts
  const reviewPrompt = async (promptId, decision, reason) => {
    try {
      setLoading(true);
      await fetch('/api/admin/prompts/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId, decision, reason }),
      });
      showToast('success', `Prompt ${decision}`);
      refreshOverview();
    } catch (e) {
      showToast('error', 'Failed to review prompt');
    } finally {
      setLoading(false);
    }
  };

  // Actions: Subscriptions
  const updateSubscription = async (userId, planId, status) => {
    try {
      setLoading(true);
      await fetch('/api/admin/subscriptions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, planId, status }),
      });
      showToast('success', 'Subscription updated');
      refreshOverview();
    } catch (e) {
      showToast('error', 'Failed to update subscription');
    } finally {
      setLoading(false);
    }
  };

  // Actions: Teams
  const addMemberToTeam = async (teamId, userId, role) => {
    try {
      setLoading(true);
      await fetch('/api/admin/teams/add-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, userId, role }),
      });
      showToast('success', 'Member added to team');
      refreshOverview();
    } catch (e) {
      showToast('error', 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async (name) => {
    try {
      setLoading(true);
      await fetch('/api/admin/teams/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      showToast('success', 'Team created');
      refreshOverview();
    } catch (e) {
      showToast('error', 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  // Actions: Integrations (Webhooks & API Keys)
  const testWebhook = async (webhookId) => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookId }),
      });
      const json = await res.json();
      showToast('success', `Webhook test: ${json?.status || 'ok'}`);
    } catch (e) {
      showToast('error', 'Failed to test webhook');
    } finally {
      setLoading(false);
    }
  };

  const revokeApiKey = async (keyId) => {
    try {
      setLoading(true);
      await fetch('/api/admin/api-keys/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId }),
      });
      showToast('success', 'API key revoked');
      refreshOverview();
    } catch (e) {
      showToast('error', 'Failed to revoke API key');
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async (ownerId, scopes) => {
    try {
      setLoading(true);
      await fetch('/api/admin/api-keys/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId, scopes }),
      });
      showToast('success', 'API key created');
      refreshOverview();
    } catch (e) {
      showToast('error', 'Failed to create API key');
    } finally {
      setLoading(false);
    }
  };

  const filteredPrompts = useMemo(() => overview.prompts || [], [overview.prompts]);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-500">Manage users, prompts, subscriptions, teams, and integrations.</p>
          </div>
          {loading && (
            <div className="text-sm text-gray-500 animate-pulse">Loading…</div>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-2 border-b overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`px-4 py-2 -mb-px border-b-2 whitespace-nowrap ${
                active === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Toast */}
        {message && (
          <div className={`mt-4 rounded border px-4 py-3 text-sm ${
            message.type === 'error' ? 'border-red-300 text-red-700 bg-red-50' : 'border-green-300 text-green-700 bg-green-50'
          }`}
          >
            {message.text}
          </div>
        )}

        {/* Panels */}
        <div className="mt-6 space-y-8">
          {active === 'users' && (
            <section>
              <h2 className="text-xl font-semibold mb-3">User Tier & Permission Management</h2>
              <div className="overflow-x-auto rounded border bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">User</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Email</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Role</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Tier</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Status</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(overview.users || []).map((u) => (
                      <tr key={u.id} className="border-t">
                        <td className="px-3 py-2">{u.name || '-'}</td>
                        <td className="px-3 py-2">{u.email}</td>
                        <td className="px-3 py-2">
                          <select
                            className="border rounded px-2 py-1"
                            value={u.role}
                            onChange={(e) => updateUserRole(u.id, e.target.value)}
                          >
                            <option value="user">User</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="border rounded px-2 py-1"
                            value={u.tier || 'free'}
                            onChange={(e) => updateSubscription(u.id, e.target.value, u.subscriptionStatus)}
                          >
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="team">Team</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">{u.suspended ? 'Suspended' : 'Active'}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
                            onClick={() => toggleUserStatus(u.id, !u.suspended)}
                          >
                            {u.suspended ? 'Reactivate' : 'Suspend'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {active === 'prompts' && (
            <section>
              <h2 className="text-xl font-semibold mb-3">Prompt Moderation</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPrompts.map((p) => (
                  <div key={p.id} className="rounded border bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{p.title || `Prompt ${p.id}`}</div>
                        <div className="text-xs text-gray-500">by {p.author?.name || p.authorEmail}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded border ${
                        p.status === 'approved' ? 'border-green-300 text-green-700 bg-green-50' :
                        p.status === 'rejected' ? 'border-red-300 text-red-700 bg-red-50' :
                        'border-gray-300 text-gray-700 bg-gray-50'
                      }`}>
                        {p.status || 'pending'}
                      </span>
                    </div>
                    <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto max-h-40 whitespace-pre-wrap">{p.content}</pre>
                    <div className="mt-3 flex gap-2">
                      <button className="px-3 py-1 text-sm rounded border hover:bg-gray-50" onClick={() => reviewPrompt(p.id, 'approved')}>Approve</button>
                      <button className="px-3 py-1 text-sm rounded border hover:bg-gray-50" onClick={() => reviewPrompt(p.id, 'rejected')}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {active === 'subscriptions' && (
            <section>
              <h2 className="text-xl font-semibold mb-3">Subscription Management</h2>
              <div className="overflow-x-auto rounded border bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">User</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Plan</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Status</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Renewal</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(overview.subscriptions || []).map((s) => (
                      <tr key={s.userId} className="border-t">
                        <td className="px-3 py-2">{s.userName || s.email}</td>
                        <td className="px-3 py-2">
                          <select
                            className="border rounded px-2 py-1"
                            value={s.planId}
                            onChange={(e) => updateSubscription(s.userId, e.target.value, s.status)}
                          >
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="team">Team</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">{s.status}</td>
                        <td className="px-3 py-2">{s.renewsAt ? new Date(s.renewsAt).toLocaleDateString() : '-'}</td>
                        <td className="px-3 py-2 text-right">
                          <button className="text-sm px-3 py-1 rounded border hover:bg-gray-50" onClick={() => updateSubscription(s.userId, s.planId, s.status === 'active' ? 'canceled' : 'active')}>
                            {s.status === 'active' ? 'Cancel' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {active === 'teams' && (
            <section>
              <h2 className="
