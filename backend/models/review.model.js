const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Review target
  targetType: {
    type: String,
    enum: ['prompt', 'bundle', 'api'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'targetType'
  },
  
  // Reviewer information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Review content
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  
  // Review metadata
  verified: {
    type: Boolean,
    default: false // Set to true if user actually purchased/used the item
  },
  helpful: {
    type: Number,
    default: 0 // Number of users who found this review helpful
  },
  reported: {
    type: Number,
    default: 0 // Number of times this review was reported
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'hidden'],
    default: 'pending'
  },
  moderatorNotes: {
    type: String,
    maxlength: 500
  },
  
  // Response from seller
  sellerResponse: {
    content: String,
    respondedAt: Date,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
reviewSchema.index({ targetType: 1, targetId: 1 });
reviewSchema.index({ userId: 1 });
reviewSchema.index({ status: 1, createdAt: -1 });

// Virtual for calculating average rating
reviewSchema.statics.getAverageRating = async function(targetType, targetId) {
  const result = await this.aggregate([
    { 
      $match: { 
        targetType, 
        targetId, 
        status: 'approved' 
      } 
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);
  
  return result.length > 0 ? result[0] : { averageRating: 0, totalReviews: 0 };
};

module.exports = mongoose.model('Review', reviewSchema);
