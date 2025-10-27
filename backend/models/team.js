const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  teamName: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  roles: {
    type: Map,
    of: {
      permissions: [{
        type: String,
        enum: ['read', 'write', 'delete', 'manage', 'invite']
      }]
    },
    default: () => ({
      owner: { permissions: ['read', 'write', 'delete', 'manage', 'invite'] },
      admin: { permissions: ['read', 'write', 'delete', 'invite'] },
      member: { permissions: ['read', 'write'] },
      viewer: { permissions: ['read'] }
    })
  },
  inviteToken: {
    token: {
      type: String,
      unique: true,
      sparse: true
    },
    expiresAt: {
      type: Date
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  apiKeys: [{
    keyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApiKey'
    },
    permissions: [{
      type: String,
      enum: ['read', 'write', 'delete']
    }],
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 索引優化
teamSchema.index({ teamName: 1 });
teamSchema.index({ 'members.userId': 1 });
teamSchema.index({ 'inviteToken.token': 1 });

// 更新時間中間件
teamSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 團隊方法：添加成員
teamSchema.methods.addMember = function(userId, role = 'member') {
  const existingMember = this.members.find(m => m.userId.toString() === userId.toString());
  if (existingMember) {
    throw new Error('Member already exists in team');
  }
  this.members.push({ userId, role });
  return this.save();
};

// 團隊方法：移除成員
teamSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(m => m.userId.toString() !== userId.toString());
  return this.save();
};

// 團隊方法：更新成員角色
teamSchema.methods.updateMemberRole = function(userId, newRole) {
  const member = this.members.find(m => m.userId.toString() === userId.toString());
  if (!member) {
    throw new Error('Member not found in team');
  }
  member.role = newRole;
  return this.save();
};

// 團隊方法：生成邀請令牌
teamSchema.methods.generateInviteToken = function(createdBy, expiresInDays = 7) {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  
  this.inviteToken = {
    token,
    expiresAt,
    createdBy
  };
  return this.save();
};

// 團隊方法：驗證邀請令牌
teamSchema.methods.validateInviteToken = function(token) {
  if (!this.inviteToken || !this.inviteToken.token) {
    return false;
  }
  if (this.inviteToken.token !== token) {
    return false;
  }
  if (this.inviteToken.expiresAt < new Date()) {
    return false;
  }
  return true;
};

// 團隊方法：檢查成員權限
teamSchema.methods.hasPermission = function(userId, permission) {
  const member = this.members.find(m => m.userId.toString() === userId.toString());
  if (!member) {
    return false;
  }
  const rolePermissions = this.roles.get(member.role);
  return rolePermissions && rolePermissions.permissions.includes(permission);
};

// 團隊方法：添加API密鑰
teamSchema.methods.addApiKey = function(keyId, permissions = ['read']) {
  this.apiKeys.push({ keyId, permissions });
  return this.save();
};

// 團隊方法：移除API密鑰
teamSchema.methods.removeApiKey = function(keyId) {
  this.apiKeys = this.apiKeys.filter(k => k.keyId.toString() !== keyId.toString());
  return this.save();
};

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;
