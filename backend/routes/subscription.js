const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const auth = require('../middleware/auth');

// Subscription plan routes
router.get('/plans', subscriptionController.getAvailablePlans);
router.get('/plans/:id', subscriptionController.getPlanDetails);

// User subscription management
router.post('/subscribe', auth, subscriptionController.createSubscription);
router.get('/current', auth, subscriptionController.getCurrentSubscription);
router.put('/upgrade', auth, subscriptionController.upgradeSubscription);
router.put('/downgrade', auth, subscriptionController.downgradeSubscription);
router.post('/cancel', auth, subscriptionController.cancelSubscription);
router.post('/resume', auth, subscriptionController.resumeSubscription);

// API usage tracking
router.get('/usage', auth, subscriptionController.getUsageStats);
router.get('/usage/history', auth, subscriptionController.getUsageHistory);

// Billing and invoices
router.get('/invoices', auth, subscriptionController.getInvoices);
router.get('/invoices/:id', auth, subscriptionController.getInvoiceDetails);

module.exports = router;
