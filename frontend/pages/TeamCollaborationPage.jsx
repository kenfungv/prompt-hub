import React, { useEffect, useMemo, useState } from 'react';
import './TeamCollaborationPage.css';

// Utility
const uid = () => Math.random().toString(36).slice(2, 9);

const DEFAULT_ROLES = [
  { key: 'owner', name: '擁有者', permissions: ['all'] },
  { key: 'admin', name: '管理員', permissions: ['manage_team', 'manage_prompts', 'view_audit'] },
  { key: 'editor', name: '編輯者', permissions: ['edit_prompts', 'invite'] },
  { key: 'viewer', name: '檢視者', permissions: ['view'] },
];

const initialData = {
  team: { id: 'team_demo', name: 'Demo Team', description: '示範團隊，用於開發與測試' },
  members: [
    { id: uid(), name: 'Ken', email: 'ken@example.com', role: 'owner', joinedAt: new Date().toISOString() },
    { id: uid(), name: 'Fiona', email: 'fiona@example.com', role: 'editor', joinedAt: new Date().toISOString() },
  ],
  invites: [],
  promptActivities: [
    { id: uid(), promptId: 'p1', promptName: '產品Q&A', actor: 'Ken', action: 'updated', diff: '+ 新增安全指引章節', at: new Date().toISOString() },
    { id: uid(), promptId: 'p2', promptName: '客服助手', actor: 'Fiona', action: 'commented', diff: '建議加入情緒安撫語句', at: new Date().toISOString() },
  ],
  auditSnapshots: [
    { id: uid(), type: 'role_change', actor: 'Ken', target: 'Fiona', before: 'viewer', after: 'editor', at: new Date().toISOString() },
  ],
  roles: DEFAULT_ROLES,
};

// Local persistence for demo
const loadState = () => {
  try { const raw = localStorage.getItem('team_page_state'); return raw ? JSON.parse(raw) : initialData; } catch { return initialData; }
};
const saveState = (state) => { try { localStorage.setItem('team_page_state', JSON.stringify(state)); } catch {} };

function Section({ title, description, children, actions }) {
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          {description && <p className="muted">{description}</p>}
        </div>
        <div className="section-actions">{actions}</div>
      </div>
      <div className="section-body">{children}</div>
    </section>
  );
}

function RoleBadge({ role }) {
  return <span className={`role ${role}`}>{DEFAULT_ROLES.find(r=>r.key===role)?.name || role}</span>;
}

