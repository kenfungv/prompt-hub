import { useEffect, useState } from 'react';

interface SnapshotItem {
  _id: string;
  count: number;
  avgExecutionTime?: number;
  avgResponseTime?: number;
  totalTokens?: number;
  totalCost?: number;
  errorCount?: number;
}

export default function PerformanceDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotItem[]>([]);
  const [from, setFrom] = useState<string>(() => new Date(Date.now() - 3600_000).toISOString());
  const [to, setTo] = useState<string>(() => new Date().toISOString());
  const [metricType, setMetricType] = useState<string>('PROMPT_EXECUTION');
  const [csvUrl, setCsvUrl] = useState<string>('');

  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000/api/perf';

  const loadRealtime = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${base}/metrics/realtime`);
      const json = await res.json();
      setSnapshot(json.data || []);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load realtime snapshot');
    } finally {
      setLoading(false);
    }
  };

  const buildCsvUrl = () => {
    const params = new URLSearchParams({
      metricType,
      startTime: from,
      endTime: to,
      aggregationPeriod: 'REALTIME'
    });
    setCsvUrl(`${base}/metrics/export.csv?${params.toString()}`);
  };

  const exportCsv = () => {
    buildCsvUrl();
    setTimeout(() => {
      if (csvUrl) window.open(csvUrl, '_blank');
    }, 100);
  };

  useEffect(() => {
    loadRealtime();
    const t = setInterval(loadRealtime, 10_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Performance Monitor</h1>
      <p>實時快照、可配置報表與導出</p>

      <section style={{ margin: '12px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
        <label>
          Metric Type
          <select value={metricType} onChange={(e) => setMetricType(e.target.value)}>
            <option value="PROMPT_EXECUTION">PROMPT_EXECUTION</option>
            <option value="API_TRANSACTION">API_TRANSACTION</option>
            <option value="AUDIT_EVENT">AUDIT_EVENT</option>
            <option value="USER_BEHAVIOR">USER_BEHAVIOR</option>
          </select>
        </label>
        <label>
          From
          <input type="datetime-local" value={from.slice(0,16)} onChange={(e)=>setFrom(new Date(e.target.value).toISOString())} />
        </label>
        <label>
          To
          <input type="datetime-local" value={to.slice(0,16)} onChange={(e)=>setTo(new Date(e.target.value).toISOString())} />
        </label>
        <button onClick={exportCsv}>Export CSV</button>
        <button onClick={loadRealtime}>Refresh</button>
      </section>

      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {snapshot.map((s) => (
          <div key={s._id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
            <h3>{s._id}</h3>
            <div>Events: {s.count}</div>
            <div>Avg Exec: {Math.round((s.avgExecutionTime||0))} ms</div>
            <div>Avg Resp: {Math.round((s.avgResponseTime||0))} ms</div>
            <div>Total Tokens: {s.totalTokens||0}</div>
            <div>Total Cost: ${s.totalCost?.toFixed?.(4) || 0}</div>
            <div>Errors: {s.errorCount||0}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
