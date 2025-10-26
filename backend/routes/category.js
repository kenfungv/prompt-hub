const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const auth = require('../middleware/auth');

// Get all categories
router.get('/', categoryController.getAllCategories);

// Get category by ID
router.get('/:id', categoryController.getCategoryById);

// Create new category (protected route)
router.post('/', auth, categoryController.createCategory);

// Update category (protected route)
router.put('/:id', auth, categoryController.updateCategory);

// Delete category (protected route)
router.delete('/:id', auth, categoryController.deleteCategory);

module.exports = router;
