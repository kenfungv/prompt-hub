const mongoose = require('mongoose');
const User = require('./User');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prompt-hub';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected for seeding'))
.catch(err => console.error('MongoDB connection error:', err));

// API Tiers / Subscription Plans
const apiTiers = [
  {
    name: 'Free',
    description: 'Basic access for individuals getting started',
    price: 0,
    currency: 'USD',
    features: [
      '100 API calls per month',
      'Basic prompt templates',
      'Community support',
      'Rate limit: 10 requests/minute'
    ],
    limits: {
      apiCallsPerMonth: 100,
      rateLimit: 10,
      maxPromptsStored: 10
    }
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
    limits: {
      apiCallsPerMonth: 10000,
      rateLimit: 100,
      maxPromptsStored: 100
    }
  },
  {
    name: 'Enterprise',
    description: 'Unlimited access for teams and organizations',
    price: 299,
    currency: 'USD',
    billingPeriod: 'monthly',
    features: [
      'Unlimited API calls',
      'All prompt templates',
      'Dedicated support',
      'Custom integrations',
      'Rate limit: 1000 requests/minute',
      'Team collaboration',
      'Advanced analytics & reporting',
      'SLA guarantee'
    ],
    limits: {
      apiCallsPerMonth: -1, // unlimited
      rateLimit: 1000,
      maxPromptsStored: -1 // unlimited
    }
  }
];

// Demo/Sample Accounts
const sampleUsers = [
  {
    username: 'demo_user',
    email: 'demo@prompthub.com',
    password: 'Demo123!@#', // Should be hashed in production
    tier: 'Free',
    bio: 'Demo user account for testing',
    isVerified: true,
    createdAt: new Date('2024-01-01')
  },
  {
    username: 'pro_demo',
    email: 'pro@prompthub.com',
    password: 'ProDemo123!@#',
    tier: 'Pro',
    bio: 'Professional tier demo account',
    isVerified: true,
    createdAt: new Date('2024-01-15')
  },
  {
    username: 'enterprise_demo',
    email: 'enterprise@prompthub.com',
    password: 'EntDemo123!@#',
    tier: 'Enterprise',
    bio: 'Enterprise tier demo account',
    isVerified: true,
    createdAt: new Date('2024-02-01')
  },
  {
    username: 'test_creator',
    email: 'creator@prompthub.com',
    password: 'Creator123!@#',
    tier: 'Pro',
    bio: 'Content creator with sample prompts',
    isVerified: true,
    createdAt: new Date('2024-03-01')
  }
];

// Seed function
async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('Clearing existing users...');
    await User.deleteMany({});

    // Insert API Tiers/Subscription Plans
    console.log('Seeding API tiers...');
    console.log(JSON.stringify(apiTiers, null, 2));
    console.log('Note: Store API tiers in a separate collection or configuration');

    // Insert Sample Users
    console.log('Seeding sample users...');
    for (const userData of sampleUsers) {
      const user = new User(userData);
      await user.save();
      console.log(`Created user: ${user.username} (${user.tier})`);
    }

    console.log('\n=== Database seeding completed successfully! ===');
    console.log(`Created ${sampleUsers.length} sample users`);
    console.log(`Defined ${apiTiers.length} API tiers`);
    console.log('\nSample credentials:');
    sampleUsers.forEach(u => {
      console.log(`  - ${u.email} / ${u.password} (${u.tier})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run seeding
if (require.main === module) {
  seedDatabase();
}

module.exports = { apiTiers, sampleUsers, seedDatabase };
