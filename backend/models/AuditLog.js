const mongoose = require('mongoose');

/**
 * AuditLog Schema for comprehensive audit tracking
 * Captures who/when/what/why with request context and result, for compliance readiness.
 */
const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  username: { type: String, index: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },

  action: { type: String, required: true, index: true }, // e.g., prompt.create
  resource: { type: String, required: true, index: true }, // e.g., prompt
  resourceId: { type: mongoose.Schema.Types.ObjectId, index: true },

  reason: { type: String, default: '' }, // why
  details: { type: mongoose.Schema.Types.Mixed, default: {} }, // arbitrary payload

  ipAddress: { type: String },
  userAgent: { type: String },
  requestId: { type: String, index: true },
  method: { type: String },
  path: { type: String },

  timestamp: { type: Date, default: Date.now, index: true },
  result: { type: String, enum: ['success', 'failure'], default: 'success', index: true },
  error: { type: String, default: '' },

  integrityHash: { type: String, default: '' }, // optional integrity verification
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

// Index compound for common queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ teamId: 1, projectId: 1, timestamp: -1 });

auditLogSchema.methods.toExportJSON = function() {
  return {
    id: this._id,
    userId: this.userId,
    username: this.username,
    teamId: this.teamId,
    projectId: this.projectId,
    action: this.action,
    resource: this.resource,
    resourceId: this.resourceId,
    reason: this.reason,
    details: this.details,
    ipAddress: this.ipAddress,
    userAgent: this.userAgent,
    requestId: this.requestId,
    method: this.method,
    path: this.path,
    timestamp: this.timestamp,
    result: this.result,
    error: this.error,
    metadata: this.metadata
  };
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
