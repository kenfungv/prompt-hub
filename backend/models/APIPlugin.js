// Optional DB model (Mongoose schema example)
// Not wired by default; provided for future persistence layer
const mongoose = require('mongoose');

const APIPluginSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  description: String,
  version: String,
  author: String,
  homepage: String,
  scopes: [String],
  categories: [String],
  integrationTargets: { type: [String], enum: ['Zapier','Slack','Notion','Webhook','Custom'], default: [] },
  webhookUrl: String,
  isPrivate: { type: Boolean, default: false },
  listingStatus: { type: String, enum: ['draft','submitted','approved','rejected'], default: 'draft' },
  price: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  installCount: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.models.APIPlugin || mongoose.model('APIPlugin', APIPluginSchema);
