const Review = require('../models/review.model');
const Transaction = require('../models/transaction.model');

// Create a new review
exports.createReview = async (req, res) => {
  try {
    const { targetType, targetId, rating, title, content } = req.body;
    const userId = req.user.id;

    // Check if user has purchased the item
    const hasPurchased = await Transaction.findOne({
      buyerId: userId,
      productType: targetType,
      productId: targetId,
      status: 'completed'
    });

    // Check if user already reviewed this item
    const existingReview = await Review.findOne({
      userId,
      targetType,
      targetId
    });

    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this item' });
    }

    const review = new Review({
      targetType,
      targetId,
      userId,
      rating,
      title,
      content,
      verified: !!hasPurchased
    });

    await review.save();
    await review.populate('userId', 'username avatar');

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get reviews for a target
exports.getReviews = async (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

    const reviews = await Review.find({
      targetType,
      targetId,
      status: 'approved'
    })
      .populate('userId', 'username avatar')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Review.countDocuments({
      targetType,
      targetId,
      status: 'approved'
    });

    // Get average rating
    const stats = await Review.getAverageRating(targetType, targetId);

    res.json({
      reviews,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalReviews: count,
      averageRating: stats.averageRating,
      ratingStats: stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user's reviews
exports.getUserReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const reviews = await Review.find({ userId })
      .populate('userId', 'username avatar')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Review.countDocuments({ userId });

    res.json({
      reviews,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalReviews: count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a review
exports.updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, title, content } = req.body;
    const userId = req.user.id;

    const review = await Review.findOne({ _id: reviewId, userId });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    review.rating = rating || review.rating;
    review.title = title || review.title;
    review.content = content || review.content;
    review.status = 'pending'; // Re-moderate after edit

    await review.save();
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a review
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const review = await Review.findOneAndDelete({ _id: reviewId, userId });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mark review as helpful
exports.markHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { $inc: { helpful: 1 } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Report a review
exports.reportReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { $inc: { reported: 1 } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // If reported multiple times, auto-hide
    if (review.reported >= 5) {
      review.status = 'hidden';
      await review.save();
    }

    res.json({ message: 'Review reported successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Seller response to review
exports.respondToReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const review = await Review.findById(reviewId).populate('targetId');

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Verify user is the seller
    if (review.targetId.sellerId.toString() !== userId) {
      return res.status(403).json({ error: 'Only the seller can respond' });
    }

    review.sellerResponse = {
      content,
      respondedAt: new Date(),
      respondedBy: userId
    };

    await review.save();
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Moderate review
exports.moderateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { status, moderatorNotes } = req.body;

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { status, moderatorNotes },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Get pending reviews
exports.getPendingReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const reviews = await Review.find({ status: 'pending' })
      .populate('userId', 'username avatar')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Review.countDocuments({ status: 'pending' });

    res.json({
      reviews,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalReviews: count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
