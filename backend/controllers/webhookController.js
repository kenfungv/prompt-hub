const Webhook = require('../models/webhook.model');

// 創建新的 Webhook
exports.createWebhook = async (req, res) => {
  try {
    const { url, events, isActive } = req.body;
    const userId = req.user.id;

    const webhook = await Webhook.create({
      userId,
      url,
      events,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      success: true,
      data: webhook
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '創建 Webhook 失敗',
      error: error.message
    });
  }
};

// 獲取用戶的所有 Webhooks
exports.getUserWebhooks = async (req, res) => {
  try {
    const userId = req.user.id;
    const webhooks = await Webhook.findAll({ where: { userId } });

    res.status(200).json({
      success: true,
      data: webhooks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '獲取 Webhooks 失敗',
      error: error.message
    });
  }
};

// 更新 Webhook
exports.updateWebhook = async (req, res) => {
  try {
    const { id } = req.params;
    const { url, events, isActive } = req.body;
    const userId = req.user.id;

    const webhook = await Webhook.findOne({ where: { id, userId } });
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook 不存在'
      });
    }

    await webhook.update({ url, events, isActive });

    res.status(200).json({
      success: true,
      data: webhook
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新 Webhook 失敗',
      error: error.message
    });
  }
};

// 刪除 Webhook
exports.deleteWebhook = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const webhook = await Webhook.findOne({ where: { id, userId } });
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook 不存在'
      });
    }

    await webhook.destroy();

    res.status(200).json({
      success: true,
      message: 'Webhook 已刪除'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '刪除 Webhook 失敗',
      error: error.message
    });
  }
};

// 觸發 Webhook 通知
exports.triggerWebhook = async (userId, eventType, data) => {
  try {
    const webhooks = await Webhook.findAll({
      where: {
        userId,
        isActive: true
      }
    });

    const relevantWebhooks = webhooks.filter(webhook => 
      webhook.events.includes(eventType)
    );

    const axios = require('axios');
    const promises = relevantWebhooks.map(webhook =>
      axios.post(webhook.url, {
        event: eventType,
        timestamp: new Date(),
        data
      }).catch(err => {
        console.error(`Webhook 發送失敗 (${webhook.url}):`, err.message);
      })
    );

    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('觸發 Webhook 失敗:', error.message);
    return false;
  }
};
