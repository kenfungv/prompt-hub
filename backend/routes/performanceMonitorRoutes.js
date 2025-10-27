const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/performanceMonitorController');

// Health
router.get('/health', ctrl.health);

// Ingest endpoints
router.post('/ingest', ctrl.ingest);
router.post('/log/prompt', ctrl.logPrompt);
router.post('/log/api', ctrl.logApi);
router.post('/log/behavior', ctrl.logBehavior);
router.post('/log/audit', ctrl.logAudit);

// Query and aggregation
router.get('/metrics/query', ctrl.query);
router.post('/metrics/aggregate', ctrl.aggregate);
router.get('/metrics/realtime', ctrl.realtime);
router.get('/metrics/export.csv', ctrl.exportCsv);

module.exports = router;
