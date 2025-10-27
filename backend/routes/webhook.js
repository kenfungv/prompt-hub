const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const auth = require('../middleware/auth');

// Webhook management routes
router.post('/', auth, webhookController.createWebhook);
router.get('/', auth, webhookController.getUserWebhooks);
router.get('/:id', auth, webhookController.getWebhookById);
router.put('/:id', auth, webhookController.updateWebhook);
router.delete('/:id', auth, webhookController.deleteWebhook);

// Webhook testing and triggering
router.post('/:id/test', auth, webhookController.testWebhook);
router.post('/:id/trigger', auth, webhookController.triggerWebhook);

// Webhook event logs and statistics
router.get('/:id/logs', auth, webhookController.getWebhookLogs);
router.get('/:id/stats', auth, webhookController.getWebhookStats);

// Webhook event types (for reference)
router.get('/events/types', auth, webhookController.getEventTypes);

// Webhook delivery retry
router.post('/:id/retry/:logId', auth, webhookController.retryWebhookDelivery);

// Webhook verification
router.post('/:id/verify', auth, webhookController.verifyWebhookEndpoint);

module.exports = router;
