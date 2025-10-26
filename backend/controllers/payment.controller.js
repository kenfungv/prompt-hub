const Payment = require('../models/payment.model');
const Subscription = require('../models/subscription.model');

// 創建支付訂單
exports.createPayment = async (req, res) => {
  try {
    const { amount, currency, paymentMethod, paymentType, subscriptionId, metadata } = req.body;
    const userId = req.user.id; // 假設已通過身份驗證中間件

    // 生成唯一訂單號
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const payment = new Payment({
      userId,
      orderId,
      amount,
      currency: currency || 'USD',
      paymentMethod,
      paymentType,
      subscriptionId,
      metadata,
      status: 'pending'
    });

    await payment.save();

    res.status(201).json({
      success: true,
      message: '支付訂單創建成功',
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '創建支付訂單失敗',
      error: error.message
    });
  }
};

// 獲取支付詳情
exports.getPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findById(paymentId).populate('userId', 'name email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: '支付訂單不存在'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '獲取支付詳情失敗',
      error: error.message
    });
  }
};

// 更新支付狀態
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, transactionId, errorMessage } = req.body;

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: '支付訂單不存在'
      });
    }

    payment.status = status;
    if (transactionId) payment.transactionId = transactionId;
    if (errorMessage) payment.errorMessage = errorMessage;
    if (status === 'completed' || status === 'failed') {
      payment.processedAt = new Date();
    }

    await payment.save();

    res.status(200).json({
      success: true,
      message: '支付狀態更新成功',
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新支付狀態失敗',
      error: error.message
    });
  }
};

// 獲取用戶支付歷史
exports.getUserPayments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const query = { userId };
    if (status) query.status = status;

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: payments,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalItems: count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '獲取支付歷史失敗',
      error: error.message
    });
  }
};

// 退款
exports.refundPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: '支付訂單不存在'
      });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: '只能退款已完成的訂單'
      });
    }

    payment.status = 'refunded';
    payment.metadata.refundReason = reason;
    payment.metadata.refundedAt = new Date();

    await payment.save();

    res.status(200).json({
      success: true,
      message: '退款成功',
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '退款失敗',
      error: error.message
    });
  }
};
