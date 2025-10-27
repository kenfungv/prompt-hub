import React, { useEffect, useMemo, useState } from 'react';

// This page renders a complete activity log with:
// - Search/filter by user, entity (Prompt/API Key), action, level, date range
// - Column sorting
// - Client pagination (with server support via query params if backend provided)
// - CSV/JSON export
// - Expandable row details
// - Selectable columns

const DEFAULT_PAGE_SIZE = 20;
const LEVELS = ['ALL', 'INFO', 'WARN', 'ERROR', 'SECURITY'];
const ENTITIES = ['ALL', 'USER', 'PROMPT', 'API_KEY', 'WORKSPACE', 'MODEL'];
const ACTIONS = ['ALL', 'CREATE', 'READ', 'UPDATE', 'DELETE', 'EXECUTE', 'LOGIN', 'LOGOUT', 'ROTATE'];

function download(filename, text, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function toCSV(rows, columns) {
  const header = columns.map(c => '"' + c.label.replaceAll('"', '""') + '"').join(',');
  const data = rows.map(r => columns.map(c => {
    const v = typeof c.accessor === 'function' ? c.accessor(r) : r[c.accessor];
    const s = v == null ? '' : String(v);
    return '"' + s.replaceAll('"', '""') + '"';
  }).join(',')).join('\n');
  return header + '\n' + data;
}

function formatDate(ts) {
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

export default function ActivityLogsPage() {
  // Filters
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('ALL');
  const [entity, setEntity] = useState('ALL');
  const [action, setAction] = useState('ALL');
  const [dateRange, setDateRange] = useState('7days');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Table state
  const [sortBy, setSortBy] = useState({ key: 'timestamp', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Data
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Column visibility
  const allColumns = [
    { key: 'timestamp', label: '時間', accessor: r => formatDate(r.timestamp) },
    { key: 'user', label: '使用者', accessor: r => r.user?.name || r.user?.email || r.userId || '' },
    { key: 'entityType', label: '類別', accessor: 'entityType' },
    { key: 'entityId', label: '資源ID', accessor: 'entityId' },
    { key: 'action', label: '動作', accessor: 'action' },
    { key: 'level', label: '級別', accessor: 'level' },
    { key: 'prompt', label: 'Prompt 名稱', accessor: r => r.prompt?.name || '' },
    { key: 'apiKey', label: 'API Key 尾碼', accessor: r => r.apiKey?.suffix || r.apiKeySuffix || '' },
    { key: 'ip', label: 'IP', accessor: 'ip' },
  ];
  const [visibleCols, setVisibleCols] = useState(() => new Set(allColumns.map(c => c.key)));

  const columns = useMemo(() => allColumns.filter(c => visibleCols.has(c.key)), [visibleCols]);

  const toggleCol = (key) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const buildParams = () => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (level !== 'ALL') params.set('level', level);
    if (entity !== 'ALL') params.set('entity', entity);
    if (action !== 'ALL') params.set('action', action);
    if (dateRange !== 'custom') params.set('range', dateRange);
    if (dateRange === 'custom') {
      if (from) params.set('from', from);
      if (to) params.set('to', to);
    }
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    params.set('sortKey', sortBy.key);
    params.set('sortDir', sortBy.dir);
    return params;
  };

  async function fetchLogs() {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/logs?${buildParams().toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLogs(Array.isArray(data.items) ? data.items : []);
      setTotal(typeof data.total === 'number' ? data.total : (data.items?.length || 0));
    } catch (e) {
      setError('載入失敗');
      console.error('Fetch logs failed', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLogs(); }, [query, level, entity, action, dateRange, from, to, page, pageSize, sortBy.key, sortBy.dir]);

  const clearFilters = () => {
    setQuery('');
    setLevel('ALL');
    setEntity('ALL');
    setAction('ALL');
    setDateRange('7days');
    setFrom('');
    setTo('');
    setPage(1);
  };

  const onSort = (key) => {
    setSortBy(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  };

  const currentPageCount = logs.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const exportCSV = () => {
    const csv = toCSV(logs, columns);
    download(`activity-logs-page-${Date.now()}.csv`, csv, 'text/csv;charset=utf-8');
  };

  const exportJSON = () => {
    download(`activity-logs-page-${Date.now()}.json`, JSON.stringify({ items: logs }, null, 2), 'application/json');
  };

  const Row = ({ row }) => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <tr onClick={() => setOpen(o => !o)} className={open ? 'expanded' : ''}>
          {columns.map(col => (
            <td key={col.key}>{typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]}</td>
          ))}
        </tr>
        {open && (
          <tr className="details">
            <td colSpan={columns.length}>
              <pre>{JSON.stringify(row, null, 2)}</pre>
            </td>
          </tr>
        )}
      </>
    );
  };

  return (
    <div className="activity-logs-page">
      <header className="logs-header">
        <h2>行為日誌</h2>
        <div className="filters">
          <input
            type="text"
            placeholder="搜尋使用者、動作、資源..."
            value={query}
            onChange={(e) => { setPage(1); setQuery(e.target.value); }}
          />
          <select value={level} onChange={(e) => { setPage(1); setLevel(e.target.value); }}>
            {LEVELS.map(l => <option key={l} value={l}>{l === 'ALL' ? '全部級別' : l}</option>)}
          </select>
          <select value={entity} onChange={(e) => { setPage(1); setEntity(e.target.value); }}>
            {ENTITIES.map(t => <option key={t} value={t}>{t === 'ALL' ? '全部類別' : t}</option>)}
          </select>
          <select value={action} onChange={(e) => { setPage(1); setAction(e.target.value); }}>
            {ACTIONS.map(a => <option key={a} value={a}>{a === 'ALL' ? '全部動作' : a}</option>)}
          </select>
          <select value={dateRange} onChange={(e) => { setPage(1); setDateRange(e.target.value); }}>
            <option value="24h">最近 24 小時</option>
            <option value="7days">最近 7 天</option>
            <option value="30days">最近 30 天</option>
            <option value="custom">自訂範圍</option>
          </select>
          {dateRange === 'custom' && (
            <>
              <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
              <span>至</span>
              <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
            </>
          )}
          <button className="btn" onClick={() => { setPage(1); fetchLogs(); }}>查詢</button>
          <button className="btn secondary" onClick={clearFilters}>清除</button>
        </div>

        <div className="table-tools">
          <div className="col-picker">
            顯示欄位:
            {allColumns.map(c => (
              <label key={c.key}>
                <input type="checkbox" checked={visibleCols.has(c.key)} onChange={() => toggleCol(c.key)} /> {c.label}
              </label>
            ))}
          </div>
          <div className="exports">
            <button onClick={exportCSV}>匯出 CSV</button>
            <button onClick={exportJSON}>匯出 JSON</button>
            <label>
              每頁
              <select value={pageSize} onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }}>
                {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
        </div>
      </header>

      {error && <div className="error">{error}</div>}
      {loading ? (
        <div className="loading">載入日誌中...</div>
      ) : logs.length === 0 ? (
        <div className="no-logs">暫無符合的日誌</div>
      ) : (
        <div className="table-wrapper">
          <table className="logs-table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key} onClick={() => onSort(col.key)}>
                    {col.label}
                    {sortBy.key === col.key ? (sortBy.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(row => (
                <Row key={row.id || row._id || row.timestamp + '-' + (row.entityId || '')} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className="pagination">
        <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>上一頁</button>
        <span>
          第 {page} / {totalPages} 頁（{currentPageCount} 筆，總計 {total} 筆）
        </span>
        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一頁</button>
      </footer>

      <style jsx>{`
        .activity-logs-page { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .filters input[type="text"] { min-width: 260px; }
        .btn { padding: 6px 10px; }
        .secondary { background: #f3f4f6; }
        .table-tools { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
        .col-picker label { margin-right: 8px; font-size: 12px; }
        .table-wrapper { overflow: auto; border: 1px solid #e5e7eb; border-radius: 6px; }
        table { border-collapse: collapse; width: 100%; font-size: 14px; }
        th, td { padding: 8px 10px; border-bottom: 1px solid #eee; text-align: left; }
        th { cursor: pointer; background: #fafafa; position: sticky; top: 0; }
        tr.details td { background: #fbfdff; }
        pre { margin: 0; overflow: auto; }
        .pagination { display: flex; gap: 10px; align-items: center; justify-content: flex-end; margin-top: 8px; }
        .error { color: #b91c1c; }
        .loading, .no-logs { padding: 16px; }
      `}</style>
    </div>
  );
}
