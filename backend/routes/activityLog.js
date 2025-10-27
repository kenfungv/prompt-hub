const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/activityLog');
const auth = require('../middleware/auth'); // Assuming auth middleware exists

// Middleware to verify authentication (adjust path as needed)
// If you don't have auth middleware, you may need to create it or adjust this

/**
 * @route   POST /api/activity-logs
 * @desc    Create a new activity log entry
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
  try {
    const { action, target, meta } = req.body;
    const userId = req.user.id; // Assuming auth middleware adds user to req

    if (!action || !target) {
      return res.status(400).json({ 
        success: false, 
        message: 'Action and target are required' 
      });
    }

    const log = await ActivityLog.logActivity(userId, action, target, meta);

    res.status(201).json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Error creating activity log:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while creating activity log',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/activity-logs
 * @desc    Get activity logs for the authenticated user
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit, skip, startDate, endDate, action } = req.query;

    const options = {
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0,
      startDate,
      endDate,
      action
    };

    const logs = await ActivityLog.getUserLogs(userId, options);

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching activity logs',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/activity-logs/stats
 * @desc    Get activity statistics for the authenticated user
 * @access  Private
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const stats = await ActivityLog.getActivityStats(userId, startDate, endDate);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching activity statistics',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/activity-logs/:id
 * @desc    Get a specific activity log by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const log = await ActivityLog.findOne({ _id: id, userId });

    if (!log) {
      return res.status(404).json({ 
        success: false, 
        message: 'Activity log not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching activity log',
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/activity-logs/:id
 * @desc    Delete a specific activity log by ID
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const log = await ActivityLog.findOneAndDelete({ _id: id, userId });

    if (!log) {
      return res.status(404).json({ 
        success: false, 
        message: 'Activity log not found' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Activity log deleted successfully',
      data: log
    });
  } catch (error) {
    console.error('Error deleting activity log:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while deleting activity log',
      error: error.message 
    });
  }
});

module.exports = router;
