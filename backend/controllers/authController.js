const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// RBAC roles and permissions
const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
};

// Define role-based permissions per resource/action
// Example resources: user, prompt, category, tag, transaction, subscription, webhook, admin
const PERMISSIONS = {
  user: {
    read: [ROLES.USER, ROLES.ADMIN],
    update: [ROLES.USER, ROLES.ADMIN],
    list: [ROLES.ADMIN],
    delete: [ROLES.ADMIN],
  },
  prompt: {
    create: [ROLES.USER, ROLES.ADMIN],
    read: [ROLES.USER, ROLES.ADMIN],
    update: [ROLES.USER, ROLES.ADMIN],
    delete: [ROLES.ADMIN],
    list: [ROLES.USER, ROLES.ADMIN],
  },
  category: {
    create: [ROLES.ADMIN],
    read: [ROLES.USER, ROLES.ADMIN],
    update: [ROLES.ADMIN],
    delete: [ROLES.ADMIN],
    list: [ROLES.USER, ROLES.ADMIN],
  },
  tag: {
    create: [ROLES.ADMIN],
    read: [ROLES.USER, ROLES.ADMIN],
    update: [ROLES.ADMIN],
    delete: [ROLES.ADMIN],
    list: [ROLES.USER, ROLES.ADMIN],
  },
  transaction: {
    create: [ROLES.USER, ROLES.ADMIN],
    read: [ROLES.USER, ROLES.ADMIN],
    list: [ROLES.ADMIN],
  },
  subscription: {
    create: [ROLES.USER, ROLES.ADMIN],
    read: [ROLES.USER, ROLES.ADMIN],
    update: [ROLES.USER, ROLES.ADMIN],
    cancel: [ROLES.USER, ROLES.ADMIN],
    list: [ROLES.ADMIN],
  },
  webhook: {
    manage: [ROLES.ADMIN],
    subscribe: [ROLES.USER, ROLES.ADMIN],
  },
  admin: {
    manage: [ROLES.ADMIN],
  },
};

// ABAC attribute-based checks
// Example attributes: ownership (resource.ownerId === user.id), plan tier (user.tier), usage limits, email verified, etc.
const abacRules = {
  // Only owners can update their own profile unless admin
  canUpdateOwnProfile: (user, targetUserId) => user && (user.role === ROLES.ADMIN || user.id === targetUserId),
  // Only owners can update their own prompt unless admin
  canModifyPrompt: (user, prompt) => user && (user.role === ROLES.ADMIN || prompt.userId === user.id),
  // Feature gates by tier
  featureByTier: (user, feature) => {
    const tier = user?.tier || 'Free';
    const map = {
      Free: new Set(['prompt.read', 'prompt.list']),
      Pro: new Set(['prompt.read', 'prompt.list', 'prompt.create', 'prompt.update']),
      Enterprise: new Set(['prompt.read', 'prompt.list', 'prompt.create', 'prompt.update', 'webhook.subscribe', 'api.access']),
    };
    return map[tier]?.has(feature) || false;
  },
};

// Utility: evaluate RBAC
function hasRolePermission(userRole, resource, action) {
  const allowed = PERMISSIONS?.[resource]?.[action] || [];
  return allowed.includes(userRole);
}

// Utility: build policy decision
function buildPolicyDecision({ user, resource, action, attributes = {} }) {
  const rbac = hasRolePermission(user?.role, resource, action);
  let abac = true;

  // Common ABAC checks by resource/action
  if (resource === 'user' && ['update', 'read', 'delete'].includes(action)) {
    const targetUserId = attributes.targetUserId;
    abac = abacRules.canUpdateOwnProfile(user, targetUserId);
  }
  if (resource === 'prompt' && ['update', 'delete'].includes(action)) {
    const prompt = attributes.prompt; // expects { userId }
    abac = abacRules.canModifyPrompt(user, prompt);
  }
  if (attributes.feature) {
    abac = abac && abacRules.featureByTier(user, attributes.feature);
  }

  const effect = rbac && abac ? 'Allow' : 'Deny';
  return { effect, rbac, abac };
}

