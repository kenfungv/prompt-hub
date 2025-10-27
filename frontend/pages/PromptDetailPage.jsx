import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Backend API expectations:
// GET    /api/prompts/:id
// POST   /api/prompts/:id/fork
// GET    /api/prompts/:id/versions
// GET    /api/prompts/:id/compare?from=..&to=..
// GET    /api/prompts/:id/stats
// GET    /api/prompts/:id/feedback?cursor=..
// POST   /api/prompts/:id/feedback   { content }
// PATCH  /api/prompts/:id/visibility { visibility: 'public' | 'private' }

const VisibilityBadge = ({ visibility }) => {
  const color = visibility === 'public' ? '#16a34a' : '#6b7280';
  const bg = visibility === 'public' ? 'rgba(22,163,74,0.1)' : 'rgba(107,114,128,0.15)';
  return (
    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 12, color, background: bg, border: `1px solid ${color}30`, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: color }} />
      {visibility}
    </span>
  );
};

const Stat = ({ label, value }) => (
  <div style={{ padding: 12, borderRadius: 8, border: '1px solid #e5e7eb', minWidth: 120 }}>
    <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
    <div style={{ fontWeight: 700, fontSize: 18 }}>{value ?? '-'}</div>
  </div>
);

const DiffView = ({ diff }) => {
  if (!diff || diff.length === 0) return <div style={{ color: '#6b7280' }}>No differences.</div>;
  const bg = { add: '#ecfdf5', remove: '#fef2f2', context: 'transparent' };
  const color = { add: '#065f46', remove: '#991b1b', context: '#111827' };
  return (
    <pre style={{ whiteSpace: 'pre-wrap', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', maxHeight: 360, overflow: 'auto', background: '#fafafa' }}>
      {diff.map((d, idx) => (
        <div key={idx} style={{ background: bg[d.type] || 'transparent', color: color[d.type] || '#111827', padding: '2px 6px', borderRadius: 4 }}>
          {d.type === 'add' ? '+ ' : d.type === 'remove' ? '- ' : '  '}{d.line}
        </div>
      ))}
    </pre>
  );
};

const FeedbackItem = ({ f }) => (
  <div style={{ borderBottom: '1px solid #e5e7eb', padding: '8px 0' }}>
    <div style={{ fontWeight: 600, fontSize: 14 }}>{f.userName || 'Anonymous'}</div>
    <div style={{ fontSize: 12, color: '#6b7280' }}>{new Date(f.createdAt).toLocaleString()}</div>
    <div style={{ marginTop: 6 }}>{f.content}</div>
  </div>
);

export default function PromptDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [prompt, setPrompt] = useState(null);
  const [stats, setStats] = useState(null);
  const [versions, setVersions] = useState([]);
  const [selectedFrom, setSelectedFrom] = useState('');
  const [selectedTo, setSelectedTo] = useState('');
  const [diff, setDiff] = useState([]);
  const [forking, setForking] = useState(false);
  const [visibilitySaving, setVisibilitySaving] = useState(false);

  // Feedback state
  const [feedback, setFeedback] = useState([]);
  const [feedbackCursor, setFeedbackCursor] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [newFeedback, setNewFeedback] = useState('');
  const [postingFeedback, setPostingFeedback] = useState(false);

  const fetchPrompt = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/prompts/${id}`);
      if (!res.ok) throw new Error(`Failed to load prompt (${res.status})`);
      const data = await res.json();
      setPrompt(data);
    } catch (e) {
      setError(e.message || 'Failed to load prompt');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/prompts/${id}/stats`);
      if (!res.ok) return;
      setStats(await res.json());
    } catch {}
  };

  const fetchVersions = async () => {
    try {
      const res = await fetch(`/api/prompts/${id}/versions`);
      if (!res.ok) return;
      const v = await res.json();
      setVersions(v);
      if (v?.length >= 2) {
        setSelectedFrom(v[v.length - 2]?.id);
        setSelectedTo(v[v.length - 1]?.id);
      } else if (v?.length === 1) {
        setSelectedFrom(v[0].id);
        setSelectedTo(v[0].id);
      }
    } catch {}
  };

  const fetchDiff = async (fromId, toId) => {
    if (!fromId || !toId) return setDiff([]);
    try {
      const res = await fetch(`/api/prompts/${id}/compare?from=${fromId}&to=${toId}`);
      if (!res.ok) return setDiff([]);
      const data = await res.json();
      setDiff(data?.diff || []);
    } catch {
      setDiff([]);
    }
  };

  const fetchFeedback = async (cursor = null) => {
    setFeedbackLoading(true);
    try {
      const url = new URL(window.location.origin + `/api/prompts/${id}/feedback`);
      if (cursor) url.searchParams.set('cursor', cursor);
      const res = await fetch(url.toString());
      if (!res.ok) return;
      const data = await res.json();
      setFeedback(prev => [...prev, ...(data.items || [])]);
      setFeedbackCursor(data.nextCursor || null);
    } catch {} finally {
      setFeedbackLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompt();
    fetchStats();
    fetchVersions();
    fetchFeedback();
  }, [id]);

  useEffect(() => {
    fetchDiff(selectedFrom, selectedTo);
  }, [selectedFrom, selectedTo]);

  const onFork = async () => {
    setForking(true);
    try {
      const res = await fetch(`/api/prompts/${id}/fork`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to fork');
      const data = await res.json();
      navigate(`/prompts/${data.id}`);
    } catch (e) {
      alert(e.message || 'Fork failed');
    } finally {
      setForking(false);
    }
  };

  const onToggleVisibility = async () => {
    if (!prompt) return;
    const next = prompt.visibility === 'public' ? 'private' : 'public';
    setVisibilitySaving(true);
    try {
      const res = await fetch(`/api/prompts/${id}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: next }),
      });
      if (!res.ok) throw new Error('Failed to update visibility');
      setPrompt(prev => ({ ...prev, visibility: next }));
    } catch (e) {
      alert(e.message || 'Update visibility failed');
    } finally {
      setVisibilitySaving(false);
    }
  };

  const onPostFeedback = async () => {
    if (!newFeedback.trim()) return;
    setPostingFeedback(true);
    try {
      const res = await fetch(`/api/prompts/${id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newFeedback.trim() }),
      });
      if (!res.ok) throw new Error('Failed to post feedback');
      const item = await res.json();
      setFeedback(prev => [item, ...prev]);
      setNewFeedback('');
    } catch (e) {
      alert(e.message || 'Failed to post');
    } finally {
      setPostingFeedback(false);
    }
  };

  const headerRight = useMemo(() => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {prompt && <VisibilityBadge visibility={prompt.visibility} />}
      <button onClick={onToggleVisibility} disabled={visibilitySaving} style={primaryGhostBtn}>
        {visibilitySaving ? 'Saving…' : prompt?.visibility === 'public' ? 'Make Private' : 'Make Public'}
      </button>
      <button onClick={onFork} disabled={forking} style={primaryBtn}>
        {forking ? 'Forking…' : 'Fork'}
      </button>
    </div>
  ), [prompt, visibilitySaving, forking]);

  if (loading) return <div style={container}>Loading…</div>;
  if (error) return <div style={container}>Error: {error}</div>;
  if (!prompt) return <div style={container}>Not found</div>;

  return (
    <div style={container}>
      <div style={header}>
        <div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>{prompt.title || 'Untitled Prompt'}</h1>
            {prompt.ownerName && (
              <span style={{ color: '#6b7280' }}>by {prompt.ownerName}</span>
            )}
          </div>
          <div style={{ marginTop: 6, color: '#374151' }}>{prompt.description}</div>
        </div>
        {headerRight}
      </div>

      <section style={card}>
        <div style={sectionHeader}>Prompt Content</div>
        <pre style={codeBox}>{prompt.content}</pre>
      </section>

      <section style={{ ...card, gap: 12 }}>
        <div style={sectionHeader}>Usage Statistics</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Stat label="Total Runs" value={stats?.runs} />
          <Stat label="Unique Users" value={stats?.users} />
          <Stat label="Avg. Tokens" value={stats?.avgTokens} />
          <Stat label="CTR" value={stats?.ctr ? `${(stats.ctr * 100).toFixed(1)}%` : '-'} />
        </div>
      </section>

      <section style={{ ...card, gap: 12 }}>
        <div style={sectionHeader}>Versions & Compare</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={selectedFrom} onChange={e => setSelectedFrom(e.target.value)} style={select}>
            {versions.map(v => (
              <option key={v.id} value={v.id}>From v{v.number} · {new Date(v.createdAt).toLocaleString()}</option>
            ))}
          </select>
          <span style={{ color: '#6b7280' }}>to</span>
          <select value={selectedTo} onChange={e => setSelectedTo(e.target.value)} style={select}>
            {versions.map(v => (
              <option key={v.id} value={v.id}>To v{v.number} · {new Date(v.createdAt).toLocaleString()}</option>
            ))}
          </select>
        </div>
        <DiffView diff={diff} />
      </section>

      <section style={{ ...card, gap: 12 }}>
        <div style={sectionHeader}>Feedback</div>
        <div>
          <textarea
            placeholder="Share your thoughts, tips, or issues..."
            value={newFeedback}
            onChange={e => setNewFeedback(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={onPostFeedback} disabled={postingFeedback || !newFeedback.trim()} style={primaryBtn}>
              {postingFeedback ? 'Posting…' : 'Post feedback'}
            </button>
          </div>
        </div>
        <div>
          {feedback.length === 0 && !feedbackLoading && (
            <div style={{ color: '#6b7280' }}>No feedback yet.</div>
          )}
          {feedback.map(f => (<FeedbackItem key={f.id} f={f} />))}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            {feedbackCursor && (
              <button onClick={() => fetchFeedback(feedbackCursor)} disabled={feedbackLoading} style={secondaryBtn}>
                {feedbackLoading ? 'Loading…' : 'Load more'}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

const container = { maxWidth: 960, margin: '0 auto', padding: 16 };
const header = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 };
const sectionHeader = { fontWeight: 700, fontSize: 16 };
const card = { border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 12, background: '#fff', display: 'flex', flexDirection: 'column' };
const codeBox = { border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, background: '#f9fafb', whiteSpace: 'pre-wrap' };
const select = { padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb' };
const primaryBtn = { background: '#111827', color: '#fff', padding: '8px 12px', borderRadius: 8, border: '1px solid #111827', cursor: 'pointer' };
const primaryGhostBtn = { background: '#fff', color: '#111827', padding: '8px 12px', borderRadius: 8, border: '1px solid #111827', cursor: 'pointer' };
const secondaryBtn = { background: '#fff', color: '#111827', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer' };
