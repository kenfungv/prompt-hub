const mongoose = require('mongoose');

/**
 * Permission Schema for Role-Based and Asset-Based Access Control (RBAC + ABAC)
 * 
 * This model defines roles and their associated permissions for the prompt-hub system.
 * It supports both role-based permissions (RBAC) and fine-grained asset-based permissions (ABAC).
 */

const permissionRuleSchema = new mongoose.Schema({
  resource: {
    type: String,
    required: true,
    enum: ['prompt', 'template', 'api_key', 'team', 'project', 'user', 'audit_log', 'settings', 'model'],
    description: 'Resource type this permission applies to'
  },
  actions: [{
    type: String,
    enum: ['create', 'read', 'update', 'delete', 'share', 'execute', 'export', 'import', 'approve', 'reject'],
    description: 'Allowed actions on the resource'
  }],
  conditions: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'ABAC conditions for fine-grained control (e.g., {"ownership": "self", "teamId": "xxx"})'
  },
  scope: {
    type: String,
    enum: ['global', 'team', 'project', 'self'],
    default: 'self',
    description: 'Scope of the permission'
  }
});

const permissionSchema = new mongoose.Schema({
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
    index: true,
    description: 'Unique identifier for the role'
  },
  roleName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
    enum: ['owner', 'admin', 'editor', 'viewer', 'auditor', 'contributor', 'guest'],
    description: 'Name of the role'
  },
  displayName: {
    type: String,
    required: true,
    description: 'Human-readable display name'
  },
  description: {
    type: String,
    default: '',
    description: 'Description of what this role can do'
  },
  permissions: [permissionRuleSchema],
  hierarchy: {
    type: Number,
    required: true,
    default: 0,
    description: 'Hierarchy level (higher number = more privileges). Owner: 100, Admin: 80, Editor: 60, Viewer: 40, Guest: 20'
  },
  isSystem: {
    type: Boolean,
    default: false,
    description: 'System-defined roles cannot be deleted or modified (only extended)'
  },
  isActive: {
    type: Boolean,
    default: true,
    description: 'Whether this role is active'
  },
  inheritsFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission',
    default: null,
    description: 'Parent role to inherit permissions from'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'Additional metadata for custom attributes'
  }
}, {
  timestamps: true
});

// Indexes for performance
permissionSchema.index({ roleName: 1 });
permissionSchema.index({ hierarchy: -1 });
permissionSchema.index({ isSystem: 1, isActive: 1 });

// Virtual for full permission set (including inherited)
permissionSchema.virtual('effectivePermissions').get(async function() {
  let perms = [...this.permissions];
  
  if (this.inheritsFrom) {
    const parentRole = await this.model('Permission').findById(this.inheritsFrom);
    if (parentRole) {
      perms = [...parentRole.permissions, ...perms];
    }
  }
  
  return perms;
});

// Method to check if role has specific permission
permissionSchema.methods.hasPermission = function(resource, action, scope = 'self') {
  return this.permissions.some(perm => 
    perm.resource === resource && 
    perm.actions.includes(action) &&
    (perm.scope === 'global' || perm.scope === scope)
  );
};

// Method to check permission with ABAC conditions
permissionSchema.methods.checkPermission = function(resource, action, context = {}) {
  const matchingPerms = this.permissions.filter(perm => 
    perm.resource === resource && 
    perm.actions.includes(action)
  );
  
  if (matchingPerms.length === 0) return false;
  
  // Check ABAC conditions
  for (const perm of matchingPerms) {
    if (Object.keys(perm.conditions).length === 0) {
      return true; // No conditions means always allow
    }
    
    // Check all conditions match
    const conditionsMatch = Object.entries(perm.conditions).every(([key, value]) => {
      return context[key] === value || (Array.isArray(value) && value.includes(context[key]));
    });
    
    if (conditionsMatch) return true;
  }
  
  return false;
};

