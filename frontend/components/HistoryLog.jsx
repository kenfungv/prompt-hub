import React, { useState, useEffect } from 'react';
import './HistoryLog.css';

const HistoryLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: 'all',
    dateRange: '7days',
    searchQuery: '',
    userId: 'all'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });
  const [selectedLog, setSelectedLog] = useState(null);

  const logTypes = [
    { value: 'all', label: 'All Activities' },
    { value: 'prompt.created', label: 'Prompt Created' },
    { value: 'prompt.updated', label: 'Prompt Updated' },
    { value: 'prompt.deleted', label: 'Prompt Deleted' },
    { value: 'user.login', label: 'User Login' },
    { value: 'team.action', label: 'Team Action' },
    { value: 'api.call', label: 'API Call' },
    { value: 'webhook.triggered', label: 'Webhook Triggered' },
    { value: 'marketplace.transaction', label: 'Marketplace Transaction' }
  ];

  // API Integration - Fetch history logs
  useEffect(() => {
    fetchLogs();
  }, [filters, pagination.page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        type: filters.type,
        dateRange: filters.dateRange,
        search: filters.searchQuery,
        userId: filters.userId,
        page: pagination.page,
        limit: pagination.limit
      });

      const response = await fetch(`/api/logs/history?${queryParams}`);
      const data = await response.json();
      
      setLogs(data.logs || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0
      }));
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportLogs = async () => {
    try {
      const queryParams = new URLSearchParams({
        type: filters.type,
        dateRange: filters.dateRange,
        search: filters.searchQuery,
        userId: filters.userId
      });

      const response = await fetch(`/api/logs/export?${queryParams}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `history-log-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      type: 'all',
      dateRange: '7days',
      searchQuery: '',
      userId: 'all'
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getLogIcon = (type) => {
    const icons = {
      'prompt.created': '➕',
      'prompt.updated': '✏️',
      'prompt.deleted': '🗑️',
      'user.login': '🔑',
      'team.action': '👥',
      'api.call': '🔌',
      'webhook.triggered': '⚡',
      'marketplace.transaction': '💰'
    };
    return icons[type] || '📝';
  };

  const getLogSeverity = (log) => {
    if (log.type.includes('deleted') || log.type.includes('error')) return 'high';
    if (log.type.includes('updated') || log.type.includes('login')) return 'medium';
    return 'low';
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="history-log">
      <header className="log-header">
        <div className="header-content">
          <h1>History Log</h1>
          <p>Track all activities and changes in your workspace</p>
        </div>
        <button
          onClick={handleExportLogs}
          className="btn-export"
        >
          📥 Export Logs
        </button>
      </header>

      <div className="log-filters">
        <input
          type="text"
          placeholder="Search logs..."
          value={filters.searchQuery}
          onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
          className="search-input"
        />

        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="filter-select"
        >
          {logTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <select
          value={filters.dateRange}
          onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
          className="filter-select"
        >
          <option value="24hours">Last 24 Hours</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
          <option value="all">All Time</option>
        </select>

        <button
          onClick={handleClearFilters}
          className="btn-clear-filters"
        >
          Clear Filters
        </button>
      </div>

      <div className="log-stats">
        <div className="stat-card">
          <span className="stat-value">{pagination.total}</span>
          <span className="stat-label">Total Logs</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{logs.filter(l => getLogSeverity(l) === 'high').length}</span>
          <span className="stat-label">Critical Events</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{new Set(logs.map(l => l.userId)).size}</span>
          <span className="stat-label">Active Users</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading logs...</div>
      ) : (
        <>
          <div className="logs-table-container">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className={`log-row severity-${getLogSeverity(log)}`}
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="log-time">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="log-type">
                      <span className="log-icon">{getLogIcon(log.type)}</span>
                      {log.type}
                    </td>
                    <td className="log-user">{log.userName || log.userId}</td>
                    <td className="log-action">{log.action}</td>
                    <td className="log-details">
                      {log.details.length > 50
                        ? `${log.details.substring(0, 50)}...`
                        : log.details}
                    </td>
                    <td className="log-status">
                      <span className={`status-badge ${log.status}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="btn-pagination"
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {totalPages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === totalPages}
                className="btn-pagination"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {selectedLog && (
        <div className="log-detail-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Log Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="modal-close"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-group">
                <strong>Timestamp:</strong>
                <span>{new Date(selectedLog.timestamp).toLocaleString()}</span>
              </div>
              <div className="detail-group">
                <strong>Type:</strong>
                <span>{selectedLog.type}</span>
              </div>
              <div className="detail-group">
                <strong>User:</strong>
                <span>{selectedLog.userName || selectedLog.userId}</span>
              </div>
              <div className="detail-group">
                <strong>Action:</strong>
                <span>{selectedLog.action}</span>
              </div>
              <div className="detail-group">
                <strong>Status:</strong>
                <span className={`status-badge ${selectedLog.status}`}>
                  {selectedLog.status}
                </span>
              </div>
              <div className="detail-group">
                <strong>Details:</strong>
                <pre className="detail-text">{selectedLog.details}</pre>
              </div>
              {selectedLog.metadata && (
                <div className="detail-group">
                  <strong>Metadata:</strong>
                  <pre className="detail-text">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryLog;