// Middleware: authenticate using JWT (attach req.user)
const authenticate = (req, res, next) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    // shape: { userId, email, username, role, tier }
    req.user = {
      userId: payload.userId,
      id: payload.userId,
      email: payload.email,
      username: payload.username,
      role: payload.role || ROLES.USER,
      tier: payload.tier || 'Free',
    };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Middleware factory: authorize by resource/action with optional ABAC attributes
const authorize = (resource, action, getAttributes = () => ({})) => async (req, res, next) => {
  try {
    const user = req.user || {};
    const attributes = await Promise.resolve(getAttributes(req));
    const decision = buildPolicyDecision({ user, resource, action, attributes });

    if (decision.effect === 'Allow') return next();
    return res.status(403).json({ error: 'Forbidden', details: decision });
  } catch (e) {
    return res.status(500).json({ error: 'Authorization error', details: e.message });
  }
};

// Helper to sign JWT with role/tier to support RBAC/ABAC downstream
function signToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role || ROLES.USER,
      tier: user.tier || 'Free',
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
}

// Register a new user
const register = async (req, res) => {
  try {
    const { username, email, password, role, tier } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Username, email, and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      return res.status(409).json({
        error: 'User with this email already exists'
      });
    }

    // Check if username is taken
    const existingUsername = await User.findOne({ where: { username } });

    if (existingUsername) {
      return res.status(409).json({
        error: 'Username is already taken'
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Default role/tier if not provided (role only assignable to admin in separate endpoint)
    const normalizedRole = ROLES.USER; // ignore role from input to prevent elevation
    const normalizedTier = ['Free', 'Pro', 'Enterprise'].includes(tier) ? tier : 'Free';

    // Create new user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: normalizedRole,
      tier: normalizedTier,
    });

    // Generate JWT token with role/tier
    const token = signToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        tier: user.tier,
      }
    });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({
      error: 'Failed to register user',
      details: error.message
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Generate JWT token with role/tier
    const token = signToken(user);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        tier: user.tier,
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      error: 'Failed to login',
      details: error.message
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    // User info should be attached to req by auth middleware
    const userId = req.user.userId;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'role', 'tier', 'createdAt', 'updatedAt']
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.status(200).json({
      message: 'Profile retrieved successfully',
      user
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      error: 'Failed to fetch profile',
      details: error.message
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required'
      });
    }

    // Validate new password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'New password must be at least 6 characters long'
      });
    }

    // Find user
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      error: 'Failed to change password',
      details: error.message
    });
  }
};

// Admin: update user role/tier (RBAC protected)
const updateUserRoleTier = async (req, res) => {
  try {
    const { userId, role, tier } = req.body;

    // RBAC: only admin can manage users
    const decision = buildPolicyDecision({ user: req.user, resource: 'admin', action: 'manage' });
    if (decision.effect !== 'Allow') {
      return res.status(403).json({ error: 'Forbidden', details: decision });
    }

    const target = await User.findByPk(userId);
    if (!target) return res.status(404).json({ error: 'Target user not found' });

    if (role && !Object.values(ROLES).includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const validTiers = ['Free', 'Pro', 'Enterprise'];
    if (tier && !validTiers.includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    if (role) target.role = role;
    if (tier) target.tier = tier;
    await target.save();

    return res.status(200).json({ message: 'User updated', user: { id: target.id, role: target.role, tier: target.tier } });
  } catch (error) {
    console.error('Error updating user role/tier:', error);
    res.status(500).json({ error: 'Failed to update user role/tier', details: error.message });
  }
};

module.exports = {
  // constants and utils for routes/middlewares
  ROLES,
  PERMISSIONS,
  authenticate,
  authorize,
  buildPolicyDecision,

  // controllers
  register,
  login,
  getProfile,
  changePassword,
  updateUserRoleTier,
};
