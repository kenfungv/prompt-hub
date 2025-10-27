const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');

// Payment processing routes
router.post('/create-intent', auth, paymentController.createPaymentIntent);
router.post('/confirm', auth, paymentController.confirmPayment);

// Get payment history (with filters: date range, status, etc.)
router.get('/history', auth, paymentController.getPaymentHistory);

// Get payment details by ID
router.get('/:id', auth, paymentController.getPaymentDetails);

// Get all transactions (admin only)
router.get('/transactions/all', auth, paymentController.getAllTransactions);

// Get transaction records by user
router.get('/transactions/user/:userId', auth, paymentController.getUserTransactions);

// Get transaction by ID
router.get('/transactions/:transactionId', auth, paymentController.getTransactionById);

// Payment method management
router.post('/methods', auth, paymentController.addPaymentMethod);
router.get('/methods', auth, paymentController.getPaymentMethods);
router.put('/methods/:methodId', auth, paymentController.updatePaymentMethod);
router.delete('/methods/:methodId', auth, paymentController.deletePaymentMethod);
router.post('/methods/:methodId/default', auth, paymentController.setDefaultPaymentMethod);

// Invoice management
router.get('/invoices', auth, paymentController.getInvoices);
router.get('/invoices/:invoiceId', auth, paymentController.getInvoiceById);
router.get('/invoices/:invoiceId/download', auth, paymentController.downloadInvoice);
router.post('/invoices/:invoiceId/send', auth, paymentController.sendInvoiceEmail);

// Refund routes
router.post('/refund/:id', auth, paymentController.processRefund);
router.get('/refunds', auth, paymentController.getRefundHistory);
router.get('/refunds/:refundId', auth, paymentController.getRefundDetails);

// Payment status check
router.get('/status/:paymentId', auth, paymentController.checkPaymentStatus);

// Retry failed payment
router.post('/retry/:paymentId', auth, paymentController.retryPayment);

// Cancel pending payment
router.post('/cancel/:paymentId', auth, paymentController.cancelPayment);

// Webhook for payment providers (Stripe, PayPal, etc.)
router.post('/webhook/stripe', paymentController.handleStripeWebhook);
router.post('/webhook/paypal', paymentController.handlePayPalWebhook);

// Get webhook logs (admin only)
router.get('/webhook/logs', auth, paymentController.getWebhookLogs);

module.exports = router;
