const Subscription = require('../models/subscription.model');
const crypto = require('crypto');

// Create new subscription
exports.createSubscription = async (req, res) => {
  try {
    const { userId, plan, endDate } = req.body;
    
    // Generate unique API key
    const apiKey = crypto.randomBytes(32).toString('hex');
    
    // Set API call limits based on plan
    const limits = {
      free: 1000,
      basic: 10000,
      premium: 50000,
      enterprise: 100000
    };
    
    const subscription = new Subscription({
      userId,
      plan,
      endDate,
      apiKey,
      apiCallsLimit: limits[plan] || 1000
    });
    
    await subscription.save();
    res.status(201).json(subscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all subscriptions
exports.getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find().populate('userId', 'username email');
    res.status(200).json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get subscription by ID
exports.getSubscriptionById = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id).populate('userId', 'username email');
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    res.status(200).json(subscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get subscriptions by user ID
exports.getSubscriptionsByUserId = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ userId: req.params.userId });
    res.status(200).json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update subscription
exports.updateSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    res.status(200).json(subscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete subscription
exports.deleteSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByIdAndDelete(req.params.id);
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    res.status(200).json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Increment API call usage
exports.incrementApiUsage = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ apiKey: req.params.apiKey });
    if (!subscription) {
      return res.status(404).json({ message: 'Invalid API key' });
    }
    
    if (subscription.apiCallsUsed >= subscription.apiCallsLimit) {
      return res.status(429).json({ message: 'API call limit exceeded' });
    }
    
    subscription.apiCallsUsed += 1;
    await subscription.save();
    res.status(200).json(subscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
