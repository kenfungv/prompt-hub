import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

// API Plugin type definition
export type APIPlugin = {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  version?: string;
  author?: string;
  homepage?: string;
  scopes?: string[]; // permissions requested by plugin
  categories?: string[];
  integrationTargets?: ('Zapier'|'Slack'|'Notion'|'Webhook'|'Custom')[];
  webhookUrl?: string; // for prompt microservice callbacks
  isPrivate?: boolean;
  listingStatus?: 'draft'|'submitted'|'approved'|'rejected';
  price?: number; // in cents
  currency?: string; // ISO 4217 e.g. USD
  installCount?: number;
  rating?: number; // avg 0-5
  ratingCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

// Simple client to backend routes
async function api(path: string, init?: RequestInit) {
  const res = await fetch(`/api/plugins${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const EmptyState: React.FC<{onCreate: ()=>void}> = ({ onCreate }) => (
  <div style={{padding: 24, border: '1px dashed #ddd', borderRadius: 8}}>
    <h3>Manage APIs & Plugin Marketplace</h3>
    <p>Create plugins to integrate Prompts/Agents with Zapier, Notion, Slack and webhooks.</p>
    <button onClick={onCreate}>New Plugin</button>
  </div>
);

const PluginForm: React.FC<{
  value: Partial<APIPlugin>;
  onChange: (v: Partial<APIPlugin>) => void;
  onSubmit: ()=>void;
  submitting?: boolean;
}> = ({ value, onChange, onSubmit, submitting }) => {
  const set = (k: keyof APIPlugin) => (e: any) => onChange({ ...value, [k]: e.target?.value ?? e });
  const setChecked = (k: keyof APIPlugin) => (e: any) => onChange({ ...value, [k]: e.target?.checked });

  return (
    <form onSubmit={(e)=>{e.preventDefault(); onSubmit();}} style={{display:'grid', gap:12}}>
      <label>
        Name
        <input required value={value.name||''} onChange={set('name')} />
      </label>
      <label>
        Slug
        <input required value={value.slug||''} onChange={set('slug')} placeholder="unique-id" />
      </label>
      <label>
        Description
        <textarea value={value.description||''} onChange={set('description')} />
      </label>
      <label>
        Version
        <input value={value.version||''} onChange={set('version')} placeholder="0.1.0" />
      </label>
      <label>
        Homepage
        <input value={value.homepage||''} onChange={set('homepage')} placeholder="https://..." />
      </label>
      <label>
        Categories (comma separated)
        <input value={(value.categories||[]).join(',')} onChange={(e)=> onChange({...value, categories: e.target.value.split(',').map((s:string)=>s.trim()).filter(Boolean)})} />
      </label>
      <label>
        Scopes (comma separated)
        <input value={(value.scopes||[]).join(',')} onChange={(e)=> onChange({...value, scopes: e.target.value.split(',').map((s:string)=>s.trim()).filter(Boolean)})} />
      </label>
      <fieldset>
        <legend>Integrations</legend>
        {['Zapier','Notion','Slack','Webhook','Custom'].map((opt)=>{
          const list = value.integrationTargets||[];
          const checked = list.includes(opt as any);
          return (
            <label key={opt} style={{marginRight:12}}>
              <input type="checkbox" checked={checked} onChange={(e)=>{
                const next = e.target.checked ? [...list, opt as any] : list.filter(i=>i!==opt);
                onChange({...value, integrationTargets: next});
              }} /> {opt}
            </label>
          );
        })}
      </fieldset>
      {value.integrationTargets?.includes('Webhook') && (
        <label>
          Webhook URL
          <input value={value.webhookUrl||''} onChange={set('webhookUrl')} placeholder="https://example.com/webhook" />
        </label>
      )}
      <label>
        Private listing
        <input type="checkbox" checked={!!value.isPrivate} onChange={setChecked('isPrivate')} />
      </label>
      <label>
        Price (USD)
        <input type="number" min={0} step={1} value={value.price ?? 0} onChange={(e)=> onChange({...value, price: Number(e.target.value), currency: 'USD'})} />
      </label>
      <div style={{display:'flex', gap:8}}>
        <button type="submit" disabled={submitting}>{submitting? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );
};

const ReviewBadge: React.FC<{status?: APIPlugin['listingStatus']}> = ({ status }) => {
  const color = useMemo(()=>({draft:'#999', submitted:'#c67c00', approved:'#22863a', rejected:'#d73a49'}[status||'draft']),[status]);
  return <span style={{padding:'2px 6px', borderRadius:4, background: color, color:'#fff'}}>{status||'draft'}</span>
}

const APIPluginsPage: React.FC = () => {
  const [plugins, setPlugins] = useState<APIPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|undefined>();
  const [editing, setEditing] = useState<Partial<APIPlugin>|null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api('/');
      setPlugins(data);
    } catch (e:any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{ load(); },[]);

  const submit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const body = JSON.stringify(editing);
      if (editing.id) await api(`/${editing.id}`, { method:'PUT', body });
      else await api(`/`, { method:'POST', body });
      await load();
      setEditing(null);
    } catch (e:any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete plugin?')) return;
    await api(`/${id}`, { method: 'DELETE' });
    await load();
  };

  const submitForReview = async (id: string) => {
    await api(`/${id}/submit`, { method: 'POST' });
    await load();
  }

  const refund = async (id: string) => {
    await api(`/${id}/refund`, { method: 'POST' });
    await load();
  }

  return (
    <div style={{padding:24}}>
      <h1>API & Plugin Marketplace</h1>
      <p>Manage API credentials, integrations, marketplace listing, reviews, and transactions.</p>

      {loading && <p>Loading...</p>}
      {error && <p style={{color:'red'}}>{error}</p>}

      {!loading && plugins.length===0 && (
        <EmptyState onCreate={()=> setEditing({ name:'', slug:'', isPrivate:false, price:0, currency:'USD', listingStatus:'draft' })} />
      )}

      {!loading && plugins.length>0 && (
        <div style={{marginTop:16}}>
          <button onClick={()=> setEditing({ name:'', slug:'', isPrivate:false, price:0, currency:'USD', listingStatus:'draft' })}>New Plugin</button>
          <table style={{width:'100%', marginTop:12, borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <th align="left">Name</th>
                <th align="left">Slug</th>
                <th align="left">Status</th>
                <th align="left">Installs</th>
                <th align="left">Rating</th>
                <th align="left">Price</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {plugins.map(p=> (
                <tr key={p.id} style={{borderTop:'1px solid #eee'}}>
                  <td>{p.name}</td>
                  <td>{p.slug}</td>
                  <td><ReviewBadge status={p.listingStatus} /></td>
                  <td>{p.installCount||0}</td>
                  <td>{p.rating? `${p.rating.toFixed(1)} (${p.ratingCount||0})` : '—'}</td>
                  <td>{p.price? `$${(p.price/100).toFixed(2)}` : 'Free'}</td>
                  <td style={{textAlign:'right'}}>
                    <button onClick={()=> setEditing(p)}>Edit</button>
                    <button onClick={()=> submitForReview(p.id!)} disabled={p.listingStatus==='submitted' || p.listingStatus==='approved'}>Submit</button>
                    <button onClick={()=> refund(p.id!)}>Refund</button>
                    <button onClick={()=> remove(p.id!)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div style={{marginTop:24, padding:16, border:'1px solid #eee', borderRadius:8}}>
          <h3>{editing.id? 'Edit Plugin' : 'Create Plugin'}</h3>
          <PluginForm value={editing} onChange={setEditing as any} onSubmit={submit} submitting={saving} />
        </div>
      )}

      <div style={{marginTop:32}}>
        <h2>Third-party Integrations</h2>
        <ul>
          <li>
            <Link href="/api/plugins/connect/zapier">Connect Zapier</Link>
          </li>
          <li>
            <Link href="/api/plugins/connect/notion">Connect Notion</Link>
          </li>
          <li>
            <Link href="/api/plugins/connect/slack">Connect Slack</Link>
          </li>
        </ul>
        <p>Expose Prompts/Agents as microservices via webhooks for external automation and QA sandboxes.</p>
      </div>
    </div>
  );
};

export default APIPluginsPage;
