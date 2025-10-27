# Performance Monitor 模組

本模組提供全自動性能監控與運營分析能力，覆蓋指標上報、實時快照、聚合查詢、報表導出與Admin Panel可視化。

## 後端能力
- Model: backend/models/PerformanceMetric.js（多維指標結構、索引、TTL、靜態方法）
- Controller: backend/controllers/performanceMonitorController.js（ingest/query/aggregate/realtime/exportCsv）
- Routes: backend/routes/performanceMonitorRoutes.js（掛載於 /api/perf）
- server.js: 接入 /api/perf 路由，對外暴露端點

### API 一覽（基準路徑：/api/perf）
- GET /health
- POST /ingest（通用）
- POST /log/prompt | /log/api | /log/behavior | /log/audit
- GET /metrics/realtime（最近5分鐘聚合）
- GET /metrics/query?metricType=&startTime=&endTime=&aggregationPeriod=&...
- POST /metrics/aggregate { metricType, startTime, endTime, groupBy, metrics }
- GET /metrics/export.csv?metricType=&startTime=&endTime=&aggregationPeriod=

### 數據保留與清理
- TTL索引：timestamp 自動過期 90 天

## 前端能力（Admin Panel）
- Page: frontend/pages/admin/performance/index.tsx
- 功能：實時快照展示、時間範圍選擇、Metric類型切換、CSV導出、自動刷新

## 開發接入指引
- 從任意服務上報：POST /api/perf/ingest，payload 需包含 metricType、metrics、timestamp（可選）、environment 等
- 推薦使用快捷上報端點：/log/prompt, /log/api 等

## 未來擴展
- 儀表與報表可配置化（保存視圖與模板）
- 多租戶/工作空間隔離與配額治理
- 指標告警與Webhook通知
- OpenTelemetry/OTLP 接入

## 版本與變更紀錄
- 2025-10-28: 首版提交，落地後端模型、控制器、路由與前端頁面
