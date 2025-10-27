import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Timeline, Table, Tag, Tabs, Space, Typography, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, SyncOutlined, ClockCircleOutlined } from '@ant-design/icons';
import * as echarts from 'echarts';
import { Column, Line, Pie } from '@ant-design/plots';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface CICDRun {
  id: string;
  workflow: string;
  branch: string;
  status: 'success' | 'failure' | 'pending' | 'cancelled';
  duration: number;
  timestamp: string;
  jobs: JobResult[];
  commitSha: string;
  author: string;
}

interface JobResult {
  name: string;
  status: 'success' | 'failure' | 'pending' | 'skipped';
  duration: number;
  steps: number;
}

interface DashboardStats {
  totalRuns: number;
  successRate: number;
  avgDuration: number;
  failedRuns: number;
}

const CICDDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<CICDRun[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalRuns: 0,
    successRate: 0,
    avgDuration: 0,
    failedRuns: 0,
  });

  // Fetch CI/CD data from GitHub Actions API or backend
  useEffect(() => {
    fetchCICDData();
  }, []);

  const fetchCICDData = async () => {
    try {
      setLoading(true);
      // Mock data - Replace with actual API call
      const mockData: CICDRun[] = [
        {
          id: '1',
          workflow: 'Enhanced PR Automation',
          branch: 'feature/cicd-enhancement',
          status: 'success',
          duration: 245,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          commitSha: '70757e1',
          author: 'kenfungv',
          jobs: [
            { name: 'Lint & Format', status: 'success', duration: 45, steps: 8 },
            { name: 'Test Suite', status: 'success', duration: 120, steps: 12 },
            { name: 'Security Audit', status: 'success', duration: 35, steps: 6 },
            { name: 'Build Verification', status: 'success', duration: 45, steps: 7 },
          ],
        },
        {
          id: '2',
          workflow: 'Backend CI',
          branch: 'main',
          status: 'failure',
          duration: 180,
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          commitSha: 'abc1234',
          author: 'developer',
          jobs: [
            { name: 'Lint', status: 'success', duration: 30, steps: 5 },
            { name: 'Test', status: 'failure', duration: 90, steps: 10 },
            { name: 'Build', status: 'skipped', duration: 0, steps: 0 },
          ],
        },
        {
          id: '3',
          workflow: 'Frontend CI',
          branch: 'develop',
          status: 'success',
          duration: 200,
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          commitSha: 'def5678',
          author: 'frontend-dev',
          jobs: [
            { name: 'Lint', status: 'success', duration: 40, steps: 6 },
            { name: 'Test', status: 'success', duration: 100, steps: 15 },
            { name: 'Build', status: 'success', duration: 60, steps: 8 },
          ],
        },
      ];

      setDashboardData(mockData);
      calculateStats(mockData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching CI/CD data:', error);
      setLoading(false);
    }
  };

  const calculateStats = (data: CICDRun[]) => {
    const totalRuns = data.length;
    const successRuns = data.filter((run) => run.status === 'success').length;
    const failedRuns = data.filter((run) => run.status === 'failure').length;
    const successRate = totalRuns > 0 ? (successRuns / totalRuns) * 100 : 0;
    const avgDuration = totalRuns > 0 ? data.reduce((sum, run) => sum + run.duration, 0) / totalRuns : 0;

    setStats({
      totalRuns,
      successRate,
      avgDuration,
      failedRuns,
    });
  };

  // Status icon and color mapping
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failure':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'pending':
        return <SyncOutlined spin style={{ color: '#1890ff' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
    }
  };

  const getStatusTag = (status: string) => {
    const colors = {
      success: 'green',
      failure: 'red',
      pending: 'blue',
      cancelled: 'default',
      skipped: 'default',
    };
    return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
  };

  // Table columns for workflow runs
  const columns = [
    {
      title: 'Workflow',
      dataIndex: 'workflow',
      key: 'workflow',
      render: (text: string, record: CICDRun) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.branch} • {record.commitSha.substring(0, 7)}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Space>
          {getStatusIcon(status)}
          {getStatusTag(status)}
        </Space>
      ),
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => `${Math.floor(duration / 60)}m ${duration % 60}s`,
    },
    {
      title: 'Author',
      dataIndex: 'author',
      key: 'author',
    },
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: string) => new Date(timestamp).toLocaleString(),
    },
  ];

  // Success Rate Pie Chart Data
  const successRateData = [
    { type: 'Success', value: stats.successRate },
    { type: 'Failed', value: 100 - stats.successRate },
  ];

  const pieConfig = {
    data: successRateData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name} {percentage}',
    },
    interactions: [{ type: 'element-active' }],
    color: ['#52c41a', '#ff4d4f'],
  };

  // Duration Trend Line Chart Data
  const durationTrendData = dashboardData.map((run, index) => ({
    time: new Date(run.timestamp).toLocaleTimeString(),
    duration: run.duration,
    workflow: run.workflow,
  }));

  const lineConfig = {
    data: durationTrendData,
    xField: 'time',
    yField: 'duration',
    seriesField: 'workflow',
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 2000,
      },
    },
  };

  // Job Status Distribution Column Chart
  const jobStatusData = dashboardData.flatMap((run) =>
    run.jobs.map((job) => ({
      job: job.name,
      duration: job.duration,
      status: job.status,
    }))
  );

  const columnConfig = {
    data: jobStatusData,
    xField: 'job',
    yField: 'duration',
    seriesField: 'status',
    isGroup: true,
    columnStyle: {
      radius: [4, 4, 0, 0],
    },
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" tip="Loading CI/CD Dashboard..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', background: '#f0f2f5' }}>
      <Title level={2}>🎯 CI/CD Results Dashboard</Title>
      <Text type="secondary">Real-time visualization of CI/CD pipeline results</Text>

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginTop: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Runs"
              value={stats.totalRuns}
              prefix={<SyncOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Success Rate"
              value={stats.successRate}
              precision={1}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Failed Runs"
              value={stats.failedRuns}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Avg Duration"
              value={Math.floor(stats.avgDuration)}
              suffix="sec"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts Section */}
      <Tabs defaultActiveKey="1" style={{ marginTop: '24px' }}>
        <TabPane tab="📊 Overview" key="1">
          <Row gutter={16}>
            <Col span={12}>
              <Card title="Success Rate Distribution">
                <Pie {...pieConfig} />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Duration Trend">
                <Line {...lineConfig} />
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="📈 Job Analysis" key="2">
          <Card title="Job Duration by Status">
            <Column {...columnConfig} />
          </Card>
        </TabPane>

        <TabPane tab="📋 Recent Runs" key="3">
          <Card>
            <Table
              columns={columns}
              dataSource={dashboardData}
              rowKey="id"
              expandable={{
                expandedRowRender: (record) => (
                  <Timeline
                    items={record.jobs.map((job) => ({
                      children: (
                        <Space>
                          {getStatusIcon(job.status)}
                          <Text strong>{job.name}</Text>
                          <Text type="secondary">
                            {Math.floor(job.duration / 60)}m {job.duration % 60}s • {job.steps} steps
                          </Text>
                        </Space>
                      ),
                      color: job.status === 'success' ? 'green' : job.status === 'failure' ? 'red' : 'gray',
                    }))}
                  />
                ),
              }}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default CICDDashboard;
