import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#a78bfa'];

const sectionStyle = { marginBottom: 28 };
const cardStyle = { background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 16 };
const headerRow = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' };
const grid4 = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(180px, 1fr))', gap: 12 };
const grid2 = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(260px, 1fr))', gap: 16 };
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const thtd = { borderTop: '1px solid #eee', padding: '10px 8px', textAlign: 'left' };

const BusinessReportsPage = () => {
  const [dateRange, setDateRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('all');
  const [reportData, setReportData] = useState({
    revenue: [],        // [{ date, mrr, arr, oneTime, refunds }]
    usage: [],          // [{ date, apiCalls, creditsUsed }]
    users: [],          // [{ date, newUsers, activeUsers, churned }]
    prompts: [],        // [{ name, value }]
    topPrompts: [],     // [{ id, title, runs, conversion, revenue }]
    planMix: [],        // [{ name, value }]
  });

  const kpis = useMemo(() => {
    const rev = reportData.revenue || [];
    const users = reportData.users || [];
    const usage = reportData.usage || [];

    const totalMRR = rev.reduce((s, r) => s + (Number(r.mrr) || 0), 0);
    const totalAPICalls = usage.reduce((s, r) => s + (Number(r.apiCalls) || 0), 0);
    const lastUsers = users.length ? users[users.length - 1] : { activeUsers: 0 };
    const totalPrompts = (reportData.topPrompts || []).length;

    return [
      { title: '訂閱 MRR', value: `$${totalMRR.toLocaleString()}` },
      { title: 'API 調用次數', value: totalAPICalls.toLocaleString() },
      { title: '活躍用戶', value: (lastUsers.activeUsers || 0).toLocaleString() },
      { title: 'Prompt 總數', value: totalPrompts.toString() },
    ];
  }, [reportData]);

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  async function fetchReportData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?range=${encodeURIComponent(dateRange)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReportData({
        revenue: data.revenue || [],
        usage: data.usage || [],
        users: data.users || [],
        prompts: data.prompts || [],
        topPrompts: data.topPrompts || [],
        planMix: data.planMix || [],
      });
    } catch (e) {
      console.error('Failed to fetch report data:', e);
      // Fallback demo data
      const today = new Date();
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 30;
      const fmt = (d) => d.toISOString().slice(5, 10);
      const series = Array.from({ length: days }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (days - 1 - i));
        return { date: fmt(d) };
      });
      setReportData({
        revenue: series.map((s, i) => ({ ...s, mrr: 900 + i * 15, arr: (900 + i * 15) * 12, oneTime: 120 + (i % 7) * 10, refunds: (i % 10) * 5 })),
        usage: series.map((s, i) => ({ ...s, apiCalls: 2000 + i * 80, creditsUsed: 500 + i * 20 })),
        users: series.map((s, i) => ({ ...s, newUsers: 5 + (i % 5), activeUsers: 300 + i * 6, churned: (i % 9) })),
        prompts: [
          { name: '寫作', value: 38 },
          { name: '程式碼', value: 26 },
          { name: '設計', value: 14 },
          { name: '行銷', value: 12 },
          { name: '其他', value: 10 },
        ],
        topPrompts: [
          { id: 'p1', title: 'SEO Blog Writer', runs: 1250, conversion: 8.2, revenue: 6800 },
          { id: 'p2', title: 'React Bug Fixer', runs: 980, conversion: 6.4, revenue: 5200 },
          { id: 'p3', title: 'UX Copy Refiner', runs: 760, conversion: 5.9, revenue: 3100 },
        ],
        planMix: [
          { name: 'Free', value: 62 },
          { name: 'Pro', value: 28 },
          { name: 'Team', value: 7 },
          { name: 'Enterprise', value: 3 },
        ],
      });
    } finally {
      setLoading(false);
    }
  }

  function exportReport(format) {
    window.open(`/api/reports/export?range=${encodeURIComponent(dateRange)}&format=${encodeURIComponent(format)}`);
  }

  const filteredTableRows = useMemo(() => {
    const byDate = new Map();
    for (const r of reportData.revenue) {
      byDate.set(r.date, { date: r.date, revenue: (r.mrr || 0) + (r.oneTime || 0) - (r.refunds || 0) });
    }
    for (const u of reportData.usage) {
      const row = byDate.get(u.date) || { date: u.date };
      row.apiCalls = u.apiCalls || 0;
      byDate.set(u.date, row);
    }
    for (const u of reportData.users) {
      const row = byDate.get(u.date) || { date: u.date };
      row.newUsers = u.newUsers || 0;
      row.activeUsers = u.activeUsers || 0;
      row.conv = row.newUsers ? Math.min(40, (row.newUsers / (row.apiCalls || 1)) * 1000) : 0;
      byDate.set(u.date, row);
    }

    let arr = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    if (selectedMetric !== 'all') {
      arr = arr.map((r) => ({ date: r.date, [selectedMetric]: r[selectedMetric] }));
    }
    return arr;
  }, [reportData, selectedMetric]);

  if (loading) {
    return <div style={{ padding: 24 }}>載入報表數據中...</div>;
  }

  return (
    <div style={{ padding: 16 }}>
      <header style={{ ...headerRow, marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>業務報表分析</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="7d">最近 7 天</option>
            <option value="30d">最近 30 天</option>
            <option value="90d">最近 90 天</option>
            <option value="1y">最近一年</option>
          </select>
          <button onClick={() => exportReport('csv')}>匯出 CSV</button>
          <button onClick={() => exportReport('pdf')}>匯出 PDF</button>
          <button onClick={() => exportReport('excel')}>匯出 Excel</button>
          <button onClick={fetchReportData}>🔄 重新整理</button>
        </div>
      </header>

      <section style={{ ...sectionStyle }}>
        <div style={grid4}>
          {kpis.map((k, idx) => (
            <div key={idx} style={cardStyle}>
              <div style={{ color: '#6b7280', fontSize: 12 }}>{k.title}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{k.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...sectionStyle }}>
        <div style={grid2}>
          <div style={cardStyle}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>收入趨勢 (MRR/ARR)</div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.revenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="mrr" stroke="#2563eb" strokeWidth={2} name="MRR" />
                <Line type="monotone" dataKey="arr" stroke="#7c3aed" strokeWidth={2} name="ARR" />
                <Line type="monotone" dataKey="oneTime" stroke="#16a34a" name="一次性" />
                <Line type="monotone" dataKey="refunds" stroke="#ef4444" name="退款" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={cardStyle}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>API 使用量</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.usage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="apiCalls" fill="#82ca9d" name="API 調用" />
                <Bar dataKey="creditsUsed" fill="#60a5fa" name="Credits" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={cardStyle}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>用戶增長</div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.users}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="newUsers" stroke="#f59e0b" name="新用戶" />
                <Line type="monotone" dataKey="activeUsers" stroke="#6366f1" name="活躍用戶" />
                <Line type="monotone" dataKey="churned" stroke="#ef4444" name="流失" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={cardStyle}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>Prompt 類型分布</div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={reportData.prompts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {reportData.prompts.map((_, index) => (
                    <Cell key={`pc-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section style={{ ...sectionStyle }}>
        <div style={{ ...cardStyle }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 600 }}>詳細數據</div>
            <select value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value)}>
              <option value="all">所有指標</option>
              <option value="revenue">收入</option>
              <option value="apiCalls">API 調用</option>
              <option value="newUsers">新用戶</option>
              <option value="activeUsers">活躍用戶</option>
            </select>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thtd}>日期</th>
                  {selectedMetric === 'all' && <>
                    <th style={thtd}>收入</th>
                    <th style={thtd}>API 調用</th>
                    <th style={thtd}>新用戶</th>
                    <th style={thtd}>活躍用戶</th>
                    <th style={thtd}>轉換率</th>
                  </>}
                  {selectedMetric !== 'all' && <th style={thtd}>{selectedMetric}</th>}
                </tr>
              </thead>
              <tbody>
                {filteredTableRows.length === 0 && (
                  <tr><td style={{ ...thtd }} colSpan={6}>暫無數據</td></tr>
                )}
                {filteredTableRows.map((r, i) => (
                  <tr key={i}>
                    <td style={thtd}>{r.date}</td>
                    {selectedMetric === 'all' ? (
                      <>
                        <td style={thtd}>{r.revenue ? `$${Number(r.revenue).toLocaleString()}` : '-'}</td>
                        <td style={thtd}>{r.apiCalls?.toLocaleString?.() ?? '-'}</td>
                        <td style={thtd}>{r.newUsers?.toLocaleString?.() ?? '-'}</td>
                        <td style={thtd}>{r.activeUsers?.toLocaleString?.() ?? '-'}</td>
                        <td style={thtd}>{typeof r.conv === 'number' ? `${r.conv.toFixed(1)}%` : '-'}</td>
                      </>
                    ) : (
                      <td style={thtd}>{r[selectedMetric] ?? '-'}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section style={{ ...sectionStyle }}>
        <div style={grid2}>
          <div style={cardStyle}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>熱門 Prompt</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr
