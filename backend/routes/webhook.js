const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const auth = require('../middleware/auth');

// Webhook management routes
router.post('/', auth, webhookController.createWebhook);
router.get('/', auth, webhookController.getUserWebhooks);
router.put('/:id', auth, webhookController.updateWebhook);
router.delete('/:id', auth, webhookController.deleteWebhook);

module.exports = router;
