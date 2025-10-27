# prompt-hub API & Plugin Marketplace

## New: API & Plugin Marketplace (Prompt/Agent isolation and integrations)
This release adds an API & Plugin Marketplace enabling prompts/agents to be isolated as microservices, managed via APIs, and listed in a marketplace with review and transactions.

### Frontend: API & Plugin Management
- Page: frontend/pages/APIPlugins.tsx
- Features:
  - CRUD for API Plugins: name, slug, description, version, scopes, categories
  - Integration targets: Zapier, Notion, Slack, Webhook, Custom
  - Webhook URL for exposing prompts/agents as microservices (external call-in)
  - Listing controls: draft, submitted, approved, rejected; private listing toggle
  - Pricing (USD), installs, rating display
  - Actions: Submit for review, Refund, Delete

### Backend: Routes and Model
- Routes: backend/routes/api_plugins.js
  - GET /api/plugins                List plugins
  - POST /api/plugins               Create plugin
  - PUT /api/plugins/:id            Update plugin
  - DELETE /api/plugins/:id         Delete plugin
  - POST /api/plugins/:id/submit    Submit for review
  - POST /api/plugins/:id/review    Approve/Reject (admin)
  - POST /api/plugins/:id/refund    Refund simulation
  - GET /api/plugins/connect/:prov  Third-party connect stub (zapier|notion|slack)
  - POST /api/plugins/invoke/:slug  Invoke prompt/agent microservice (echo simulation)
- Central API mounting: backend/api/routes.js mounts /api/plugins
- Optional model: backend/models/APIPlugin.js (Mongoose schema) for persistence

### Third-party Integrations
- Stubs for Zapier/Notion/Slack connect flows prepared under /api/plugins/connect/:provider
- Next: OAuth apps, token storage, per-scope permissions; Notion workspace, Slack bot installation

### Marketplace lifecycle and policies
- States: draft -> submitted -> approved/rejected
- Private listing: only accessible via direct install keys
- Review guidelines: security, permission scopes, quality checks, audit readiness
- Transactions: refund endpoint stub; payment provider integration to be added

### Prompt/Agent isolation and sandboxing
- Expose selected prompts/agents via /api/plugins/invoke/:slug
- Future: per-plugin runtime policies, rate limits, API keys, audit logs, QA sandbox runs

### How to run
- Backend: ensure backend/server.js runs with app.use('/api', require('./api/routes'))
- Frontend: navigate to /APIPlugins to manage plugins

### Changelog
- feat(frontend): add API & Plugin Marketplace page
- feat(backend): add API plugins routes and invoke endpoint
- chore(models): add optional Mongoose schema for APIPlugin
- feat(backend): mount /api/plugins under central API router

### Roadmap next
- OAuth flows for Zapier/Notion/Slack with scopes and revocation
- Payment integration and entitlements (trial, subscription, one-time)
- Quality gates: automated tests, red-team checks, performance SLOs
- Audit: per-call logging, review workflow, versioned releases
- Ecosystem: publish/install flow, ratings and reviews, vendor profiles
