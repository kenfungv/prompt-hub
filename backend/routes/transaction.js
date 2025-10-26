const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { authenticate } = require('../middleware/auth'); // 假設有身份驗證中間件

// 創建交易記錄
router.post('/', authenticate, transactionController.createTransaction);

// 獲取交易詳情
router.get('/:transactionId', authenticate, transactionController.getTransaction);

// 更新交易狀態
router.put('/:transactionId/status', authenticate, transactionController.updateTransactionStatus);

// 獲取用戶交易歷史
router.get('/user/history', authenticate, transactionController.getUserTransactions);

// 獲取賭家收益統計
router.get('/seller/:sellerId/revenue', authenticate, transactionController.getSellerRevenue);

// 獲取平台收益統計 (需要管理員權限)
router.get('/platform/revenue', authenticate, transactionController.getPlatformRevenue);

// 批次結算交易 (需要管理員權限)
router.post('/settle/batch', authenticate, transactionController.settleBatchTransactions);

module.exports = router;
