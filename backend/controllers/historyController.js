const History = require('../models/History');
const Prompt = require('../models/prompt.model');
const User = require('../models/User');

// @desc    Create a new history record
// @route   POST /api/history
// @access  Private
const createHistory = async (req, res) => {
  try {
    const { promptId, userId, action, meta } = req.body;

    // Validate required fields
    if (!promptId || !userId || !action) {
      return res.status(400).json({ message: 'promptId, userId, and action are required' });
    }

    // Verify prompt exists
    const prompt = await Prompt.findById(promptId);
    if (!prompt) {
      return res.status(404).json({ message: 'Prompt not found' });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create history record
    const history = await History.create({
      promptId,
      userId,
      action,
      meta: meta || {}
    });

    res.status(201).json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all history records
// @route   GET /api/history
// @access  Private
const getAllHistory = async (req, res) => {
  try {
    const { page = 1, limit = 50, promptId, userId, action } = req.query;
    
    // Build filter object
    const filter = {};
    if (promptId) filter.promptId = promptId;
    if (userId) filter.userId = userId;
    if (action) filter.action = action;

    const skip = (page - 1) * limit;

    const history = await History.find(filter)
      .populate('promptId', 'title description')
      .populate('userId', 'username email')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await History.countDocuments(filter);

    res.status(200).json({
      history,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get history record by ID
// @route   GET /api/history/:id
// @access  Private
const getHistoryById = async (req, res) => {
  try {
    const history = await History.findById(req.params.id)
      .populate('promptId', 'title description')
      .populate('userId', 'username email');

    if (!history) {
      return res.status(404).json({ message: 'History record not found' });
    }

    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get history by prompt ID
// @route   GET /api/history/prompt/:promptId
// @access  Private
const getHistoryByPromptId = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const history = await History.find({ promptId: req.params.promptId })
      .populate('userId', 'username email')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await History.countDocuments({ promptId: req.params.promptId });

    res.status(200).json({
      history,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get history by user ID
// @route   GET /api/history/user/:userId
// @access  Private
const getHistoryByUserId = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const history = await History.find({ userId: req.params.userId })
      .populate('promptId', 'title description')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await History.countDocuments({ userId: req.params.userId });

    res.status(200).json({
      history,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update history record
// @route   PUT /api/history/:id
// @access  Private
const updateHistory = async (req, res) => {
  try {
    const { action, meta } = req.body;

    const history = await History.findById(req.params.id);

    if (!history) {
      return res.status(404).json({ message: 'History record not found' });
    }

    if (action) history.action = action;
    if (meta) history.meta = meta;

    const updatedHistory = await history.save();

    res.status(200).json(updatedHistory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete history record
// @route   DELETE /api/history/:id
// @access  Private
const deleteHistory = async (req, res) => {
  try {
    const history = await History.findById(req.params.id);

    if (!history) {
      return res.status(404).json({ message: 'History record not found' });
    }

    await history.deleteOne();

    res.status(200).json({ message: 'History record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete all history records for a prompt
// @route   DELETE /api/history/prompt/:promptId
// @access  Private
const deleteHistoryByPromptId = async (req, res) => {
  try {
    const result = await History.deleteMany({ promptId: req.params.promptId });

    res.status(200).json({ 
      message: 'History records deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete all history records for a user
// @route   DELETE /api/history/user/:userId
// @access  Private
const deleteHistoryByUserId = async (req, res) => {
  try {
    const result = await History.deleteMany({ userId: req.params.userId });

    res.status(200).json({ 
      message: 'History records deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createHistory,
  getAllHistory,
  getHistoryById,
  getHistoryByPromptId,
  getHistoryByUserId,
  updateHistory,
  deleteHistory,
  deleteHistoryByPromptId,
  deleteHistoryByUserId
};
