const mongoose = require('mongoose');

const revenueShareSchema = new mongoose.Schema({
  // Transaction reference
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true
  },
  
  // Product information
  productType: {
    type: String,
    enum: ['prompt', 'bundle', 'api_subscription', 'api_usage'],
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'productType'
  },
  
  // Total transaction amount
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  
  // Revenue distribution
  distributions: [{
    // Recipient information
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    recipientRole: {
      type: String,
      enum: [
        'seller',           // Original creator
        'platform',         // Platform fee
        'distributor',      // API reseller/affiliate
        'contributor',      // Bundle contributor
        'referrer'          // Referral partner
      ],
      required: true
    },
    
    // Distribution calculation
    distributionType: {
      type: String,
      enum: ['percentage', 'fixed', 'tiered'],
      required: true
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100
    },
    fixedAmount: Number,
    
    // Calculated amounts
    grossAmount: {
      type: Number,
      required: true
    },
    platformFee: {
      type: Number,
      default: 0
    },
    netAmount: {
      type: Number,
      required: true
    },
    
    // Payout information
    payoutStatus: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed', 'on_hold'],
      default: 'pending'
    },
    payoutDate: Date,
    payoutMethod: {
      type: String,
      enum: ['stripe', 'paypal', 'bank_transfer', 'platform_credit']
    },
    payoutTransactionId: String,
    
    // Metadata
    notes: String,
    calculatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // API-specific distribution settings
  apiDistributionConfig: {
    // For API resellers/distributors
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    distributorCommission: {
      type: Number,
      // Percentage of sale
    },
    tieredRates: [{
      minUsage: Number,
      maxUsage: Number,
      commissionRate: Number
    }],
    // Recurring commission for subscriptions
    recurringCommission: {
      enabled: Boolean,
      durationMonths: Number  // How long distributor gets commission
    }
  },
  
  // Bundle-specific distribution
  bundleContributors: [{
    contributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      // Reference to the specific prompt/API in the bundle
    },
    sharePercentage: Number,
    amount: Number
  }],
  
  // Verification and audit
  verified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  
  // Settlement
  settlementStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'disputed'],
    default: 'pending'
  },
  settlementDate: Date,
  
  // Dispute handling
  disputed: {
    type: Boolean,
    default: false
  },
  disputeReason: String,
  disputeResolvedAt: Date,
  
  // Reporting period
  reportingPeriod: {
    startDate: Date,
    endDate: Date
  },
  
  // Notes and metadata
  internalNotes: String,
  externalNotes: String  // Visible to recipients
}, {
  timestamps: true
});

// Indexes
revenueShareSchema.index({ transactionId: 1 });
revenueShareSchema.index({ 'distributions.recipientId': 1, 'distributions.payoutStatus': 1 });
revenueShareSchema.index({ settlementStatus: 1, settlementDate: 1 });
revenueShareSchema.index({ productType: 1, productId: 1 });
revenueShareSchema.index({ 'apiDistributionConfig.distributorId': 1 });
revenueShareSchema.index({ createdAt: -1 });

// Method to calculate total distributed amount
revenueShareSchema.methods.getTotalDistributed = function() {
  return this.distributions.reduce((sum, dist) => sum + dist.netAmount, 0);
};

// Method to get pending payouts for a user
revenueShareSchema.statics.getPendingPayouts = async function(userId) {
  return await this.find({
    'distributions.recipientId': userId,
    'distributions.payoutStatus': 'pending'
  }).populate('transactionId');
};

// Method to mark distribution as paid
revenueShareSchema.methods.markAsPaid = async function(recipientId, payoutInfo) {
  const distribution = this.distributions.find(
    dist => dist.recipientId.toString() === recipientId.toString()
  );
  
  if (distribution) {
    distribution.payoutStatus = 'paid';
    distribution.payoutDate = new Date();
    distribution.payoutMethod = payoutInfo.method;
    distribution.payoutTransactionId = payoutInfo.transactionId;
    await this.save();
    return true;
  }
  return false;
};

// Pre-save middleware to verify distribution totals
revenueShareSchema.pre('save', function(next) {
  const totalDistributed = this.getTotalDistributed();
  const difference = Math.abs(this.totalAmount - totalDistributed);
  
  // Allow for small rounding errors (1 cent)
  if (difference > 0.01) {
    const err = new Error(
      `Distribution total (${totalDistributed}) doesn't match transaction amount (${this.totalAmount})`
    );
    return next(err);
  }
  
  next();
});

module.exports = mongoose.model('RevenueShare', revenueShareSchema);
