const express = require('express');
const router = express.Router();
const promptController = require('./prompt.controller');
const categoryController = require('./category.controller');
const tagController = require('./tag.controller');

// Import history routes
const historyRoutes = require('../routes/history');

// Import auth and user routes
const authRoutes = require('../routes/auth');
const userRoutes = require('../routes/user');

// ============= AUTHENTICATION ROUTES =============
router.use('/auth', authRoutes);

// ============= USER ROUTES =============
router.use('/user', userRoutes);

// ============= PROMPT ROUTES =============
// Basic CRUD operations
router.post('/prompts', promptController.createPrompt);
router.get('/prompts', promptController.getPrompts);
router.get('/prompts/:id', promptController.getPromptById);
router.put('/prompts/:id', promptController.updatePrompt);
router.delete('/prompts/:id', promptController.deletePrompt);

// Version control endpoints
router.post('/prompts/:id/versions', promptController.createNewVersion);
router.get('/prompts/:id/versions', promptController.getVersionHistory);
router.post('/prompts/:id/versions/:version/rollback', promptController.rollbackToVersion);

// ============= CATEGORY ROUTES =============
// Basic CRUD operations
router.post('/categories', categoryController.createCategory);
router.get('/categories', categoryController.getCategories);
router.get('/categories/tree', categoryController.getCategoryTree);
router.get('/categories/:id', categoryController.getCategoryById);
router.get('/categories/slug/:slug', categoryController.getCategoryBySlug);
router.put('/categories/:id', categoryController.updateCategory);
router.delete('/categories/:id', categoryController.deleteCategory);

// ============= TAG ROUTES =============
// Basic CRUD operations
router.post('/tags', tagController.createTag);
router.get('/tags', tagController.getTags);
router.get('/tags/popular', tagController.getPopularTags);
router.get('/tags/search', tagController.searchTags);
router.get('/tags/:id', tagController.getTagById);
router.get('/tags/slug/:slug', tagController.getTagBySlug);
router.put('/tags/:id', tagController.updateTag);
router.delete('/tags/:id', tagController.deleteTag);
router.post('/tags/:id/increment', tagController.incrementUsage);

// ============= HISTORY ROUTES =============
// Mount history routes at /history
router.use('/history', historyRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Prompt Hub API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
