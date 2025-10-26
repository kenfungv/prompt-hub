const Transaction = require('../models/transaction.model');
const Payment = require('../models/payment.model');

// 創建交易記錄
exports.createTransaction = async (req, res) => {
  try {
    const { paymentId, promptId, sellerId, transactionType, totalAmount, platformFeePercentage, description } = req.body;
    const buyerId = req.user.id; // 假設已通過身份驗證中間件

    const transaction = new Transaction({
      paymentId,
      promptId,
      buyerId,
      sellerId,
      transactionType,
      totalAmount,
      platformFeePercentage: platformFeePercentage || 10,
      description,
      status: 'pending'
    });

    await transaction.save();

    res.status(201).json({
      success: true,
      message: '交易記錄創建成功',
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '創建交易記錄失敗',
      error: error.message
    });
  }
};

// 獲取交易詳情
exports.getTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const transaction = await Transaction.findById(transactionId)
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name email')
      .populate('promptId', 'title');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: '交易記錄不存在'
      });
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '獲取交易詳情失敗',
      error: error.message
    });
  }
};

// 更新交易狀態
exports.updateTransactionStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { status, settlementStatus } = req.body;

    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: '交易記錄不存在'
      });
    }

    if (status) transaction.status = status;
    if (settlementStatus) {
      transaction.settlementStatus = settlementStatus;
      if (settlementStatus === 'settled') {
        transaction.settledAt = new Date();
      }
    }

    await transaction.save();

    res.status(200).json({
      success: true,
      message: '交易狀態更新成功',
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新交易狀態失敗',
      error: error.message
    });
  }
};

// 獲取用戶交易歷史
exports.getUserTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, type, status } = req.query;

    const query = {
      $or: [
        { buyerId: userId },
        { sellerId: userId }
      ]
    };

    if (type) query.transactionType = type;
    if (status) query.status = status;

    const transactions = await Transaction.find(query)
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name email')
      .populate('promptId', 'title price')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: transactions,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalItems: count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '獲取交易歷史失敗',
      error: error.message
    });
  }
};

// 獲取賭家收益統計
exports.getSellerRevenue = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const revenue = await Transaction.getSellerRevenue(sellerId, start, end);

    res.status(200).json({
      success: true,
      data: revenue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '獲取賭家收益統計失敗',
      error: error.message
    });
  }
};

// 獲取平台收益統計
exports.getPlatformRevenue = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const revenue = await Transaction.getPlatformRevenue(start, end);

    res.status(200).json({
      success: true,
      data: revenue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '獲取平台收益統計失敗',
      error: error.message
    });
  }
};

// 批次結算交易
exports.settleBatchTransactions = async (req, res) => {
  try {
    const { transactionIds } = req.body;

    const result = await Transaction.updateMany(
      {
        _id: { $in: transactionIds },
        status: 'completed',
        settlementStatus: 'unsettled'
      },
      {
        $set: {
          settlementStatus: 'settled',
          settledAt: new Date()
        }
      }
    );

    res.status(200).json({
      success: true,
      message: `成功結算 ${result.modifiedCount} 筆交易`,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '批次結算交易失敗',
      error: error.message
    });
  }
};
