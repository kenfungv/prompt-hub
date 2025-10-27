const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  keyPrefix: {
    type: String,
    required: true,
    index: true
  },
  hashedKey: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'revoked'],
    default: 'active',
    index: true
  },
  permissions: {
    type: [String],
    default: ['read'],
    enum: ['read', 'write', 'delete', 'admin']
  },
  scopes: {
    type: [String],
    default: ['prompts:read'],
    // Available scopes:
    // prompts:read, prompts:write, prompts:delete
    // users:read, users:write
    // webhooks:read, webhooks:write, webhooks:delete
    // analytics:read
    // payments:read, payments:write
  },
  rateLimit: {
    requestsPerMinute: {
      type: Number,
      default: 60
    },
    requestsPerHour: {
      type: Number,
      default: 1000
    },
    requestsPerDay: {
      type: Number,
      default: 10000
    }
  },
  usage: {
    totalRequests: {
      type: Number,
      default: 0
    },
    lastUsedAt: {
      type: Date
    },
    requestsToday: {
      type: Number,
      default: 0
    },
    requestsThisHour: {
      type: Number,
      default: 0
    },
    requestsThisMinute: {
      type: Number,
      default: 0
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    }
  },
  expiresAt: {
    type: Date,
    index: true
  },
  lastUsedIp: {
    type: String
  },
  allowedIps: {
    type: [String],
    default: []
  },
  allowedDomains: {
    type: [String],
    default: []
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  environment: {
    type: String,
    enum: ['development', 'staging', 'production'],
    default: 'production'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  revokedAt: {
    type: Date
  },
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  revokedReason: {
    type: String
  }
});

// Index for efficient queries
apiKeySchema.index({ userId: 1, status: 1 });
apiKeySchema.index({ userId: 1, createdAt: -1 });
apiKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to generate API key
apiKeySchema.statics.generateKey = function() {
  const prefix = 'ph'; // prompt-hub prefix
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const key = `${prefix}_${randomBytes}`;
  const keyPrefix = `${prefix}_${randomBytes.substring(0, 8)}`;
  return { key, keyPrefix };
};

// Static method to hash API key
apiKeySchema.statics.hashKey = function(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
};

// Method to check if key is expired
apiKeySchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Method to check if key is active
apiKeySchema.methods.isActive = function() {
  return this.status === 'active' && !this.isExpired();
};

// Method to check rate limit
apiKeySchema.methods.checkRateLimit = function() {
  const now = new Date();
  const lastReset = this.usage.lastResetDate || now;
  
  // Reset counters if needed
  const minuteDiff = (now - lastReset) / 1000 / 60;
  const hourDiff = (now - lastReset) / 1000 / 60 / 60;
  const dayDiff = (now - lastReset) / 1000 / 60 / 60 / 24;
  
  if (minuteDiff >= 1) {
    this.usage.requestsThisMinute = 0;
  }
  if (hourDiff >= 1) {
    this.usage.requestsThisHour = 0;
  }
  if (dayDiff >= 1) {
    this.usage.requestsToday = 0;
    this.usage.lastResetDate = now;
  }
  
  // Check limits
  if (this.usage.requestsThisMinute >= this.rateLimit.requestsPerMinute) {
    return { allowed: false, limit: 'minute', resetIn: 60 - (minuteDiff * 60) };
  }
  if (this.usage.requestsThisHour >= this.rateLimit.requestsPerHour) {
    return { allowed: false, limit: 'hour', resetIn: 3600 - (hourDiff * 3600) };
  }
  if (this.usage.requestsToday >= this.rateLimit.requestsPerDay) {
    return { allowed: false, limit: 'day', resetIn: 86400 - (dayDiff * 86400) };
  }
  
  return { allowed: true };
};

// Method to increment usage
apiKeySchema.methods.incrementUsage = function(ip) {
  this.usage.totalRequests += 1;
  this.usage.requestsThisMinute += 1;
  this.usage.requestsThisHour += 1;
  this.usage.requestsToday += 1;
  this.usage.lastUsedAt = new Date();
  if (ip) {
    this.lastUsedIp = ip;
  }
  return this.save();
};

// Method to revoke key
apiKeySchema.methods.revoke = function(userId, reason) {
  this.status = 'revoked';
  this.revokedAt = new Date();
  this.revokedBy = userId;
  this.revokedReason = reason;
  return this.save();
};

// Pre-save middleware to update timestamp
apiKeySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for masked key (for display purposes)
apiKeySchema.virtual('maskedKey').get(function() {
  if (!this.keyPrefix) return '****';
  return `${this.keyPrefix}...****`;
});

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

module.exports = ApiKey;
