const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 30
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 150
  },
  color: {
    type: String,
    default: '#10B981'
  },
  icon: {
    type: String,
    default: '🏷️'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    promptCount: {
      type: Number,
      default: 0
    },
    usageCount: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes
tagSchema.index({ name: 1 });
tagSchema.index({ slug: 1 });
tagSchema.index({ 'metadata.promptCount': -1 });
tagSchema.index({ 'metadata.usageCount': -1 });

// Pre-save hook to generate slug from name
tagSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.isModified('slug')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  next();
});

// Static method to get popular tags
tagSchema.statics.getPopular = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ 'metadata.usageCount': -1, 'metadata.promptCount': -1 })
    .limit(limit);
};

// Static method to search tags
tagSchema.statics.searchTags = function(query) {
  return this.find({
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } }
    ],
    isActive: true
  }).limit(20);
};

// Method to increment usage count
tagSchema.methods.incrementUsage = function() {
  this.metadata.usageCount += 1;
  return this.save();
};

const Tag = mongoose.model('Tag', tagSchema);

module.exports = Tag;
