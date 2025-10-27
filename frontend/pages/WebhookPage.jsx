import React, { useEffect, useMemo, useState } from 'react';

// A lightweight Webhook manager UI in a single page to meet requirements
// Supports: create new webhook, copy URL, set triggers, view logs, and save

const fakeApi = {
  list: async () => {
    // simulate fetch existing webhooks
    return [
      { id: 'wh_1', name: 'Order Created Hook', url: 'https://example.com/webhooks/order', secret: '****', triggers: ['order.created'], active: true },
    ];
  },
  create: async () => {
    // simulate creation
    const id = 'wh_' + Math.random().toString(36).slice(2, 8);
    return { id, name: 'New Webhook', url: `https://example.com/webhooks/${id}`, secret: '****', triggers: [], active: true };
  },
  save: async (items) => {
    // simulate save
    await new Promise(r => setTimeout(r, 500));
    return { ok: true, count: items.length };
  },
  logs: async (id) => {
    // simulate logs
    return [
      { id: 'lg1', status: 200, event: 'order.created', time: new Date().toISOString(), deliveryMs: 123 },
      { id: 'lg2', status: 500, event: 'order.updated', time: new Date().toISOString(), deliveryMs: 456 },
    ];
  }
};

const TriggerOptions = [
  'order.created',
  'order.updated',
  'order.cancelled',
  'user.created',
  'user.deleted',
  'invoice.paid',
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch (e) {
          console.error('Copy failed', e);
        }
      }}
      style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}
      aria-label="Copy URL"
      title="Copy URL"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function TriggerSelector({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {TriggerOptions.map(opt => {
        const checked = value.includes(opt);
        return (
          <label key={opt} style={{ border: '1px solid #eee', padding: '4px 8px', borderRadius: 6 }}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                if (e.target.checked) onChange([...value, opt]);
                else onChange(value.filter(v => v !== opt));
              }}
            />{' '}
            {opt}
          </label>
        );
      })}
    </div>
  );
}

function LogsViewer({ webhookId, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const data = await fakeApi.logs(webhookId);
      if (mounted) {
        setLogs(data);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [webhookId]);

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', width: 'min(820px, 92vw)', maxHeight: '80vh', overflow: 'auto', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Delivery Logs · {webhookId}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }} aria-label="Close">✕</button>
        </div>
        {loading ? (
          <div>Loading logs…</div>
        ) : logs.length === 0 ? (
          <div>No logs yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>Time</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>Event</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>Status</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>Delivery</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td style={{ borderBottom: '1px solid #f5f5f5', padding: 8 }}>{new Date(l.time).toLocaleString()}</td>
                  <td style={{ borderBottom: '1px solid #f5f5f5', padding: 8 }}>{l.event}</td>
                  <td style={{ borderBottom: '1px solid #f5f5f5', padding: 8 }}>{l.status}</td>
                  <td style={{ borderBottom: '1px solid #f5f5f5', padding: 8 }}>{l.deliveryMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function WebhookPage() {
  const [webhooks, setWebhooks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [viewLogsFor, setViewLogsFor] = useState(null);

  useEffect(() => {
    (async () => {
      const items = await fakeApi.list();
      setWebhooks(items);
    })();
  }, []);

  const addWebhook = async () => {
    const created = await fakeApi.create();
    setWebhooks((prev) => [created, ...prev]);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await fakeApi.save(webhooks);
    } finally {
      setSaving(false);
      alert('Webhook settings saved');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginTop: 0 }}>Webhook 管理中心</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button onClick={addWebhook} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer' }} aria-label="Create new webhook">+ 新增 Webhook</button>
        <button onClick={saveAll} disabled={saving} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: saving ? '#f5f5f5' : '#fafafa', cursor: 'pointer' }} aria-label="Save changes">{saving ? '保存中…' : '保存設定'}</button>
      </div>

      {webhooks.length === 0 ? (
        <div style={{ color: '#666' }}>尚未建立任何 webhook，點擊「新增 Webhook」開始。</div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {webhooks.map((wh, idx) => (
            <div key={wh.id} style={{ border: '1px solid #eee', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <input
                  type="text"
                  value={wh.name}
                  onChange={(e) => setWebhooks(ws => ws.map((w, i) => i === idx ? { ...w, name: e.target.value } : w))}
                  placeholder="Webhook 名稱"
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd' }}
                  aria-label={`Webhook name ${idx+1}`}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={wh.active}
                    onChange={(e) => setWebhooks(ws => ws.map((w, i) => i === idx ? { ...w, active: e.target.checked } : w))}
                    aria-label={`Activate webhook ${idx+1}`}
                  />
                  啟用
                </label>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                <input
                  type="url"
                  value={wh.url}
                  onChange={(e) => setWebhooks(ws => ws.map((w, i) => i === idx ? { ...w, url: e.target.value } : w))}
                  placeholder="https://your.endpoint/webhook"
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd' }}
                  aria-label={`Webhook URL ${idx+1}`}
                />
                <CopyButton text={wh.url} />
                <button onClick={() => setViewLogsFor(wh.id)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }} aria-label={`View logs for ${wh.id}`}>查看日誌</button>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>觸發條件</div>
                <TriggerSelector
                  value={wh.triggers || []}
                  onChange={(v) => setWebhooks(ws => ws.map((w, i) => i === idx ? { ...w, triggers: v } : w))}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {viewLogsFor && (
        <LogsViewer webhookId={viewLogsFor} onClose={() => setViewLogsFor(null)} />
      )}
    </div>
  );
}
