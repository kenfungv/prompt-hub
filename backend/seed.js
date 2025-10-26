const mongoose = require('mongoose');
const User = require('./User');
const Category = require('./models/category.model');
const Tag = require('./models/tag.model');
const Prompt = require('./models/prompt.model');
const Payment = require('./models/payment.model');
const Subscription = require('./models/subscription.model');
const Transaction = require('./models/transaction.model');
const Webhook = require('./models/webhook.model');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prompt-hub';
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected for seeding'))
  .catch(err => console.error('MongoDB connection error:', err));

// API Tiers / Subscription Plans (reference data)
const apiTiers = [
  {
    name: 'Free',
    description: 'Basic access for individuals getting started',
    price: 0,
    currency: 'USD',
    billingPeriod: 'monthly',
    features: [
      '100 API calls per month',
      'Basic prompt templates',
      'Community support',
      'Rate limit: 10 requests/minute'
    ],
    limits: { apiCallsPerMonth: 100, rateLimit: 10, maxPromptsStored: 10 }
  },
  {
    name: 'Pro',
    description: 'Advanced features for power users and professionals',
    price: 29,
    currency: 'USD',
    billingPeriod: 'monthly',
    features: [
      '10,000 API calls per month',
      'All prompt templates',
      'Priority support',
      'Custom categories',
      'Rate limit: 100 requests/minute',
      'Advanced analytics'
    ],
    limits: { apiCallsPerMonth: 10000, rateLimit: 100, maxPromptsStored: 500 }
  },
  {
    name: 'Enterprise',
    description: 'Custom SLAs and unlimited scale for teams',
    price: 199,
    currency: 'USD',
    billingPeriod: 'monthly',
    features: [
      'Unlimited API calls (fair use)',
      'Dedicated support',
      'SSO/SAML',
      'Custom integrations',
      'Rate limit: 1000 requests/minute'
    ],
    limits: { apiCallsPerMonth: 1000000, rateLimit: 1000, maxPromptsStored: 10000 }
  }
];

// Seed data
const sampleCategories = [
  { name: 'Writing', slug: 'writing', description: 'Prompts for writing and blogging' },
  { name: 'Coding', slug: 'coding', description: 'Developer coding helpers' },
  { name: 'Marketing', slug: 'marketing', description: 'Copy, ads, and growth' }
];

const sampleTags = [
  { name: 'chatgpt', slug: 'chatgpt' },
  { name: 'seo', slug: 'seo' },
  { name: 'javascript', slug: 'javascript' }
];

const sampleUsers = [
  {
    username: 'alice',
    email: 'alice@example.com',
    password: 'Password123!',
    tier: 'Free',
    bio: 'Writer and marketer',
    isVerified: true,
    createdAt: new Date('2024-03-01')
  },
  {
    username: 'bob',
    email: 'bob@example.com',
    password: 'Password123!',
    tier: 'Pro',
    bio: 'Developer building tools',
    isVerified: true,
    createdAt: new Date('2024-04-15')
  }
];

const samplePrompts = (userIds, categoryIds, tagIds) => [
  {
    title: 'Blog outline generator',
    content: 'Create a detailed blog outline about {topic} for {audience}.',
    author: userIds[0],
    category: categoryIds[0],
    tags: [tagIds[0], tagIds[1]],
    price: 0,
    isPublic: true,
  },
  {
    title: 'Refactor JS function',
    content: 'Improve the following JavaScript function for performance and readability: {code}',
    author: userIds[1],
    category: categoryIds[1],
    tags: [tagIds[2]],
    price: 4.99,
    isPublic: true,
  }
];

const sampleSubscriptions = (userIds) => [
  {
    user: userIds[0],
    plan: apiTiers[0].name,
    status: 'active',
    startDate: new Date('2024-05-01'),
    endDate: null,
    renewal: true
  },
  {
    user: userIds[1],
    plan: apiTiers[1].name,
    status: 'active',
    startDate: new Date('2024-06-01'),
    endDate: null,
    renewal: true
  }
];

const samplePayments = (userIds) => [
  {
    user: userIds[1],
    amount: 29,
    currency: 'USD',
    provider: 'stripe',
    status: 'succeeded',
    referenceId: 'pi_test_12345',
    createdAt: new Date('2024-06-01')
  }
];

const sampleTransactions = (userIds, promptIds) => [
  {
    buyer: userIds[0],
    seller: userIds[1],
    prompt: promptIds[1],
    amount: 4.99,
    currency: 'USD',
    status: 'completed',
    createdAt: new Date('2024-06-15')
  }
];

const sampleWebhooks = [
  {
    event: 'payment_intent.succeeded',
    provider: 'stripe',
    payload: { id: 'evt_1', object: 'event' },
    processed: true,
    receivedAt: new Date('2024-06-01')
  }
];

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // Clear existing data (keep order to satisfy refs)
    await Promise.all([
      Webhook.deleteMany({}),
      Transaction.deleteMany({}),
      Payment.deleteMany({}),
      Subscription.deleteMany({}),
      Prompt.deleteMany({}),
      Tag.deleteMany({}),
      Category.deleteMany({}),
      User.deleteMany({}),
    ]);

    // Insert base data
    const createdCategories = await Category.insertMany(sampleCategories);
    const createdTags = await Tag.insertMany(sampleTags);
    const createdUsers = await User.insertMany(sampleUsers);

    const prompts = await Prompt.insertMany(
      samplePrompts(createdUsers.map(u => u._id), createdCategories.map(c => c._id), createdTags.map(t => t._id))
    );

    const subs = await Subscription.insertMany(
      sampleSubscriptions(createdUsers.map(u => u._id))
    );

    await Payment.insertMany(samplePayments(createdUsers.map(u => u._id)));

    await Transaction.insertMany(
      sampleTransactions(createdUsers.map(u => u._id), prompts.map(p => p._id))
    );

    await Webhook.insertMany(sampleWebhooks);

    console.log('=== Database seeding completed successfully! ===');
    console.log(`Created: users=${createdUsers.length}, categories=${createdCategories.length}, tags=${createdTags.length}, prompts=${prompts.length}, subs=${subs.length}`);
    console.log(`Defined ${apiTiers.length} API tiers`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { apiTiers, seedDatabase };
