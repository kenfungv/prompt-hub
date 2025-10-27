const mongoose = require('mongoose');

/**
 * PerformanceMetric Schema
 * 用於記錄系統各項性能指標和運營數據
 * Tracks comprehensive performance metrics and operational data
 */
const performanceMetricSchema = new mongoose.Schema({
  // 基本信息 - Basic Information
  metricType: {
    type: String,
    required: true,
    enum: [
      'PROMPT_EXECUTION',      // Prompt執行
      'API_TRANSACTION',       // API交易
      'AUDIT_EVENT',          // 審核事件
      'USER_BEHAVIOR',        // 用戶行為
      'SYSTEM_RESOURCE',      // 系統資源
      'MODEL_PERFORMANCE',    // 模型性能
      'ERROR_TRACKING',       // 錯誤追蹤
      'BUSINESS_KPI'          // 業務KPI
    ],
    index: true
  },
  
  // 時間戳 - Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  
  // 用戶信息 - User Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Prompt相關 - Prompt Related
  promptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prompt',
    index: true
  },
  
  // 性能指標 - Performance Metrics
  metrics: {
    // 執行時間 (ms)
    executionTime: Number,
    
    // 響應時間 (ms)
    responseTime: Number,
    
    // Token使用量
    tokensUsed: Number,
    
    // 成本
    cost: Number,
    
    // 成功率
    successRate: Number,
    
    // 併發數
    concurrency: Number,
    
    // 吞吐量
    throughput: Number,
    
    // 錯誤率
    errorRate: Number,
    
    // CPU使用率 (%)
    cpuUsage: Number,
    
    // 內存使用 (MB)
    memoryUsage: Number,
    
    // 網絡延遲 (ms)
    networkLatency: Number,
    
    // 數據庫查詢時間 (ms)
    dbQueryTime: Number,
    
    // 緩存命中率 (%)
    cacheHitRate: Number
  },
  
  // 用戶行為數據 - User Behavior Data
  behavior: {
    action: String,              // 操作類型
    duration: Number,            // 停留時間
    clicks: Number,              // 點擊次數
    scrollDepth: Number,         // 滾動深度
    pageViews: Number,           // 頁面瀏覽量
    sessionId: String           // 會話ID
  },
  
  // 業務指標 - Business Metrics
  business: {
    revenue: Number,             // 收入
    conversion: Number,          // 轉化率
    retention: Number,           // 留存率
    churnRate: Number,          // 流失率
    activeUsers: Number,        // 活躍用戶數
    newUsers: Number            // 新用戶數
  },
  
  // 錯誤信息 - Error Information
  error: {
    type: String,
    message: String,
    stack: String,
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    }
  },
  
  // 環境信息 - Environment Info
  environment: {
    service: String,             // 服務名稱
    version: String,             // 版本
    region: String,              // 地區
    instance: String,            // 實例ID
    userAgent: String,           // 用戶代理
    ipAddress: String,           // IP地址
    platform: String             // 平台
  },
  
  // 自定義標籤 - Custom Tags
  tags: {
    type: Map,
    of: String
  },
  
  // 附加數據 - Additional Data
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // 聚合週期 - Aggregation Period
  aggregationPeriod: {
    type: String,
    enum: ['REALTIME', 'MINUTE', 'HOUR', 'DAY', 'WEEK', 'MONTH'],
    default: 'REALTIME'
  },
  
  // 數據來源 - Data Source
  source: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  collection: 'performance_metrics'
});

// 索引優化 - Index Optimization
performanceMetricSchema.index({ metricType: 1, timestamp: -1 });
performanceMetricSchema.index({ userId: 1, timestamp: -1 });
performanceMetricSchema.index({ promptId: 1, timestamp: -1 });
performanceMetricSchema.index({ 'environment.service': 1, timestamp: -1 });
performanceMetricSchema.index({ aggregationPeriod: 1, timestamp: -1 });

// 複合索引用於常見查詢 - Compound indexes for common queries
performanceMetricSchema.index({ 
  metricType: 1, 
  aggregationPeriod: 1, 
  timestamp: -1 
});

