const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const auth = require('../middleware/auth');

// Create new subscription
router.post('/', auth, subscriptionController.createSubscription);

// Get all subscriptions (admin only)
router.get('/', auth, subscriptionController.getAllSubscriptions);

// Get subscription by ID
router.get('/:id', auth, subscriptionController.getSubscriptionById);

// Get subscriptions by user ID
router.get('/user/:userId', auth, subscriptionController.getSubscriptionsByUserId);

// Update subscription
router.put('/:id', auth, subscriptionController.updateSubscription);

// Delete subscription
router.delete('/:id', auth, subscriptionController.deleteSubscription);

// Increment API usage
router.post('/api-usage/:apiKey', subscriptionController.incrementApiUsage);

module.exports = router;
