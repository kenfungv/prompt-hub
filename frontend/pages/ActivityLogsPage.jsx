import React, { useState, useEffect } from 'react';
import HistoryLog from '../components/HistoryLog';
import './ActivityLogsPage.css';

const ActivityLogsPage = () => {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('ALL');
  const [dateRange, setDateRange] = useState('7days');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchLogs();
  }, [query, level, dateRange, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query, level, range: dateRange, page });
      const res = await fetch(`/api/logs?${params.toString()}`);
      const data = await res.json();
      setLogs(data.items || []);
    } catch (e) {
      console.error('Failed to fetch logs', e);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setQuery('');
    setLevel('ALL');
    setDateRange('7days');
    setPage(1);
  };

  return (
    <div className="activity-logs-page">
      <header className="logs-header">
        <h1>行為日誌</h1>
        <div className="filters">
          <input
            type="text"
            placeholder="搜尋使用者、動作、資源..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="ALL">全部級別</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="SECURITY">SECURITY</option>
          </select>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="24h">最近 24 小時</option>
            <option value="7days">最近 7 天</option>
            <option value="30days">最近 30 天</option>
            <option value="custom">自訂範圍</option>
          </select>
          <button className="btn" onClick={fetchLogs}>查詢</button>
          <button className="btn secondary" onClick={clearFilters}>清除</button>
        </div>
      </header>

      {loading ? (
        <div className="loading">載入日誌中...</div>
      ) : logs.length === 0 ? (
        <div className="no-logs">暫無符合的日誌</div>
      ) : (
        <div className="logs-list">
          {logs.map((log) => (
            <HistoryLog key={log.id} {...log} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <footer className="pagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          上一頁
        </button>
        <span>第 {page} 頁</span>
        <button onClick={() => setPage((p) => p + 1)}>下一頁</button>
      </footer>
    </div>
  );
};

export default ActivityLogsPage;
