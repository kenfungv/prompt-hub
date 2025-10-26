const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagController');
const auth = require('../middleware/auth');

// Get all tags
router.get('/', tagController.getAllTags);

// Get tag by ID
router.get('/:id', tagController.getTagById);

// Create new tag (protected route)
router.post('/', auth, tagController.createTag);

// Update tag (protected route)
router.put('/:id', auth, tagController.updateTag);

// Delete tag (protected route)
router.delete('/:id', auth, tagController.deleteTag);

module.exports = router;