// TTL索引 - 自動清理舊數據 (90天)
performanceMetricSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

// 靜態方法 - Static Methods

/**
 * 記錄Prompt執行指標
 */
performanceMetricSchema.statics.logPromptExecution = async function(data) {
  return await this.create({
    metricType: 'PROMPT_EXECUTION',
    ...data,
    source: 'prompt-service'
  });
};

/**
 * 記錄API交易指標
 */
performanceMetricSchema.statics.logApiTransaction = async function(data) {
  return await this.create({
    metricType: 'API_TRANSACTION',
    ...data,
    source: 'api-gateway'
  });
};

/**
 * 記錄用戶行為
 */
performanceMetricSchema.statics.logUserBehavior = async function(data) {
  return await this.create({
    metricType: 'USER_BEHAVIOR',
    ...data,
    source: 'frontend'
  });
};

/**
 * 記錄審核事件
 */
performanceMetricSchema.statics.logAuditEvent = async function(data) {
  return await this.create({
    metricType: 'AUDIT_EVENT',
    ...data,
    source: 'audit-service'
  });
};

/**
 * 獲取指定時間範圍的指標數據
 */
performanceMetricSchema.statics.getMetricsByTimeRange = async function({
  metricType,
  startTime,
  endTime,
  aggregationPeriod = 'REALTIME',
  filters = {}
}) {
  const query = {
    metricType,
    timestamp: {
      $gte: new Date(startTime),
      $lte: new Date(endTime)
    },
    aggregationPeriod,
    ...filters
  };
  
  return await this.find(query).sort({ timestamp: -1 });
};

/**
 * 聚合統計指標
 */
performanceMetricSchema.statics.aggregateMetrics = async function({
  metricType,
  startTime,
  endTime,
  groupBy = 'hour',
  metrics = ['executionTime', 'tokensUsed', 'cost']
}) {
  const groupStage = {
    hour: {
      $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' }
    },
    day: {
      $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
    },
    week: {
      $dateToString: { format: '%Y-W%U', date: '$timestamp' }
    },
    month: {
      $dateToString: { format: '%Y-%m', date: '$timestamp' }
    }
  };
  
  const aggregation = [
    {
      $match: {
        metricType,
        timestamp: {
          $gte: new Date(startTime),
          $lte: new Date(endTime)
        }
      }
    },
    {
      $group: {
        _id: groupStage[groupBy],
        count: { $sum: 1 },
        ...metrics.reduce((acc, metric) => {
          acc[`avg_${metric}`] = { $avg: `$metrics.${metric}` };
          acc[`min_${metric}`] = { $min: `$metrics.${metric}` };
          acc[`max_${metric}`] = { $max: `$metrics.${metric}` };
          acc[`sum_${metric}`] = { $sum: `$metrics.${metric}` };
          return acc;
        }, {})
      }
    },
    {
      $sort: { _id: 1 }
    }
  ];
  
  return await this.aggregate(aggregation);
};

/**
 * 獲取實時性能快照
 */
performanceMetricSchema.statics.getRealtimeSnapshot = async function() {
  const now = new Date();
  const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);
  
  return await this.aggregate([
    {
      $match: {
        timestamp: { $gte: fiveMinutesAgo },
        aggregationPeriod: 'REALTIME'
      }
    },
    {
      $group: {
        _id: '$metricType',
        count: { $sum: 1 },
        avgExecutionTime: { $avg: '$metrics.executionTime' },
        avgResponseTime: { $avg: '$metrics.responseTime' },
        totalTokens: { $sum: '$metrics.tokensUsed' },
        totalCost: { $sum: '$metrics.cost' },
        errorCount: {
          $sum: { $cond: [{ $ne: ['$error', null] }, 1, 0] }
        }
      }
    }
  ]);
};

const PerformanceMetric = mongoose.model('PerformanceMetric', performanceMetricSchema);

module.exports = PerformanceMetric;
