const express = require('express');
const passport = require('passport');
const router = express.Router();
const {
  register,
  login,
  getProfile,
  changePassword
} = require('../controllers/authController');

// JWT authentication middleware (to be implemented)
const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

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
router.get('/profile', authenticateJWT, getProfile);

// @route   PUT /auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', authenticateJWT, changePassword);

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
router.get('/google/callback',
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
// @access  Private
router.get('/current', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

module.exports = router;
