const express = require('express');
const router = express.Router();
const promptController = require('../controllers/promptController');

// Create a new prompt (CREATE)
router.post('/', promptController.createPrompt);

// Get all prompts (READ)
router.get('/', promptController.getAllPrompts);

// Get a single prompt by ID (READ)
router.get('/:id', promptController.getPromptById);

// Update a prompt by ID (UPDATE)
router.put('/:id', promptController.updatePrompt);

// Delete a prompt by ID (DELETE)
router.delete('/:id', promptController.deletePrompt);

module.exports = router;
