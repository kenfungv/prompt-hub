const mongoose = require('mongoose');

const promptSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
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
  author: {
    type: String,
    required: true
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
  }
}, {
  timestamps: true
});

// Indexes for better query performance
promptSchema.index({ title: 'text', description: 'text' });
promptSchema.index({ category: 1, status: 1 });
promptSchema.index({ tags: 1 });
promptSchema.index({ author: 1 });
promptSchema.index({ createdAt: -1 });

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

const Prompt = mongoose.model('Prompt', promptSchema);

module.exports = Prompt;
