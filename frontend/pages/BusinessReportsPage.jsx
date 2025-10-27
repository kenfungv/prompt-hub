import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import './BusinessReportsPage.css';

const BusinessReportsPage = () => {
  const [dateRange, setDateRange] = useState('30days');
  const [reportData, setReportData] = useState({
    revenue: [],
    usage: [],
    users: [],
    prompts: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('all');

  // 顏色配置
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // API 呼叫獲取報表數據
      const response = await fetch(`/api/reports?range=${dateRange}`);
      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (format) => {
    // 導出報表功能 (CSV, PDF, Excel)
    console.log(`Exporting report as ${format}`);
    // 實現導出邏輯
  };

  // 統計卡片數據
  const statsCards = [
    { title: '總收入', value: '$45,231', change: '+12.5%', trend: 'up' },
    { title: 'API 調用次數', value: '2.4M', change: '+8.3%', trend: 'up' },
    { title: '活躍用戶', value: '1,234', change: '-2.1%', trend: 'down' },
    { title: 'Prompt 總數', value: '5,678', change: '+15.7%', trend: 'up' }
  ];

  if (loading) {
    return (
      <div className="business-reports-page loading">
        <div className="spinner">載入報表數據中...</div>
      </div>
    );
  }

  return (
    <div className="business-reports-page">
      <header className="reports-header">
        <h1>業務報表分析</h1>
        <div className="header-actions">
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="date-range-selector"
          >
            <option value="7days">最近 7 天</option>
            <option value="30days">最近 30 天</option>
            <option value="90days">最近 90 天</option>
            <option value="1year">最近一年</option>
            <option value="custom">自訂範圍</option>
          </select>
          
          <div className="export-buttons">
            <button onClick={() => exportReport('csv')} className="btn-export">
              匯出 CSV
            </button>
            <button onClick={() => exportReport('pdf')} className="btn-export">
              匯出 PDF
            </button>
            <button onClick={() => exportReport('excel')} className="btn-export">
              匯出 Excel
            </button>
          </div>
          
          <button onClick={fetchReportData} className="btn-refresh">
            🔄 重新整理
          </button>
        </div>
      </header>

      {/* 統計卡片區 */}
      <section className="stats-cards">
        {statsCards.map((stat, index) => (
          <div key={index} className={`stat-card ${stat.trend}`}>
            <div className="stat-title">{stat.title}</div>
            <div className="stat-value">{stat.value}</div>
            <div className={`stat-change ${stat.trend}`}>
              {stat.trend === 'up' ? '↑' : '↓'} {stat.change}
            </div>
          </div>
        ))}
      </section>

      {/* 圖表區域 */}
      <section className="charts-section">
        {/* 收入趨勢圖 */}
        <div className="chart-container">
          <h3>收入趨勢</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData.revenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* API 使用量圖 */}
        <div className="chart-container">
          <h3>API 使用量</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.usage}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="calls" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 用戶增長圖 */}
        <div className="chart-container">
          <h3>用戶增長</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData.users}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="newUsers" stroke="#ffc658" />
              <Line type="monotone" dataKey="totalUsers" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Prompt 類型分布圖 */}
        <div className="chart-container">
          <h3>Prompt 類型分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData.prompts}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {reportData.prompts.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 詳細數據表格 */}
      <section className="data-table-section">
        <h3>詳細數據</h3>
        <div className="table-controls">
          <select 
            value={selectedMetric} 
            onChange={(e) => setSelectedMetric(e.target.value)}
          >
            <option value="all">所有指標</option>
            <option value="revenue">收入</option>
            <option value="usage">使用量</option>
            <option value="users">用戶</option>
          </select>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>收入</th>
              <th>API 調用</th>
              <th>新用戶</th>
              <th>活躍用戶</th>
              <th>轉換率</th>
            </tr>
          </thead>
          <tbody>
            {/* 表格數據行 */}
            <tr>
              <td colSpan="6" className="no-data">暫無數據</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 關鍵指標 KPI */}
      <section className="kpi-section">
        <h3>關鍵績效指標 (KPI)</h3>
        <div className="kpi-grid">
          <div className="kpi-card">
            <h4>客戶獲取成本 (CAC)</h4>
            <p className="kpi-value">$125</p>
            <p className="kpi-description">每個新客戶的平均獲取成本</p>
          </div>
          <div className="kpi-card">
            <h4>客戶終身價值 (LTV)</h4>
            <p className="kpi-value">$1,450</p>
            <p className="kpi-description">客戶生命週期內的平均收入</p>
          </div>
          <div className="kpi-card">
            <h4>流失率</h4>
            <p className="kpi-value">3.2%</p>
            <p className="kpi-description">本月客戶流失百分比</p>
          </div>
          <div className="kpi-card">
            <h4>平均回應時間</h4>
            <p className="kpi-value">180ms</p>
            <p className="kpi-description">API 平均回應時間</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BusinessReportsPage;
