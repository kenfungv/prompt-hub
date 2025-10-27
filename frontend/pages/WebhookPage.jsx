import React, { useEffect, useState } from 'react';

// WebhookPage: full-featured manager UI
// Features: list/create/update/delete, activate, triggers, logs/history, test delivery, save

const api = {
  list: async () => [
    { id: 'wh_1', name: 'Order Created Hook', url: 'https://example.com/webhooks/order', secret: '****', triggers: ['order.created'], active: true, createdAt: Date.now() - 86400000 },
  ],
  create: async () => {
    const id = 'wh_' + Math.random().toString(36).slice(2, 8);
    return { id, name: 'New Webhook', url: `https://example.com/webhooks/${id}`, secret: '', triggers: [], active: true, createdAt: Date.now() };
  },
  update: async (item) => { await new Promise(r => setTimeout(r, 150)); return { ok: true, item }; },
  delete: async (id) => { await new Promise(r => setTimeout(r, 150)); return { ok: true }; },
  saveAll: async (items) => { await new Promise(r => setTimeout(r, 300)); return { ok: true, count: items.length }; },
  logs: async (id) => [
    { id: 'lg1', status: 200, event: 'order.created', time: new Date().toISOString(), deliveryMs: 123, attempt: 1 },
    { id: 'lg2', status: 500, event: 'order.updated', time: new Date().toISOString(), deliveryMs: 456, attempt: 1 },
  ],
  triggersHistory: async (id) => [
    { id: 'th1', event: 'order.created', time: new Date().toISOString() },
    { id: 'th2', event: 'user.created', time: new Date().toISOString() },
  ],
  testDelivery: async (id, payload) => { await new Promise(r => setTimeout(r, 300)); const ok = Math.random() > 0.2; return { ok, status: ok ? 200 : 500, deliveryMs: Math.floor(50 + Math.random()*300), payload }; },
};

const TriggerOptions = [ 'order.created', 'order.updated', 'order.cancelled', 'user.created', 'user.deleted', 'invoice.paid' ];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false), 1200);} catch(e){ console.error(e);} }} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }} aria-label="Copy URL">{copied ? 'Copied' : 'Copy'}</button>
  );
}

function TriggerSelector({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {TriggerOptions.map(opt => (
        <label key={opt} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={value.includes(opt)} onChange={(e)=> onChange(e.target.checked ? [...value, opt] : value.filter(v=>v!==opt))} /> {opt}
        </label>
      ))}
    </div>
  );
}