export default function TeamCollaborationPage() {
  const [state, setState] = useState(loadState());
  const [search, setSearch] = useState('');
  const [memberForm, setMemberForm] = useState({ name: '', email: '', role: 'viewer' });
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'viewer' });
  const [roleForm, setRoleForm] = useState({ key: '', name: '', permissions: '' });

  useEffect(() => { saveState(state); }, [state]);

  const roleOptions = useMemo(() => state.roles.map(r => ({ value: r.key, label: r.name })), [state.roles]);

  // Members CRUD
  const addMember = (name, email, role) => {
    if (!name || !email) return { ok: false, error: '請填姓名與Email' };
    if (state.members.some(m => m.email === email)) return { ok: false, error: 'Email 已存在' };
    const newMember = { id: uid(), name, email, role, joinedAt: new Date().toISOString() };
    const snapshot = { id: uid(), type: 'member_add', actor: 'Ken', target: email, at: new Date().toISOString() };
    setState(prev => ({ ...prev, members: [...prev.members, newMember], auditSnapshots: [snapshot, ...prev.auditSnapshots] }));
    return { ok: true };
  };
  const updateMember = (id, patch) => {
    setState(prev => {
      const before = prev.members.find(m => m.id === id);
      const updated = prev.members.map(m => m.id === id ? { ...m, ...patch } : m);
      const snap = { id: uid(), type: 'member_update', actor: 'Ken', target: before?.email, before, after: updated.find(m=>m.id===id), at: new Date().toISOString() };
      return { ...prev, members: updated, auditSnapshots: [snap, ...prev.auditSnapshots] };
    });
  };
  const removeMember = (id) => {
    setState(prev => {
      const target = prev.members.find(m => m.id === id);
      const updated = prev.members.filter(m => m.id !== id);
      const snap = { id: uid(), type: 'member_remove', actor: 'Ken', target: target?.email, at: new Date().toISOString() };
      return { ...prev, members: updated, auditSnapshots: [snap, ...prev.auditSnapshots] };
    });
  };

  // Invites
  const sendInvite = (email, role) => {
    if (!email) return;
    const invite = { id: uid(), email, role, status: 'pending', invitedAt: new Date().toISOString() };
    const snap = { id: uid(), type: 'invite_send', actor: 'Ken', target: email, meta: { role }, at: new Date().toISOString() };
    setState(prev => ({ ...prev, invites: [invite, ...prev.invites], auditSnapshots: [snap, ...prev.auditSnapshots] }));
  };
  const revokeInvite = (id) => {
    setState(prev => {
      const inv = prev.invites.find(i => i.id === id);
      const snap = { id: uid(), type: 'invite_revoke', actor: 'Ken', target: inv?.email, at: new Date().toISOString() };
      return { ...prev, invites: prev.invites.filter(i => i.id !== id), auditSnapshots: [snap, ...prev.auditSnapshots] };
    });
  };

  // Roles
  const upsertRole = (key, name, permissions) => {
    setState(prev => {
      const exists = prev.roles.some(r => r.key === key);
      const next = exists ? prev.roles.map(r => r.key === key ? { key, name, permissions } : r) : [...prev.roles, { key, name, permissions }];
      const snap = { id: uid(), type: 'role_upsert', actor: 'Ken', target: key, meta: { name, permissions }, at: new Date().toISOString() };
      return { ...prev, roles: next, auditSnapshots: [snap, ...prev.auditSnapshots] };
    });
  };
  const deleteRole = (key) => {
    if (['owner', 'admin', 'editor', 'viewer'].includes(key)) return;
    setState(prev => {
      const snap = { id: uid(), type: 'role_delete', actor: 'Ken', target: key, at: new Date().toISOString() };
      return { ...prev, roles: prev.roles.filter(r => r.key !== key), auditSnapshots: [snap, ...prev.auditSnapshots] };
    });
  };

  // Prompt collaboration records
  const addPromptActivity = (item) => {
    const withId = { id: uid(), at: new Date().toISOString(), ...item };
    const snap = { id: uid(), type: 'prompt_activity', actor: item.actor, target: item.promptId, meta: item, at: withId.at };
    setState(prev => ({ ...prev, promptActivities: [withId, ...prev.promptActivities], auditSnapshots: [snap, ...prev.auditSnapshots] }));
  };

  const filteredMembers = useMemo(() => {
    if (!search) return state.members;
    const q = search.toLowerCase();
    return state.members.filter(m => [m.name, m.email, m.role].some(x => (x||'').toLowerCase().includes(q)));
  }, [state.members, search]);

  return (
    <div className="team-collaboration-page">
      <header className="team-header">
        <h1>團隊協作</h1>
        <p>建立與管理團隊、角色與權限，協作編輯 Prompt；全程審計留痕。</p>
      </header>

      <Section title="團隊資訊" description="更新團隊名稱與描述">
        <div className="grid two">
          <label>名稱<input value={state.team.name} onChange={e=>setState(p=>({ ...p, team: { ...p.team, name: e.target.value }}))} /></label>
          <label>描述<input value={state.team.description} onChange={e=>setState(p=>({ ...p, team: { ...p.team, description: e.target.value }}))} /></label>
        </div>
      </Section>

      <Section title="成員管理" description="新增、編輯、移除團隊成員；支援搜尋與角色分配" actions={
        <input className="search" placeholder="搜尋成員名稱/Email/角色" value={search} onChange={e=>setSearch(e.target.value)} />
      }>
        <div className="grid three">
          <label>名稱<input value={memberForm.name} onChange={e=>setMemberForm(f=>({ ...f, name: e.target.value }))} placeholder="例如 Fiona" /></label>
          <label>Email<input value={memberForm.email} onChange={e=>setMemberForm(f=>({ ...f, email: e.target.value }))} placeholder="name@example.com" /></label>
          <label>角色<select value={memberForm.role} onChange={e=>setMemberForm(f=>({ ...f, role: e.target.value }))}>
            {roleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select></label>
          <button className="primary" onClick={()=>{ const res = addMember(memberForm.name.trim(), memberForm.email.trim(), memberForm.role); if (res.ok) setMemberForm({ name: '', email: '', role: 'viewer' }); else alert(res.error); }}>新增成員</button>
        </div>

        <div className="table">
          <div className="t-head"><div>名稱</div><div>Email</div><div>角色</div><div>加入時間</div><div>操作</div></div>
          {filteredMembers.map(m => (
            <div key={m.id} className="t-row">
              <div>{m.name}</div>
              <div>{m.email}</div>
              <div>
                <RoleBadge role={m.role} />
                <select value={m.role} onChange={e=>updateMember(m.id, { role: e.target.value })}>
                  {roleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>{new Date(m.joinedAt).toLocaleString()}</div>
              <div>
                <button onClick={()=>{ const next = prompt('新名稱', m.name); if (next) updateMember(m.id, { name: next }); }}>改名</button>
                <button className="danger" onClick={()=> confirm('確定移除該成員?') && removeMember(m.id)}>移除</button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="協作邀請" description="以 Email 發送邀請並指派角色">
        <div className="grid three">
          <label>Email<input value={inviteForm.email} onChange={e=>setInviteForm(f=>({ ...f, email: e.target.value }))} placeholder="invitee@example.com" /></label>
          <label>角色<select value={inviteForm.role} onChange={e=>setInviteForm(f=>({ ...f, role: e.target.value }))}>
            {roleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select></label>
          <button className="primary" onClick={()=>{ if (!inviteForm.email) return; sendInvite(inviteForm.email.trim(), inviteForm.role); setInviteForm({ email: '', role: 'viewer' }); }}>發送邀請</button>
        </div>
        <div className="table compact">
          <div className="t-head"><div>Email</div><div>角色</div><div>狀態</div><div>發送時間</div><div>操作</div></div>
          {state.invites.map(i => (
            <div key={i.id} className="t-row">
              <div>{i.email}</div>
              <div><RoleBadge role={i.role} /></div>
              <div>{i.status}</div>
              <div>{new Date(i.invitedAt).toLocaleString()}</div>
              <div><button className="danger" onClick={()=>revokeInvite(i.id)}>撤回</button></div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="角色與權限" description="建立自訂角色，配置權限並套用">
        <div className="grid four">
          <label>角色鍵(key)<input value={roleForm.key} onChange={e=>setRoleForm(f=>({ ...f, key: e.target.value }))} placeholder="例如 analyst" /></label>
          <label>顯示名稱<input value={roleForm.name} onChange={e=>setRoleForm(f=>({ ...f, name: e.target.value }))} placeholder="資料分析員" /></label>
          <label>權限(逗號分隔)<input value={roleForm.permissions} onChange={e=>setRoleForm(f=>({ ...f, permissions: e.target.value }))} placeholder="view, edit_prompts" /></label>
          <div className="row">
            <button onClick={()=>{ const perms = roleForm.permissions.split(',').map(s=>s.trim()).filter(Boolean); if (!roleForm.key || !roleForm.name) return alert('請填寫完整'); upsertRole(roleForm.key, roleForm.name, perms); setRoleForm({ key: '', name: '', permissions: '' }); }}>新增/更新角色</button>
            <button className="danger" onClick={()=>{ if (!roleForm.key) return; if (confirm('刪除此角色? 影響僅限自訂角色')) deleteRole(roleForm.key); }}>刪除角色</button>
          </div>
        </div>
        <div className="table compact">
          <div className="t-head"><div>鍵</div><div>名稱</div><div>權限</div></div>
          {state.roles.map(r => (
            <div key={r.key} className="t-row">
              <div>{r.key}</div>
              <div>{r.name}</div>
              <div className="wrap">{r.permissions.join(', ')}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Prompt 協作記錄" description="追蹤誰在何時對哪個 Prompt 做了什麼變更">
        <div className="row">
          <button onClick={()=> addPromptActivity({ promptId: 'p-demo', promptName: '示範Prompt', actor: 'Ken', action: 'updated', diff: '+ 範例修改' })}>新增一筆示例記錄</button>
        </div>
        <div className="table compact">
          <div className="t-head"><div>時間</div><div>成員</div><div>Prompt</div><div>動作</div><div>差異</div></div>
          {state.promptActivities.map(a => (
            <div key={a.id} className="t-row">
