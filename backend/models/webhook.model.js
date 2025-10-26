const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Webhook = sequelize.define('Webhook', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  url: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      isUrl: true
    }
  },
  events: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: '訂閱的事件類型，例如: ["prompt.created", "prompt.updated", "comment.created"]'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否啟用此 Webhook'
  },
  secret: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '用於驗證 Webhook 請求的密鑰'
  },
  lastTriggeredAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最後一次觸發時間'
  },
  failureCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '失敗次數'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'webhooks',
  timestamps: true
});

module.exports = Webhook;
