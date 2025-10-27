const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  // Transaction reference
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true
  },
  
  // Parties involved
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Product information
  productType: {
    type: String,
    enum: ['prompt', 'bundle', 'api_subscription'],
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'productType'
  },
  
  // Refund details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  
  // Reason and evidence
  reason: {
    type: String,
    enum: [
      'not_as_described',
      'quality_issue',
      'technical_problem',
      'not_working',
      'duplicate_purchase',
      'unauthorized_purchase',
      'other'
    ],
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  evidence: [{
    type: {
      type: String,
      enum: ['screenshot', 'file', 'link']
    },
    url: String,
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Status workflow
  status: {
    type: String,
    enum: [
      'pending',          // Initial submission
      'under_review',     // Being reviewed by platform
      'seller_response',  // Waiting for seller response
      'arbitration',      // Escalated to platform arbitration
      'approved',         // Refund approved
      'rejected',         // Refund rejected
      'completed',        // Refund processed
      'cancelled'         // Cancelled by buyer
    ],
    default: 'pending'
  },
  
  // Communication thread
  messages: [{
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderRole: {
      type: String,
      enum: ['buyer', 'seller', 'platform'],
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000
    },
    attachments: [{
      url: String,
      type: String
    }],
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Seller response
  sellerResponse: {
    content: String,
    respondedAt: Date,
    acceptRefund: Boolean,
    counterOffer: {
      amount: Number,
      reason: String
    }
  },
  
  // Platform decision
  platformDecision: {
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    decidedAt: Date,
    decision: {
      type: String,
      enum: ['full_refund', 'partial_refund', 'reject', 'cancel']
    },
    refundAmount: Number,
    reason: String,
    notes: String
  },
  
  // Resolution
  resolvedAt: Date,
  resolutionNotes: String,
  
  // Deadlines
  sellerResponseDeadline: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
    }
  },
  escalationDate: Date
}, {
  timestamps: true
});

// Indexes
refundSchema.index({ transactionId: 1 });
refundSchema.index({ buyerId: 1, status: 1 });
refundSchema.index({ sellerId: 1, status: 1 });
refundSchema.index({ status: 1, createdAt: -1 });

// Middleware to auto-escalate if seller doesn't respond
refundSchema.methods.checkAndEscalate = async function() {
  if (this.status === 'seller_response' && 
      new Date() > this.sellerResponseDeadline) {
    this.status = 'arbitration';
    this.escalationDate = new Date();
    await this.save();
    return true;
  }
  return false;
};

module.exports = mongoose.model('Refund', refundSchema);
