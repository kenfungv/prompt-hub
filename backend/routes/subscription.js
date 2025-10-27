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

// Get current user's active subscription
router.get('/current/active', auth, subscriptionController.getCurrentSubscription);

// Update subscription
router.put('/:id', auth, subscriptionController.updateSubscription);

// Cancel subscription
router.post('/:id/cancel', auth, subscriptionController.cancelSubscription);

// Resume cancelled subscription
router.post('/:id/resume', auth, subscriptionController.resumeSubscription);

// Renew subscription (manual renewal)
router.post('/:id/renew', auth, subscriptionController.renewSubscription);

// Auto-renewal toggle
router.put('/:id/auto-renew', auth, subscriptionController.toggleAutoRenew);

// Upgrade/Downgrade subscription plan
router.post('/:id/change-plan', auth, subscriptionController.changePlan);

// Get subscription plans
router.get('/plans/all', subscriptionController.getSubscriptionPlans);

// Get plan by ID
router.get('/plans/:planId', subscriptionController.getPlanById);

// Delete subscription
router.delete('/:id', auth, subscriptionController.deleteSubscription);

// Increment API usage
router.post('/api-usage/:apiKey', subscriptionController.incrementApiUsage);

// Get API usage statistics
router.get('/:id/usage', auth, subscriptionController.getUsageStats);

// Check subscription status and validity
router.get('/:id/status', auth, subscriptionController.checkSubscriptionStatus);

module.exports = router;
