const express = require('express');
const router = express.Router();
const {
  createHistory,
  getAllHistory,
  getHistoryById,
  getHistoryByPromptId,
  getHistoryByUserId,
  updateHistory,
  deleteHistory,
  deleteHistoryByPromptId,
  deleteHistoryByUserId
} = require('../controllers/historyController');

// @route   POST /api/history
// @desc    Create a new history record
// @access  Private
router.post('/', createHistory);

// @route   GET /api/history
// @desc    Get all history records with optional filters
// @access  Private
router.get('/', getAllHistory);

// @route   GET /api/history/:id
// @desc    Get history record by ID
// @access  Private
router.get('/:id', getHistoryById);

// @route   GET /api/history/prompt/:promptId
// @desc    Get all history records for a specific prompt
// @access  Private
router.get('/prompt/:promptId', getHistoryByPromptId);

// @route   GET /api/history/user/:userId
// @desc    Get all history records for a specific user
// @access  Private
router.get('/user/:userId', getHistoryByUserId);

// @route   PUT /api/history/:id
// @desc    Update a history record
// @access  Private
router.put('/:id', updateHistory);

// @route   DELETE /api/history/:id
// @desc    Delete a specific history record
// @access  Private
router.delete('/:id', deleteHistory);

// @route   DELETE /api/history/prompt/:promptId
// @desc    Delete all history records for a specific prompt
// @access  Private
router.delete('/prompt/:promptId', deleteHistoryByPromptId);

// @route   DELETE /api/history/user/:userId
// @desc    Delete all history records for a specific user
// @access  Private
router.delete('/user/:userId', deleteHistoryByUserId);

module.exports = router;
