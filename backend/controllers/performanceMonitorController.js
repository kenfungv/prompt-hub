const PerformanceMetric = require('../models/PerformanceMetric');

/**
 * Performance Monitor Controller
 * 提供指標上報、查詢、聚合統計與導出能力
 */
module.exports = {
  // 健康檢查
  health: async (req, res) => {
    return res.json({ status: 'ok', service: 'performance-monitor', time: new Date() });
  },

  // 上報指標（通用）
  ingest: async (req, res, next) => {
    try {
      const payload = req.body || {};
      const doc = await PerformanceMetric.create({
        ...payload,
        timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      });
      return res.status(201).json({ id: doc._id, ok: true });
    } catch (err) {
      return next(err);
    }
  },

  // 快速上報各類指標
  logPrompt: async (req, res, next) => {
    try {
      const doc = await PerformanceMetric.logPromptExecution(req.body || {});
      return res.status(201).json({ id: doc._id, ok: true });
    } catch (e) { next(e); }
  },
  logApi: async (req, res, next) => {
    try {
      const doc = await PerformanceMetric.logApiTransaction(req.body || {});
      return res.status(201).json({ id: doc._id, ok: true });
    } catch (e) { next(e); }
  },
  logBehavior: async (req, res, next) => {
    try {
      const doc = await PerformanceMetric.logUserBehavior(req.body || {});
      return res.status(201).json({ id: doc._id, ok: true });
    } catch (e) { next(e); }
  },
  logAudit: async (req, res, next) => {
    try {
      const doc = await PerformanceMetric.logAuditEvent(req.body || {});
      return res.status(201).json({ id: doc._id, ok: true });
    } catch (e) { next(e); }
  },

  // 查詢指標
  query: async (req, res, next) => {
    try {
      const { metricType, startTime, endTime, aggregationPeriod, ...filters } = req.query;
      const result = await PerformanceMetric.getMetricsByTimeRange({
        metricType,
        startTime,
        endTime,
        aggregationPeriod,
        filters
      });
      return res.json({ count: result.length, data: result });
    } catch (e) { next(e); }
  },

  // 聚合統計
  aggregate: async (req, res, next) => {
    try {
      const { metricType, startTime, endTime, groupBy, metrics } = req.body;
      const data = await PerformanceMetric.aggregateMetrics({
        metricType,
        startTime,
        endTime,
        groupBy,
        metrics
      });
      return res.json({ data });
    } catch (e) { next(e); }
  },

  // 實時快照
  realtime: async (req, res, next) => {
    try {
      const data = await PerformanceMetric.getRealtimeSnapshot();
      return res.json({ data });
    } catch (e) { next(e); }
  },

  // 導出CSV
  exportCsv: async (req, res, next) => {
    try {
      const { metricType, startTime, endTime, aggregationPeriod, ...filters } = req.query;
      const rows = await PerformanceMetric.getMetricsByTimeRange({
        metricType,
        startTime,
        endTime,
        aggregationPeriod,
        filters
      });
      const headers = [
        'timestamp','metricType','userId','promptId','source','aggregationPeriod',
        'metrics.executionTime','metrics.responseTime','metrics.tokensUsed','metrics.cost','metrics.errorRate',
        'environment.service','environment.version','environment.region','environment.instance'
      ];
      const csv = [headers.join(',')].concat(rows.map(r => ([
        r.timestamp?.toISOString(), r.metricType, r.userId||'', r.promptId||'', r.source||'', r.aggregationPeriod||'',
        r.metrics?.executionTime||'', r.metrics?.responseTime||'', r.metrics?.tokensUsed||'', r.metrics?.cost||'', r.metrics?.errorRate||'',
        r.environment?.service||'', r.environment?.version||'', r.environment?.region||'', r.environment?.instance||''
      ].map(v => typeof v === 'string' ? '"'+v.replace(/"/g,'""')+'"' : v).join(',')))).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=metrics_${Date.now()}.csv`);
      return res.send(csv);
    } catch (e) { next(e); }
  }
};
