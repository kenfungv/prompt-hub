const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const auth = require('../middleware/auth');

// Webhook management routes
router.post('/register', auth, webhookController.registerWebhook);
router.get('/list', auth, webhookController.listWebhooks);
router.put('/:id', auth, webhookController.updateWebhook);
router.delete('/:id', auth, webhookController.deleteWebhook);
router.post('/test/:id', auth, webhookController.testWebhook);

// Webhook event endpoints
router.post('/trigger/api-call', webhookController.triggerApiCallEvent);
router.post('/trigger/payment', webhookController.triggerPaymentEvent);
router.post('/trigger/subscription', webhookController.triggerSubscriptionEvent);

module.exports = router;
