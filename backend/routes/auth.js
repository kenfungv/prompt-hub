const express = require('express');
const passport = require('passport');
const router = express.Router();

const {
  register,
  login,
  getProfile,
  changePassword,
  authenticate,
  authorize,
  updateUserRoleTier,
} = require('../controllers/authController');

// Replace local JWT parsing with shared authenticate middleware

// @route   POST /auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', register);

// @route   POST /auth/login
// @desc    Login user
// @access  Public
router.post('/login', login);

// @route   GET /auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticate, getProfile);

// @route   PUT /auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', authenticate, changePassword);

// Admin: update user role/tier
// @route   PUT /auth/admin/user-role-tier
// @desc    Admin updates a user's role/tier
// @access  Admin only (RBAC)
router.put(
  '/admin/user-role-tier',
  authenticate,
  authorize('admin', 'manage'),
  updateUserRoleTier
);

// Google OAuth routes
// @route   GET /auth/google
// @desc    Redirect to Google OAuth
// @access  Public
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// @route   GET /auth/google/callback
// @desc    Handle Google OAuth callback
// @access  Public
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect to frontend
    res.redirect(process.env.CLIENT_URL || 'http://localhost:3000');
  }
);

// @route   GET /auth/logout
// @desc    Logout user
// @access  Public
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.redirect(process.env.CLIENT_URL || 'http://localhost:3000');
  });
});

// @route   GET /auth/current
// @desc    Get current user
// @access  Private (session-based)
router.get('/current', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

// @route   GET /auth/status
// @desc    Check authentication status
// @access  Public
router.get('/status', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: req.user || null
    });
  } else if (req.user) {
    res.json({
      authenticated: true,
      user: req.user
    });
  } else {
    res.json({
      authenticated: false,
      user: null
    });
  }
});

module.exports = router;
