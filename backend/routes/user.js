const express = require('express');
const router = express.Router();
const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
} = require('../controllers/userController');

// Create a new user
// POST /api/users
router.post('/', createUser);

// Get all users
// GET /api/users
router.get('/', getAllUsers);

// Get a single user by ID
// GET /api/users/:id
router.get('/:id', getUserById);

// Update a user by ID
// PUT /api/users/:id
router.put('/:id', updateUser);

// Delete a user by ID
// DELETE /api/users/:id
router.delete('/:id', deleteUser);

module.exports = router;
