const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'stripe', 'bank_transfer', 'other'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending',
    required: true
  },
  paymentType: {
    type: String,
    enum: ['one_time', 'subscription', 'revenue_share'],
    required: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  errorMessage: {
    type: String
  },
  processedAt: {
    type: Date
  }
}, {
  timestamps: true
});

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
