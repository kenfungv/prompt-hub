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
    updatedBy: String,
    changeLog: String // Added detailed change log
  }],
  // Fork functionality fields
  isFork: {
    type: Boolean,
    default: false
  },
  originalPrompt: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prompt',
    default: null
  },
  forkParent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prompt',
    default: null
  },
  forkChain: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prompt'
  }],
  forkCount: {
    type: Number,
    default: 0
  },
  forks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prompt'
  }],
  forkMetadata: {
    forkReason: String,
    forkedAt: Date,
    forkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
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

// Fork-related indexes
promptSchema.index({ originalPrompt: 1, isFork: 1 });
promptSchema.index({ forkParent: 1 });
promptSchema.index({ forkCount: -1 });

// Version control method with diff support
promptSchema.methods.createNewVersion = function(newContent, description, updatedBy, changeLog) {
  this.versionHistory.push({
    version: this.version,
    content: this.content,
    description: this.description,
    updatedAt: new Date(),
    updatedBy: updatedBy,
    changeLog: changeLog || this.generateDiff(this.content, newContent)
  });
  this.version += 1;
  this.content = newContent;
  if (description) this.description = description;
  return this.save();
};

// Generate simple diff between two versions
promptSchema.methods.generateDiff = function(oldContent, newContent) {
  if (!oldContent || !newContent) return 'Content changed';
  
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  const changes = [];
  const maxLines = Math.max(oldLines.length, newLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    if (oldLines[i] !== newLines[i]) {
      if (!oldLines[i]) {
        changes.push(`+ Line ${i + 1}: ${newLines[i]}`);
      } else if (!newLines[i]) {
        changes.push(`- Line ${i + 1}: ${oldLines[i]}`);
      } else {
        changes.push(`~ Line ${i + 1}: "${oldLines[i]}" -> "${newLines[i]}"`);
      }
    }
  }
  
  return changes.length > 0 ? changes.join('\n') : 'No changes detected';
};

// Get version diff
promptSchema.methods.getVersionDiff = function(versionNumber) {
  const targetVersion = this.versionHistory.find(v => v.version === versionNumber);
  if (!targetVersion) {
    throw new Error('Version not found');
  }
  return {
    version: targetVersion.version,
    changeLog: targetVersion.changeLog,
    updatedAt: targetVersion.updatedAt,
    updatedBy: targetVersion.updatedBy
  };
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
    updatedBy: 'system',
    changeLog: `Rollback to version ${versionNumber}`
  });
  this.version += 1;
  this.content = targetVersion.content;
  this.description = targetVersion.description;
  return this.save();
};

// Fork functionality - Create a fork
promptSchema.methods.createFork = async function(forkData) {
  const { author, forkReason, modifications } = forkData;
  
  const Prompt = this.constructor;
  
  // Build fork chain
  const forkChain = [...(this.forkChain || []), this._id];
  
  // Determine original prompt (the root of fork chain)
  const originalPrompt = this.originalPrompt || this._id;
  
  const forkPrompt = new Prompt({
    title: modifications?.title || `${this.title} (Fork)`,
    description: modifications?.description || this.description,
    content: modifications?.content || this.content,
    tags: modifications?.tags || this.tags,
    category: this.category,
    price: modifications?.price !== undefined ? modifications.price : this.price,
    author: author,
    version: 1,
    versionHistory: [],
    isFork: true,
    originalPrompt: originalPrompt,
    forkParent: this._id,
    forkChain: forkChain,
    forkCount: 0,
    forks: [],
    forkMetadata: {
      forkReason: forkReason || 'No reason provided',
      forkedAt: new Date(),
      forkedBy: author
    },
    status: 'draft',
    metadata: this.metadata,
    isPublic: false,
    usageCount: 0,
    rating: { average: 0, count: 0 },
    likes: 0,
    views: 0
  });
  
  await forkPrompt.save();
  
  // Update parent's fork count and fork list
  this.forkCount += 1;
  this.forks.push(forkPrompt._id);
  await this.save();
  
  return forkPrompt;
};

// Get fork tree
promptSchema.methods.getForkTree = async function() {
  const Prompt = this.constructor;
  
  const buildTree = async (promptId) => {
    const prompt = await Prompt.findById(promptId)
      .select('title author forkCount forks createdAt')
      .populate('author', 'name email');
    
    if (!prompt) return null;
    
    const children = await Promise.all(
      prompt.forks.map(forkId => buildTree(forkId))
    );
    
    return {
      id: prompt._id,
      title: prompt.title,
      author: prompt.author,
      forkCount: prompt.forkCount,
      createdAt: prompt.createdAt,
      children: children.filter(child => child !== null)
    };
  };
  
  return await buildTree(this._id);
};

// Get fork chain (ancestry path)
promptSchema.methods.getForkChainDetails = async function() {
  const Prompt = this.constructor;
  
  const chainDetails = await Promise.all(
    this.forkChain.map(async (promptId) => {
      const prompt = await Prompt.findById(promptId)
        .select('title author version createdAt')
        .populate('author', 'name email');
      return prompt;
    })
  );
  
  return chainDetails.filter(prompt => prompt !== null);
};

// Get all forks (direct children)
promptSchema.methods.getAllForks = async function(options = {}) {
  const Prompt = this.constructor;
  
  const { limit = 10, skip = 0, sort = { createdAt: -1 } } = options;
  
  return await Prompt.find({ _id: { $in: this.forks } })
    .select('title author forkCount status createdAt')
    .populate('author', 'name email')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

// Get original prompt
promptSchema.methods.getOriginalPrompt = async function() {
  if (!this.isFork) return this;
  
  const Prompt = this.constructor;
  return await Prompt.findById(this.originalPrompt)
    .populate('author', 'name email')
    .populate('category', 'name')
    .populate('tags', 'name');
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
