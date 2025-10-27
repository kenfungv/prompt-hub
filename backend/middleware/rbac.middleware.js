const Permission = require('../models/Permission');

// RBAC middleware: checks if user role allows the specified action on a resource at a scope
// Usage: rbac('prompt', 'create', 'team')
module.exports = function rbac(resource, action, scope = 'self') {
  return async function(req, res, next) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });

      // Expect req.user.roleName to be set by auth middleware
      const roleName = user.roleName || user.role;
      if (!roleName) return res.status(403).json({ message: 'Role not found' });

      const role = await Permission.findOne({ roleName, isActive: true });
      if (!role) return res.status(403).json({ message: 'Role not permitted' });

      const allowed = role.hasPermission(resource, action, scope);
      if (!allowed) {
        return res.status(403).json({ message: 'Forbidden: insufficient role permissions' });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
