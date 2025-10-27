import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

// Fully client-programmed UI: no external UI libraries
const chipStyle = (active) => ({
  padding: '6px 10px',
  borderRadius: 999,
  border: `1px solid ${active ? '#4f46e5' : '#e5e7eb'}`,
  color: active ? '#4338ca' : '#374151',
  background: active ? '#eef2ff' : '#ffffff',
  fontSize: 12,
  fontWeight: 600,
  marginRight: 8,
});

const sectionCard = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 16,
};

const row = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
};

const label = { width: 140, color: '#4b5563', fontSize: 13, fontWeight: 600 };
const input = {
  flex: 1,
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  outline: 'none',
  fontSize: 14,
};

const button = (variant = 'primary') => ({
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid transparent',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 14,
  ...(variant === 'primary'
    ? { background: '#4f46e5', color: '#ffffff' }
    : variant === 'danger'
    ? { background: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' }
    : { background: '#f3f4f6', color: '#111827' }),
});

const badge = (color = '#10b981') => ({
  padding: '2px 8px',
  fontSize: 12,
  borderRadius: 999,
  color: '#ffffff',
  background: color,
  fontWeight: 700,
});

const UserProfile = () => {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ displayName: '', email: '', avatar: '' });
  const [saving, setSaving] = useState(false);

  const tierColor = useMemo(() => ({
    Free: '#6b7280',
    Pro: '#2563eb',
    Enterprise: '#a21caf',
  }), []);

  const loadMe = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('/api/user/me');
      setMe(data.user || data);
      setForm({
        displayName: data.user?.displayName || data.displayName || '',
        email: data.user?.email || data.email || '',
        avatar: data.user?.avatar || data.avatar || '',
      });
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
  }, []);

  const can = (perm) => {
    // Frontend RBAC/ABAC (mirrors backend claims if sent in JWT/me endpoint)
    const roles = new Set(me?.roles || []);
    const tier = me?.tier || me?.subscription?.plan || 'Free';
    const claims = new Set(me?.permissions || []);

    // Simple matrix
    const roleAllows = {
      admin: ['user:read', 'user:update', 'billing:manage', 'api:keys', 'admin:panel'],
      manager: ['user:read', 'user:update', 'billing:manage', 'api:keys'],
      user: ['user:read', 'api:keys'],
    };

    // Tier modifiers
    const tierAdds = {
      Free: [],
      Pro: ['workspace:pro'],
      Enterprise: ['workspace:enterprise', 'sso:manage'],
    };

    const allowed = new Set([
      ...Array.from(roles).flatMap((r) => roleAllows[r] || []),
      ...(tierAdds[tier] || []),
      ...Array.from(claims),
    ]);

    return allowed.has(perm);
  };

  const onSave = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await axios.put('/api/user/me', {
        displayName: form.displayName,
        email: form.email,
        avatar: form.avatar,
      });
      setMe((m) => ({ ...m, ...data.user, ...data }));
      setEditing(false);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const onLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
      window.location.href = '/login';
    } catch (e) {
      // still redirect
      window.location.href = '/login';
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading profile…</div>;
  if (error) return (
    <div style={{ padding: 24 }}>
      <div style={{ ...sectionCard, borderColor: '#fecaca', background: '#fef2f2' }}>
        <div style={{ color: '#991b1b', fontWeight: 700 }}>Error</div>
        <div style={{ color: '#7f1d1d', marginTop: 6 }}>{error}</div>
        <div style={{ marginTop: 12 }}>
          <button onClick={loadMe} style={button('secondary')}>Retry</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto', display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Account</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={badge(tierColor[me?.tier || me?.subscription?.plan || 'Free'])}>
            {me?.tier || me?.subscription?.plan || 'Free'}
          </span>
          {me?.roles?.includes('admin') && <span style={badge('#7c3aed')}>Admin</span>}
          <button onClick={onLogout} style={button('secondary')}>Log out</button>
        </div>
      </div>

      <div style={{ ...sectionCard, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <img
            src={form.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(me?.displayName || me?.username || 'U')}
            alt="avatar"
            style={{ width: 64, height: 64, borderRadius: 12, border: '1px solid #e5e7eb' }}
          />
          <div style={{ display: 'grid' }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{me?.displayName || me?.username}</div>
            <div style={{ color: '#6b7280', fontSize: 13 }}>{me?.email}</div>
            <div style={{ display: 'flex', marginTop: 6 }}>
              <div style={chipStyle(true)}>User ID: {me?._id || me?.id}</div>
              {me?.roles?.map((r) => (
                <div key={r} style={chipStyle(false)}>{r}</div>
              ))}
            </div>
          </div>
        </div>

        {!editing ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditing(true)} style={button('primary')}>Edit profile</button>
            {can('billing:manage') && (
              <a href="/subscription" style={{ ...button('secondary'), textDecoration: 'none', display: 'inline-block' }}>Manage subscription</a>
            )}
            {can('admin:panel') && (
              <a href="/admin" style={{ ...button('secondary'), textDecoration: 'none', display: 'inline-block' }}>Admin Panel</a>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={row}>
              <div style={label}>Display name</div>
              <input style={input} value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />
            </div>
            <div style={row}>
              <div style={label}>Email</div>
              <input style={input} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div style={row}>
              <div style={label}>Avatar URL</div>
              <input style={input} value={form.avatar} onChange={(e) => setForm((f) => ({ ...f, avatar: e.target.value }))} placeholder="https://..." />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={saving} onClick={onSave} style={button('primary')}>{saving ? 'Saving…' : 'Save'}</button>
              <button disabled={saving} onClick={() => { setEditing(false); loadMe(); }} style={button('secondary')}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ ...sectionCard, display: 'grid', gap: 8 }}>
        <div style={{ fontWeight: 700 }}>Access</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <div style={chipStyle(can('user:read'))}>Can read profile</div>
          <div style={chipStyle(can('user:update'))}>Can update profile</div>
          <div style={chipStyle(can('api:keys'))}>API Keys</div>
          <div style={chipStyle(can('billing:manage'))}>Billing</div>
          <div style={chipStyle(can('admin:panel'))}>Admin</div>
          <div style={chipStyle(me?.subscription?.status === 'active')}>Subscription active</div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
