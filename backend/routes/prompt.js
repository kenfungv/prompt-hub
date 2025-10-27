const express = require('express');
const router = express.Router();
const promptController = require('../controllers/promptController');

// ==================== Marketplace API Routes ====================

// Get all prompts with advanced search, filtering, sorting, and pagination
// Query parameters:
//   - q: keyword search (searches across title, description, tags, author)
//   - category: filter by category ID
//   - tag: filter by tag (can be multiple)
//   - minPrice: minimum price filter
//   - maxPrice: maximum price filter
//   - sortBy: sort field (createdAt, updatedAt, price, title, popularity)
//   - sortOrder: asc or desc
//   - page: page number (default: 1)
//   - limit: items per page (default: 10, max: 100)
router.get('/', promptController.getAllPrompts);

// Get marketplace prompts (public prompts only with enhanced filtering)
// Supports same query parameters as GET /
router.get('/marketplace', promptController.getMarketplacePrompts);

// Search prompts with multi-field keyword search
// Query parameters:
//   - q: keyword (required)
//   - Additional filters same as GET /
router.get('/search', promptController.searchPrompts);

// Get popular/trending prompts
// Query parameters:
//   - period: time period (day, week, month, all) default: week
//   - limit: number of results (default: 10)
router.get('/popular', promptController.getPopularPrompts);

// Get prompts by category
// Query parameters: same filtering/sorting/pagination as GET /
router.get('/category/:categoryId', promptController.getPromptsByCategory);

// Get prompts by tag
// Query parameters: same filtering/sorting/pagination as GET /
router.get('/tag/:tagName', promptController.getPromptsByTag);

// Get prompts by author/user
router.get('/author/:userId', promptController.getPromptsByAuthor);

// ==================== CRUD Operations ====================

// Create a new prompt (CREATE)
router.post('/', promptController.createPrompt);

// Get a single prompt by ID (READ)
router.get('/:id', promptController.getPromptById);

// Update a prompt by ID (UPDATE)
router.put('/:id', promptController.updatePrompt);

// Delete a prompt by ID (DELETE)
router.delete('/:id', promptController.deletePrompt);

// ==================== Additional Prompt Operations ====================

// Purchase a prompt
router.post('/:id/purchase', promptController.purchasePrompt);

// Like/Unlike a prompt
router.post('/:id/like', promptController.likePrompt);
router.delete('/:id/like', promptController.unlikePrompt);

// Bookmark/Unbookmark a prompt
router.post('/:id/bookmark', promptController.bookmarkPrompt);
router.delete('/:id/bookmark', promptController.unbookmarkPrompt);

// Rate a prompt
router.post('/:id/rate', promptController.ratePrompt);

// Get user's own prompts
router.get('/user/my-prompts', promptController.getMyPrompts);

// Get user's purchased prompts
router.get('/user/purchased', promptController.getPurchasedPrompts);

// Get user's bookmarked prompts
router.get('/user/bookmarks', promptController.getBookmarkedPrompts);

// Publish/Unpublish a prompt
router.patch('/:id/publish', promptController.publishPrompt);
router.patch('/:id/unpublish', promptController.unpublishPrompt);

module.exports = router;
