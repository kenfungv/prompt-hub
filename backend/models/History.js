const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  promptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prompt',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['created', 'updated', 'deleted', 'viewed', 'copied', 'shared']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// 索引優化
historySchema.index({ promptId: 1, timestamp: -1 });
historySchema.index({ userId: 1, timestamp: -1 });
historySchema.index({ action: 1 });

const History = mongoose.model('History', historySchema);

module.exports = History;
