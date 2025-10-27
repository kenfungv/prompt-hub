const express = require('express');
const router = express.Router();
const apiKeyController = require('../controllers/apiKeyController');
const auth = require('../middleware/auth');

// API Key management routes
router.post('/', auth, apiKeyController.createApiKey);
router.get('/', auth, apiKeyController.getUserApiKeys);
router.get('/:id', auth, apiKeyController.getApiKeyById);
router.put('/:id', auth, apiKeyController.updateApiKey);
router.delete('/:id', auth, apiKeyController.deleteApiKey);

// API Key operations
router.post('/:id/revoke', auth, apiKeyController.revokeApiKey);
router.post('/:id/activate', auth, apiKeyController.activateApiKey);
router.post('/:id/regenerate', auth, apiKeyController.regenerateApiKey);

// API Key usage tracking
router.get('/:id/usage', auth, apiKeyController.getApiKeyUsage);
router.get('/:id/usage/stats', auth, apiKeyController.getApiKeyStats);
router.get('/:id/usage/history', auth, apiKeyController.getUsageHistory);

// API Key rate limit management
router.put('/:id/rate-limit', auth, apiKeyController.updateRateLimit);
router.get('/:id/rate-limit/status', auth, apiKeyController.getRateLimitStatus);

// API Key validation and verification
router.post('/validate', apiKeyController.validateApiKey);
router.post('/:id/test', auth, apiKeyController.testApiKey);

// API Key scopes and permissions
router.get('/:id/scopes', auth, apiKeyController.getApiKeyScopes);
router.put('/:id/scopes', auth, apiKeyController.updateApiKeyScopes);
router.get('/scopes/available', auth, apiKeyController.getAvailableScopes);

// API Key analytics
router.get('/analytics/overview', auth, apiKeyController.getAnalyticsOverview);
router.get('/analytics/usage-trends', auth, apiKeyController.getUsageTrends);

// API Key security features
router.put('/:id/ip-whitelist', auth, apiKeyController.updateIpWhitelist);
router.put('/:id/domain-whitelist', auth, apiKeyController.updateDomainWhitelist);
router.post('/:id/rotate', auth, apiKeyController.rotateApiKey);

// Bulk operations
router.post('/bulk/revoke', auth, apiKeyController.bulkRevokeApiKeys);
router.post('/bulk/delete', auth, apiKeyController.bulkDeleteApiKeys);

module.exports = router;
