const Webhook = require('../models/webhook.model');
const axios = require('axios');
const crypto = require('crypto');

// 創建新的 Webhook
exports.createWebhook = async (req, res) => {
  try {
    const { url, events, isActive } = req.body;
    const userId = req.user.id;
    const secret = crypto.randomBytes(16).toString('hex');

    const webhook = await Webhook.create({
      userId,
      url,
      events,
      secret,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({ success: true, data: webhook });
  } catch (error) {
    res.status(500).json({ success: false, message: '創建 Webhook 失敗', error: error.message });
  }
};

// 獲取用戶的所有 Webhooks
exports.getUserWebhooks = async (req, res) => {
  try {
    const userId = req.user.id;
    const webhooks = await Webhook.findAll({ where: { userId } });
    res.status(200).json({ success: true, data: webhooks });
  } catch (error) {
    res.status(500).json({ success: false, message: '獲取 Webhooks 失敗', error: error.message });
  }
};

// 根據ID獲取 Webhook
exports.getWebhookById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const webhook = await Webhook.findOne({ where: { id, userId } });
    if (!webhook) return res.status(404).json({ success: false, message: 'Webhook 不存在' });
    res.status(200).json({ success: true, data: webhook });
  } catch (error) {
    res.status(500).json({ success: false, message: '獲取 Webhook 失敗', error: error.message });
  }
};

// 更新 Webhook
exports.updateWebhook = async (req, res) => {
  try {
    const { id } = req.params;
    const { url, events, isActive } = req.body;
    const userId = req.user.id;
    const webhook = await Webhook.findOne({ where: { id, userId } });
    if (!webhook) return res.status(404).json({ success: false, message: 'Webhook 不存在' });
    await webhook.update({ url, events, isActive });
    res.status(200).json({ success: true, data: webhook });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新 Webhook 失敗', error: error.message });
  }
};

// 刪除 Webhook
exports.deleteWebhook = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const webhook = await Webhook.findOne({ where: { id, userId } });
    if (!webhook) return res.status(404).json({ success: false, message: 'Webhook 不存在' });
    await webhook.destroy();
    res.status(200).json({ success: true, message: 'Webhook 已刪除' });
  } catch (error) {
    res.status(500).json({ success: false, message: '刪除 Webhook 失敗', error: error.message });
  }
};

// 觸發 Webhook 通知（由業務方調用）
exports.triggerWebhook = async (userId, eventType, data) => {
  try {
    const webhooks = await Webhook.findAll({ where: { userId, isActive: true } });
    const relevant = webhooks.filter(w => (w.events || []).includes(eventType));

    await Promise.all(relevant.map(async (w) => {
      const payload = { event: eventType, timestamp: new Date().toISOString(), data };
      const signature = crypto.createHmac('sha256', w.secret).update(JSON.stringify(payload)).digest('hex');
      try {
        await axios.post(w.url, payload, { headers: { 'X-Webhook-Signature': signature } });
      } catch (err) {
        console.error(`Webhook 發送失敗 (${w.url}):`, err.message);
      }
    }));
    return true;
  } catch (error) {
    console.error('觸發 Webhook 失敗:', error.message);
    return false;
  }
};

// 測試：向指定 Webhook 發送測試事件
exports.testWebhook = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const webhook = await Webhook.findOne({ where: { id, userId } });
    if (!webhook) return res.status(404).json({ success: false, message: 'Webhook 不存在' });

    const payload = {
      event: 'test.event',
      timestamp: new Date().toISOString(),
      data: { ping: true, env: process.env.NODE_ENV || 'local' }
    };
    const signature = crypto.createHmac('sha256', webhook.secret).update(JSON.stringify(payload)).digest('hex');
    const start = Date.now();
    const resp = await axios.post(webhook.url, payload, { headers: { 'X-Webhook-Signature': signature } });
    const ms = Date.now() - start;
    res.json({ success: true, status: resp.status, durationMs: ms, headers: resp.headers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Webhook 測試失敗', error: error.message });
  }
};

// 驗證：對接站點回調簽名驗證
exports.verifyWebhookEndpoint = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const webhook = await Webhook.findOne({ where: { id, userId } });
    if (!webhook) return res.status(404).json({ success: false, message: 'Webhook 不存在' });

    const { echo, signature } = req.body;
    const expected = crypto.createHmac('sha256', webhook.secret).update(String(echo || '')).digest('hex');
    const ok = signature === expected;
    res.json({ success: ok, expected, received: signature });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Webhook 驗證失敗', error: error.message });
  }
};

// 事件類型
exports.getEventTypes = async (req, res) => {
  res.json({ success: true, data: [
    'test.event',
    'prompt.created',
    'prompt.updated',
    'prompt.deleted',
    'user.upgraded',
    'payment.succeeded',
    'payment.failed'
  ]});
};

// 日誌查詢（如使用外部儲存可替換）
exports.getWebhookLogs = async (req, res) => {
  res.json({ success: true, data: [] });
};

// 統計查詢（簡版）
exports.getWebhookStats = async (req, res) => {
  res.json({ success: true, data: { delivered: 0, failed: 0, avgLatencyMs: 0 } });
};

// 重新推送某次投遞
exports.retryWebhookDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const webhook = await Webhook.findOne({ where: { id, userId } });
    if (!webhook) return res.status(404).json({ success: false, message: 'Webhook 不存在' });

    // 簡版：以 test.event 模擬重推
    const payload = { event: 'test.event', timestamp: new Date().toISOString(), data: { retry: true } };
    const signature = crypto.createHmac('sha256', webhook.secret).update(JSON.stringify(payload)).digest('hex');
    await axios.post(webhook.url, payload, { headers: { 'X-Webhook-Signature': signature } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Webhook 重推失敗', error: error.message });
  }
};
