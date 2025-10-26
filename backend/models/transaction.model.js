const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true
  },
  promptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prompt'
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  transactionType: {
    type: String,
    enum: ['prompt_purchase', 'subscription', 'revenue_share', 'refund'],
    required: true
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  platformFee: {
    type: Number,
    required: true,
    min: 0
  },
  platformFeePercentage: {
    type: Number,
    required: true,
    default: 10,
    min: 0,
    max: 100
  },
  sellerRevenue: {
    type: Number,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
    required: true
  },
  settlementStatus: {
    type: String,
    enum: ['unsettled', 'settled', 'failed'],
    default: 'unsettled'
  },
  settledAt: {
    type: Date
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  description: {
    type: String
  }
}, {
  timestamps: true
});

transactionSchema.index({ buyerId: 1, createdAt: -1 });
transactionSchema.index({ sellerId: 1, createdAt: -1 });
transactionSchema.index({ status: 1, settlementStatus: 1 });

// 計算分潤
ransactionSchema.pre('save', function(next) {
  if (this.isModified('totalAmount') || this.isModified('platformFeePercentage')) {
    this.platformFee = (this.totalAmount * this.platformFeePercentage) / 100;
    this.sellerRevenue = this.totalAmount - this.platformFee;
  }
  next();
});

// 靜態方法：獲取賭家總收益
transactionSchema.statics.getSellerRevenue = async function(sellerId, startDate, endDate) {
  const match = {
    sellerId: mongoose.Types.ObjectId(sellerId),
    status: 'completed',
    settlementStatus: { $in: ['unsettled', 'settled'] }
  };
  
  if (startDate && endDate) {
    match.createdAt = { $gte: startDate, $lte: endDate };
  }

  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$sellerRevenue' },
        totalTransactions: { $sum: 1 },
        settledRevenue: {
          $sum: {
            $cond: [{ $eq: ['$settlementStatus', 'settled'] }, '$sellerRevenue', 0]
          }
        },
        unsettledRevenue: {
          $sum: {
            $cond: [{ $eq: ['$settlementStatus', 'unsettled'] }, '$sellerRevenue', 0]
          }
        }
      }
    }
  ]);

  return result[0] || {
    totalRevenue: 0,
    totalTransactions: 0,
    settledRevenue: 0,
    unsettledRevenue: 0
  };
};

// 靜態方法：獲取平台總收益
transactionSchema.statics.getPlatformRevenue = async function(startDate, endDate) {
  const match = {
    status: 'completed'
  };
  
  if (startDate && endDate) {
    match.createdAt = { $gte: startDate, $lte: endDate };
  }

  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalPlatformFee: { $sum: '$platformFee' },
        totalTransactions: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);

  return result[0] || {
    totalPlatformFee: 0,
    totalTransactions: 0,
    totalAmount: 0
  };
};

module.exports = mongoose.model('Transaction', transactionSchema);