// Static method to initialize default system roles
permissionSchema.statics.initializeSystemRoles = async function(adminUserId) {
  const systemRoles = [
    {
      roleId: new mongoose.Types.ObjectId(),
      roleName: 'owner',
      displayName: 'Owner',
      description: 'Full system access with all permissions',
      hierarchy: 100,
      isSystem: true,
      permissions: [
        { resource: 'prompt', actions: ['create', 'read', 'update', 'delete', 'share', 'execute', 'export', 'import'], scope: 'global' },
        { resource: 'template', actions: ['create', 'read', 'update', 'delete', 'share'], scope: 'global' },
        { resource: 'api_key', actions: ['create', 'read', 'update', 'delete'], scope: 'global' },
        { resource: 'team', actions: ['create', 'read', 'update', 'delete'], scope: 'global' },
        { resource: 'project', actions: ['create', 'read', 'update', 'delete'], scope: 'global' },
        { resource: 'user', actions: ['create', 'read', 'update', 'delete'], scope: 'global' },
        { resource: 'audit_log', actions: ['read', 'export'], scope: 'global' },
        { resource: 'settings', actions: ['read', 'update'], scope: 'global' },
        { resource: 'model', actions: ['read', 'execute'], scope: 'global' }
      ],
      createdBy: adminUserId
    },
    {
      roleId: new mongoose.Types.ObjectId(),
      roleName: 'admin',
      displayName: 'Administrator',
      description: 'Administrative access with most permissions except user management',
      hierarchy: 80,
      isSystem: true,
      permissions: [
        { resource: 'prompt', actions: ['create', 'read', 'update', 'delete', 'share', 'execute'], scope: 'global' },
        { resource: 'template', actions: ['create', 'read', 'update', 'delete', 'share'], scope: 'global' },
        { resource: 'api_key', actions: ['create', 'read', 'update', 'delete'], scope: 'team' },
        { resource: 'team', actions: ['read', 'update'], scope: 'team' },
        { resource: 'project', actions: ['create', 'read', 'update', 'delete'], scope: 'team' },
        { resource: 'user', actions: ['read'], scope: 'team' },
        { resource: 'audit_log', actions: ['read'], scope: 'team' },
        { resource: 'settings', actions: ['read', 'update'], scope: 'team' },
        { resource: 'model', actions: ['read', 'execute'], scope: 'global' }
      ],
      createdBy: adminUserId
    },
    {
      roleId: new mongoose.Types.ObjectId(),
      roleName: 'editor',
      displayName: 'Editor',
      description: 'Can create and edit prompts and templates',
      hierarchy: 60,
      isSystem: true,
      permissions: [
        { resource: 'prompt', actions: ['create', 'read', 'update', 'execute'], scope: 'team', conditions: {} },
        { resource: 'prompt', actions: ['delete'], scope: 'self', conditions: { ownership: 'self' } },
        { resource: 'template', actions: ['create', 'read', 'update'], scope: 'team' },
        { resource: 'project', actions: ['read'], scope: 'team' },
        { resource: 'model', actions: ['read', 'execute'], scope: 'global' }
      ],
      createdBy: adminUserId
    },
    {
      roleId: new mongoose.Types.ObjectId(),
      roleName: 'viewer',
      displayName: 'Viewer',
      description: 'Read-only access to prompts and templates',
      hierarchy: 40,
      isSystem: true,
      permissions: [
        { resource: 'prompt', actions: ['read'], scope: 'team' },
        { resource: 'template', actions: ['read'], scope: 'team' },
        { resource: 'project', actions: ['read'], scope: 'team' },
        { resource: 'model', actions: ['read'], scope: 'global' }
      ],
      createdBy: adminUserId
    },
    {
      roleId: new mongoose.Types.ObjectId(),
      roleName: 'auditor',
      displayName: 'Auditor',
      description: 'Can view audit logs and compliance reports',
      hierarchy: 50,
      isSystem: true,
      permissions: [
        { resource: 'audit_log', actions: ['read', 'export'], scope: 'global' },
        { resource: 'prompt', actions: ['read'], scope: 'global' },
        { resource: 'user', actions: ['read'], scope: 'global' },
        { resource: 'team', actions: ['read'], scope: 'global' }
      ],
      createdBy: adminUserId
    }
  ];

  for (const role of systemRoles) {
    const existing = await this.findOne({ roleName: role.roleName });
    if (!existing) {
      await this.create(role);
      console.log(`✅ Created system role: ${role.roleName}`);
    }
  }
};

// Pre-save hook to update timestamp
permissionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Prevent deletion of system roles
permissionSchema.pre('remove', function(next) {
  if (this.isSystem) {
    return next(new Error('Cannot delete system roles'));
  }
  next();
});

const Permission = mongoose.model('Permission', permissionSchema);

module.exports = Permission;
