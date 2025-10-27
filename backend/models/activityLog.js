const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: ['create', 'read', 'update', 'delete', 'login', 'logout', 'api_call', 'payment', 'subscription', 'other'],
    index: true
  },
  target: {
    type: String,
    required: true,
    description: 'Target resource or endpoint'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'Additional metadata about the activity'
  }
}, {
  timestamps: true,
  collection: 'activityLogs'
});

// Compound index for efficient queries
activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });

// Static method to log activity
activityLogSchema.statics.logActivity = async function(userId, action, target, meta = {}) {
  try {
    const log = await this.create({
      userId,
      action,
      target,
      meta,
      timestamp: new Date()
    });
    return log;
  } catch (error) {
    console.error('Error logging activity:', error);
    throw error;
  }
};

// Static method to get user activity logs
activityLogSchema.statics.getUserLogs = async function(userId, options = {}) {
  const { limit = 50, skip = 0, startDate, endDate, action } = options;
  
  const query = { userId };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  if (action) {
    query.action = action;
  }
  
  return await this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'username email')
    .lean();
};

// Static method to get activity statistics
activityLogSchema.statics.getActivityStats = async function(userId, startDate, endDate) {
  const query = { userId };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  return await this.aggregate([
    { $match: query },
    { $group: {
      _id: '$action',
      count: { $sum: 1 }
    }},
    { $sort: { count: -1 }}
  ]);
};

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
