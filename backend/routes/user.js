const express = require('express');
const router = express.Router();
const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
} = require('../controllers/userController');
const {
  register,
  login,
  getProfile,
  changePassword,
  updateUserRoleTier
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// ===== Authentication Routes =====
// Register a new user
// POST /api/users/register
router.post('/register', register);

// Login user
// POST /api/users/login
router.post('/login', login);

// ===== User Profile Management =====
// Get current user profile
// GET /api/users/profile
router.get('/profile', authenticate, getProfile);

// Change password
// PUT /api/users/change-password
router.put('/change-password', authenticate, changePassword);

// Upgrade user tier/role
// POST /api/users/upgrade
router.post('/upgrade', authenticate, updateUserRoleTier);

// ===== User CRUD Routes (Admin) =====
// Create a new user
// POST /api/users
router.post('/', authenticate, createUser);

// Get all users
// GET /api/users
router.get('/', authenticate, getAllUsers);

// Get a single user by ID
// GET /api/users/:id
router.get('/:id', authenticate, getUserById);

// Update a user
// PUT /api/users/:id
router.put('/:id', authenticate, updateUser);

// Delete a user
// DELETE /api/users/:id
router.delete('/:id', authenticate, deleteUser);

// Update user role/tier
// PUT /api/users/:id/role-tier
router.put('/:id/role-tier', authenticate, updateUserRoleTier);

module.exports = router;
