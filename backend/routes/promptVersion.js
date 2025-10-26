const express = require('express');
const router = express.Router();
const promptVersionController = require('../controllers/promptVersionController');
const auth = require('../middleware/auth');

// 版本記錄 - Create new version
router.post('/', auth, promptVersionController.createVersion);

// 歷史查詢 - Get version history for a prompt
router.get('/prompt/:promptId', auth, promptVersionController.getVersionHistory);

// 獲取特定版本
router.get('/:versionId', auth, promptVersionController.getVersionById);

// diff查詢 - Compare two versions
router.get('/diff/:versionId1/:versionId2', auth, promptVersionController.compareVersions);

// 恢復到特定版本
router.post('/restore/:versionId', auth, promptVersionController.restoreVersion);

// 刪除版本
router.delete('/:versionId', auth, promptVersionController.deleteVersion);

module.exports = router;
