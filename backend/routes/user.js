const express = require('express');
const router = express.Router();
const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  upgradeUserLevel,
  downgradeUserLevel,
  getUsersByLevel
} = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

// ===== Authentication Routes =====

// Register a new user
// POST /api/users/register
router.post('/register', registerUser);

// Login user
// POST /api/users/login
router.post('/login', loginUser);

// Logout user
// POST /api/users/logout
router.post('/logout', authenticate, logoutUser);

// ===== User Profile Management =====

// Get current user profile
// GET /api/users/profile
router.get('/profile', authenticate, getUserProfile);

// Update current user profile
// PUT /api/users/profile
router.put('/profile', authenticate, updateUserProfile);

// ===== User Level Management =====

// Upgrade user level (Free -> Pro -> Enterprise)
// POST /api/users/:id/upgrade
router.post('/:id/upgrade', authenticate, upgradeUserLevel);

// Downgrade user level
// POST /api/users/:id/downgrade
router.post('/:id/downgrade', authenticate, downgradeUserLevel);

// Get users by level (Free/Pro/Enterprise)
// GET /api/users/level/:level
router.get('/level/:level', authenticate, getUsersByLevel);

// ===== General User CRUD Operations =====

// Create a new user (admin only)
// POST /api/users
router.post('/', authenticate, createUser);

// Get all users (admin only)
// GET /api/users
router.get('/', authenticate, getAllUsers);

// Get a single user by ID
// GET /api/users/:id
router.get('/:id', authenticate, getUserById);

// Update a user by ID (admin only)
// PUT /api/users/:id
router.put('/:id', authenticate, updateUser);

// Delete a user by ID (admin only)
// DELETE /api/users/:id
router.delete('/:id', authenticate, deleteUser);

module.exports = router;
