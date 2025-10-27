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

// Rate a prompt (1-5 stars)
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

// ==================== Fork & Collaboration API ====================
// Fork a prompt - Create a copy of an existing prompt
// Body: { title, description } (optional overrides)
router.post('/:id/fork', promptController.forkPrompt);

// Get forks of a prompt
// Query parameters: page, limit
router.get('/:id/forks', promptController.getPromptForks);

// Get fork history/lineage of a prompt
router.get('/:id/fork-history', promptController.getForkHistory);

// ==================== Rating & Review System API ====================
// Add a review/comment to a prompt
// Body: { rating (1-5), comment, pros[], cons[] }
router.post('/:id/reviews', promptController.addReview);

// Get all reviews for a prompt
// Query parameters: page, limit, sortBy (createdAt, rating, helpful)
router.get('/:id/reviews', promptController.getReviews);

// Update a review
// Body: { rating, comment, pros[], cons[] }
router.put('/:id/reviews/:reviewId', promptController.updateReview);

// Delete a review
router.delete('/:id/reviews/:reviewId', promptController.deleteReview);

// Mark a review as helpful
router.post('/:id/reviews/:reviewId/helpful', promptController.markReviewHelpful);

// Get review statistics (average rating, rating distribution)
router.get('/:id/reviews/stats', promptController.getReviewStats);

// ==================== Visibility & Privacy API ====================
// Toggle prompt visibility (public/private)
// Body: { visibility: 'public' | 'private' | 'unlisted' }
router.patch('/:id/visibility', promptController.toggleVisibility);

// Set prompt access permissions
// Body: { allowFork: boolean, allowDownload: boolean, requirePurchase: boolean }
router.patch('/:id/permissions', promptController.setPermissions);

// Share prompt with specific users
// Body: { userIds: [], permissions: 'view' | 'edit' | 'comment' }
router.post('/:id/share', promptController.sharePrompt);

// Remove shared access
router.delete('/:id/share/:userId', promptController.removeSharedAccess);

// Get prompt sharing settings
router.get('/:id/share', promptController.getSharingSettings);

// ==================== Performance Tracking & Analytics API ====================
// Log a prompt usage/execution
// Body: { executionTime, tokens, cost, success, errorMessage }
router.post('/:id/usage-log', promptController.logUsage);

// Get prompt usage statistics
// Query parameters: startDate, endDate, aggregateBy (day, week, month)
router.get('/:id/usage-stats', promptController.getUsageStats);

// Get prompt performance metrics
// Returns: avg execution time, success rate, total runs, token usage
router.get('/:id/performance', promptController.getPerformanceMetrics);

// Track prompt view/impression
router.post('/:id/track-view', promptController.trackView);

// Get prompt analytics dashboard data
// Returns: views, purchases, forks, ratings, revenue
router.get('/:id/analytics', promptController.getAnalytics);

// Get user's prompt usage history
router.get('/user/usage-history', promptController.getUserUsageHistory);

// Export usage logs (CSV/JSON)
// Query parameters: format (csv, json), startDate, endDate
router.get('/:id/export-logs', promptController.exportUsageLogs);

// ==================== Version Control API ====================
// Create a new version of a prompt
// Body: { content, versionNotes, changeDescription }
router.post('/:id/versions', promptController.createVersion);

// Get all versions of a prompt
router.get('/:id/versions', promptController.getVersions);

// Get a specific version
router.get('/:id/versions/:versionId', promptController.getVersion);

// Rollback to a previous version
router.post('/:id/versions/:versionId/rollback', promptController.rollbackVersion);

// Compare two versions
router.get('/:id/versions/:versionId/compare/:compareVersionId', promptController.compareVersions);

module.exports = router;
