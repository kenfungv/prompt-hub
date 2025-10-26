const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');

// Payment processing routes
router.post('/create-intent', auth, paymentController.createPaymentIntent);
router.post('/confirm', auth, paymentController.confirmPayment);
router.get('/history', auth, paymentController.getPaymentHistory);
router.get('/:id', auth, paymentController.getPaymentDetails);

// Refund routes
router.post('/refund/:id', auth, paymentController.processRefund);

// Webhook for payment providers (Stripe, PayPal, etc.)
router.post('/webhook/stripe', paymentController.handleStripeWebhook);
router.post('/webhook/paypal', paymentController.handlePayPalWebhook);

module.exports = router;