function LogsViewer({ webhookId, onClose }) {
  const [logs, setLogs] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(()=>{ let m=true; (async()=>{ setLoading(true); const data = await api.logs(webhookId); if(m){ setLogs(data); setLoading(false);} })(); return ()=>{ m=false; }; }, [webhookId]);
  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', zIndex: 50 }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 16, width: 720, maxHeight: '80vh', overflow: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Delivery Logs · {webhookId}</h3>
          <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 0, cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        {loading ? 'Loading logs…' : logs.length === 0 ? 'No logs yet.' : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Time</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Event</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Status</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Delivery</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Attempt</th>
            </tr></thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>{new Date(l.time).toLocaleString()}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>{l.event}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>{l.status}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>{l.deliveryMs} ms</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>{l.attempt ?? 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function TriggerHistory({ webhookId, onClose }) {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(()=>{ let m=true; (async()=>{ setLoading(true); const data = await api.triggersHistory(webhookId); if(m){ setItems(data); setLoading(false);} })(); return ()=>{ m=false; }; }, [webhookId]);
  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', zIndex: 50 }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 16, width: 640, maxHeight: '80vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Trigger History · {webhookId}</h3>
          <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 0, cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        {loading ? 'Loading…' : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {items.map(i => (
              <li key={i.id} style={{ padding: '8px 0', borderBottom: '1px solid #f2f2f2' }}>
                <div style={{ fontWeight: 500 }}>{i.event}</div>
                <div style={{ color: '#6b7280', fontSize: 12 }}>{new Date(i.time).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function WebhookPage() {
  const [webhooks, setWebhooks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [viewLogsFor, setViewLogsFor] = useState(null);
  const [viewHistoryFor, setViewHistoryFor] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => { (async () => { const items = await api.list(); setWebhooks(items); })(); }, []);

  const addWebhook = async () => { const created = await api.create(); setWebhooks(prev => [created, ...prev]); };
  const removeWebhook = async (id) => { if (!confirm('確定要刪除此 Webhook？')) return; const res = await api.delete(id); if (res.ok) setWebhooks(prev => prev.filter(w => w.id !== id)); };
  const saveAll = async () => { setSaving(true); try { await api.saveAll(webhooks); alert('Webhook settings saved'); } finally { setSaving(false); } };
  const runTest = async (id) => { setTesting(true); try { const payload = { event: 'ping', timestamp: Date.now(), sample: true }; const res = await api.testDelivery(id, payload); alert(`Test ${(res.ok ? '成功' : '失敗')} · 狀態 ${res.status} · ${res.deliveryMs}ms`); } catch(e){ console.error(e); alert('測試發送失敗'); } finally { setTesting(false); } };

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>Webhook 管理中心</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button aria-label="Create new webhook" style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer' }} onClick={addWebhook}>+ 新增 Webhook</button>
        <button aria-label="Save changes" disabled={saving} style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', border: '1px solid #ddd', background: saving ? '#f3f4f6' : '#fff' }} onClick={saveAll}>{saving ? '保存中…' : '保存設定'}</button>
      </div>

      {webhooks.length === 0 ? (
        <div style={{ color: '#6b7280' }}>尚未建立任何 webhook，點擊「新增 Webhook」開始。</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {webhooks.map((wh, idx) => (
            <div key={wh.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                <input type="text" value={wh.name} onChange={(e)=> setWebhooks(ws => ws.map((w,i)=> i===idx? { ...w, name: e.target.value } : w))} placeholder="Webhook 名稱" style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd' }} aria-label={`Webhook name ${idx+1}`} />
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={wh.active} onChange={(e)=> setWebhooks(ws => ws.map((w,i)=> i===idx? { ...w, active: e.target.checked } : w))} aria-label={`Activate webhook ${idx+1}`} />
                  啟用
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <input type="url" value={wh.url} onChange={(e)=> setWebhooks(ws => ws.map((w,i)=> i===idx? { ...w, url: e.target.value } : w))} placeholder="https://your.endpoint/webhook" style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd' }} aria-label={`Webhook URL ${idx+1}`} />
                <CopyButton text={wh.url} />
                <button onClick={()=> setViewLogsFor(wh.id)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }} aria-label={`View logs for ${wh.id}`}>查看日誌</button>
                <button onClick={()=> setViewHistoryFor(wh.id)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }} aria-label={`View trigger history for ${wh.id}`}>觸發紀錄</button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <input type="text" value={wh.secret || ''} onChange={(e)=> setWebhooks(ws => ws.map((w,i)=> i===idx? { ...w, secret: e.target.value } : w))} placeholder="簽名密鑰（可選）" style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd' }} aria-label={`Webhook secret ${idx+1}`} />
                <button onClick={()=> runTest(wh.id)} disabled={testing} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', background: testing? '#f3f4f6': '#fff' }} aria-label={`Test webhook ${wh.id}`}>{testing? '測試中…' : '測試發送'}</button>
                <button onClick={()=> removeWebhook(wh.id)} style={{ padding: '6px 10px', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: 6, cursor: 'pointer', background: '#fff' }} aria-label={`Delete webhook ${wh.id}`}>刪除</button>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ color: '#374151', fontSize: 14, marginBottom: 6 }}>觸發條件</div>
                <TriggerSelector value={wh.triggers || []} onChange={(v)=> setWebhooks(ws => ws.map((w,i)=> i===idx? { ...w, triggers: v } : w))} />
              </div>
            </div>
          ))}
        </div>
      )}

      {viewLogsFor && (<LogsViewer webhookId={viewLogsFor} onClose={()=> setViewLogsFor(null)} />)}
      {viewHistoryFor && (<TriggerHistory webhookId={viewHistoryFor} onClose={()=> setViewHistoryFor(null)} />)}
    </div>
  );
}
