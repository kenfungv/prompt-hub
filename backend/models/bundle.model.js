const mongoose = require('mongoose');

const bundleSchema = new mongoose.Schema({
  // Basic information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  
  // Seller information
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Bundle items
  items: [{
    itemType: {
      type: String,
      enum: ['prompt', 'api'],
      required: true
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'items.itemType'
    },
    // Individual item price if sold separately
    standalonePrice: Number,
    // Custom description for this item in the bundle
    description: String,
    // Order in the bundle
    order: {
      type: Number,
      default: 0
    }
  }],
  
  // Pricing
  bundlePrice: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  discount: {
    type: Number,
    min: 0,
    max: 100,
    // Percentage discount compared to sum of individual items
  },
  totalValue: {
    type: Number,
    // Sum of all individual item prices
  },
  
  // Categories and tags
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  
  // Media
  coverImage: {
    type: String
  },
  gallery: [{
    url: String,
    caption: String,
    order: Number
  }],
  
  // Status and visibility
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'archived'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'unlisted'],
    default: 'public'
  },
  
  // Sales and statistics
  purchaseCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  revenue: {
    type: Number,
    default: 0
  },
  
  // Rating aggregation
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  
  // Batch upload metadata
  batchId: {
    type: String,
    // ID for tracking bundles uploaded together
  },
  
  // Featured and promotion
  featured: {
    type: Boolean,
    default: false
  },
  featuredUntil: Date,
  promotionalPrice: {
    price: Number,
    startDate: Date,
    endDate: Date
  },
  
  // License and terms
  licenseType: {
    type: String,
    enum: ['standard', 'extended', 'commercial', 'personal'],
    default: 'standard'
  },
  termsOfUse: String,
  
  // Support and updates
  includesSupport: {
    type: Boolean,
    default: false
  },
  supportDuration: {
    type: Number,
    // Days of support included
  },
  lastUpdated: Date,
  
  // SEO
  slug: {
    type: String,
    unique: true,
    sparse: true
  },
  metaTitle: String,
  metaDescription: String,
  
  // Moderation
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  moderatorNotes: String
}, {
  timestamps: true
});

// Indexes
bundleSchema.index({ sellerId: 1, status: 1 });
bundleSchema.index({ status: 1, visibility: 1, createdAt: -1 });
bundleSchema.index({ slug: 1 });
bundleSchema.index({ categories: 1 });
bundleSchema.index({ tags: 1 });
bundleSchema.index({ batchId: 1 });
bundleSchema.index({ averageRating: -1, purchaseCount: -1 });

// Virtual for calculating savings
bundleSchema.virtual('savingsPercentage').get(function() {
  if (!this.totalValue || this.totalValue === 0) return 0;
  return Math.round(((this.totalValue - this.bundlePrice) / this.totalValue) * 100);
});

// Pre-save middleware to calculate total value
bundleSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.totalValue = this.items.reduce((sum, item) => {
      return sum + (item.standalonePrice || 0);
    }, 0);
  }
  next();
});

// Method to check if bundle is on sale
bundleSchema.methods.isOnSale = function() {
  if (!this.promotionalPrice || !this.promotionalPrice.price) return false;
  const now = new Date();
  return (
    this.promotionalPrice.startDate <= now &&
    this.promotionalPrice.endDate >= now
  );
};

// Method to get effective price
bundleSchema.methods.getEffectivePrice = function() {
  return this.isOnSale() ? this.promotionalPrice.price : this.bundlePrice;
};

module.exports = mongoose.model('Bundle', bundleSchema);
