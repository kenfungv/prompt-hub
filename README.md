# A/B Testing Module (feature/ab-testing)

This branch implements a full A/B testing module with multi-model, multi-prompt parallel runs, custom traffic allocation, automated comparison UI hooks, user rating system, and report generation. Development is split into backend API and frontend app, with stepwise commits and synced documentation/issues.

## Backend
- Models: backend/models/ab_test.py
  - ABTest, ModelConfig, PromptVariant, TrafficAllocation
  - TestResult with metrics: win rate, cost (USD), generation time (ms), token usage (prompt/completion/total)
  - AggregateMetrics, ComparisonPair, ABTestReport
- Controller: backend/controllers/ab_test_controller.py
  - Lifecycle: create/start/pause/complete
  - Record results, aggregate metrics (avg, p50/p95/p99), compute win rate and cost KPIs
  - Create comparison pairs and submit multi-dimensional user ratings
  - Generate test report with summary, variant performance, winner analysis
- Routes: backend/routes/ab_test_routes.py (FastAPI)
  - POST /ab-tests: create test
  - POST /ab-tests/{id}/start|pause|complete
  - POST /ab-tests/{id}/aggregate
  - POST /ab-tests/{id}/report
  - POST /ab-tests/{id}/results
  - POST /ab-tests/{id}/compare
  - POST /ab-tests/rate/{comparison_id}

Storage is injected via DI and to be implemented (DB/JSON). Execution engine for multi-model concurrency will be added next under backend/api.

## Frontend (planned)
- A/B Test Configurator: define prompt variants, models, traffic allocation
- Live Dashboard: runs, latencies, costs, token usage, win rate
- Automated Comparison View: side-by-side outputs, per-dimension user rating, tie support
- Report Viewer: exportable summary with KPIs and significance placeholders

## Next Steps
- Implement storage adapter (e.g., SQLite/SQLModel or MongoDB) and DI wiring
- Implement execution engine for concurrent multi-model runs with traffic allocation
- Frontend pages/components and API integration
- CI/CD and data visualization modules

## Issues tracking
We will open GitHub issues per task and link PRs. See Issues tab for progress.
