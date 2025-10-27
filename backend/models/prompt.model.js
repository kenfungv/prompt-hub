const mongoose = require('mongoose');

const promptSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  content: {
    type: String,
    required: true
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  price: {
    type: Number,
    default: 0,
    min: 0,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  version: {
    type: Number,
    default: 1
  },
  versionHistory: [{
    version: Number,
    content: String,
    description: String,
    updatedAt: Date,
    updatedBy: String
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  metadata: {
    model: String,
    temperature: Number,
    maxTokens: Number,
    topP: Number
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  usageCount: {
    type: Number,
    default: 0
  },
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  likes: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Enhanced indexes for better query performance and full-text search
// Text index for keyword search on title, description, and content
promptSchema.index({ 
  title: 'text', 
  description: 'text', 
  content: 'text' 
}, {
  weights: {
    title: 10,
    description: 5,
    content: 1
  },
  name: 'prompt_text_search'
});

// Compound indexes for common queries
promptSchema.index({ category: 1, status: 1, createdAt: -1 });
promptSchema.index({ author: 1, status: 1, createdAt: -1 });
promptSchema.index({ tags: 1, status: 1 });
promptSchema.index({ price: 1, status: 1 });
promptSchema.index({ usageCount: -1, status: 1 });
promptSchema.index({ 'rating.average': -1, status: 1 });
promptSchema.index({ views: -1, status: 1 });
promptSchema.index({ isPublic: 1, status: 1 });
promptSchema.index({ createdAt: -1 });
promptSchema.index({ updatedAt: -1 });

// Version control method
promptSchema.methods.createNewVersion = function(newContent, description, updatedBy) {
  this.versionHistory.push({
    version: this.version,
    content: this.content,
    description: this.description,
    updatedAt: new Date(),
    updatedBy: updatedBy
  });
  this.version += 1;
  this.content = newContent;
  if (description) this.description = description;
  return this.save();
};

// Method to rollback to previous version
promptSchema.methods.rollbackToVersion = function(versionNumber) {
  const targetVersion = this.versionHistory.find(v => v.version === versionNumber);
  if (!targetVersion) {
    throw new Error('Version not found');
  }
  this.versionHistory.push({
    version: this.version,
    content: this.content,
    description: this.description,
    updatedAt: new Date(),
    updatedBy: 'system'
  });
  this.version += 1;
  this.content = targetVersion.content;
  this.description = targetVersion.description;
  return this.save();
};

// Static method for keyword search
promptSchema.statics.searchByKeyword = function(keyword, filters = {}) {
  const query = {
    $text: { $search: keyword },
    ...filters
  };
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .populate('author', 'name email')
    .populate('category', 'name')
    .populate('tags', 'name');
};

// Method to increment usage count
promptSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  return this.save();
};

// Method to update rating
promptSchema.methods.updateRating = function(newRating) {
  const totalRating = this.rating.average * this.rating.count;
  this.rating.count += 1;
  this.rating.average = (totalRating + newRating) / this.rating.count;
  return this.save();
};

// Method to increment views
promptSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

const Prompt = mongoose.model('Prompt', promptSchema);

module.exports = Prompt;
