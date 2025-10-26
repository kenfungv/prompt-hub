const mongoose = require('mongoose');
const Category = require('../models/category.model');
const Tag = require('../models/tag.model');
const Prompt = require('../models/prompt.model');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prompt-hub';

// Migration functions
const migrations = [
  {
    version: '001',
    name: 'Create indexes for all collections',
    up: async () => {
      console.log('Creating indexes for Category collection...');
      await Category.collection.createIndexes([
        { key: { name: 1 }, unique: true },
        { key: { slug: 1 }, unique: true },
        { key: { parent: 1 } },
        { key: { order: 1 } }
      ]);

      console.log('Creating indexes for Tag collection...');
      await Tag.collection.createIndexes([
        { key: { name: 1 }, unique: true },
        { key: { slug: 1 }, unique: true },
        { key: { 'metadata.promptCount': -1 } },
        { key: { 'metadata.usageCount': -1 } }
      ]);

      console.log('Creating indexes for Prompt collection...');
      await Prompt.collection.createIndexes([
        { key: { title: 'text', description: 'text' } },
        { key: { category: 1, status: 1 } },
        { key: { tags: 1 } },
        { key: { author: 1 } },
        { key: { createdAt: -1 } }
      ]);

      console.log('✅ All indexes created successfully');
    },
    down: async () => {
      console.log('Dropping indexes...');
      await Category.collection.dropIndexes();
      await Tag.collection.dropIndexes();
      await Prompt.collection.dropIndexes();
      console.log('✅ All indexes dropped');
    }
  },
  {
    version: '002',
    name: 'Ensure default categories exist',
    up: async () => {
      const defaultCategories = [
        { name: 'General', slug: 'general', icon: '📝', color: '#3B82F6', order: 0 },
        { name: 'Writing', slug: 'writing', icon: '✍️', color: '#8B5CF6', order: 1 },
        { name: 'Code', slug: 'code', icon: '💻', color: '#10B981', order: 2 },
        { name: 'Business', slug: 'business', icon: '💼', color: '#F59E0B', order: 3 },
        { name: 'Marketing', slug: 'marketing', icon: '📣', color: '#EF4444', order: 4 }
      ];

      for (const cat of defaultCategories) {
        const exists = await Category.findOne({ slug: cat.slug });
        if (!exists) {
          await Category.create(cat);
          console.log(`✅ Created category: ${cat.name}`);
        } else {
          console.log(`⏭️ Category already exists: ${cat.name}`);
        }
      }
    },
    down: async () => {
      await Category.deleteMany({ slug: { $in: ['general', 'writing', 'code', 'business', 'marketing'] } });
      console.log('✅ Default categories removed');
    }
  },
  {
    version: '003',
    name: 'Ensure default tags exist',
    up: async () => {
      const defaultTags = [
        { name: 'GPT-4', slug: 'gpt-4', color: '#10B981' },
        { name: 'ChatGPT', slug: 'chatgpt', color: '#3B82F6' },
        { name: 'Claude', slug: 'claude', color: '#8B5CF6' },
        { name: 'Copilot', slug: 'copilot', color: '#0078D4' },
        { name: 'Creative', slug: 'creative', color: '#EC4899' },
        { name: 'Technical', slug: 'technical', color: '#6366F1' },
        { name: 'Analysis', slug: 'analysis', color: '#14B8A6' },
        { name: 'Translation', slug: 'translation', color: '#F59E0B' }
      ];

      for (const tag of defaultTags) {
        const exists = await Tag.findOne({ slug: tag.slug });
        if (!exists) {
          await Tag.create(tag);
          console.log(`✅ Created tag: ${tag.name}`);
        } else {
          console.log(`⏭️ Tag already exists: ${tag.name}`);
        }
      }
    },
    down: async () => {
      await Tag.deleteMany({ slug: { $in: ['gpt-4', 'chatgpt', 'claude', 'copilot', 'creative', 'technical', 'analysis', 'translation'] } });
      console.log('✅ Default tags removed');
    }
  }
];

// Migration tracker schema
const migrationSchema = new mongoose.Schema({
  version: { type: String, required: true, unique: true },
  name: String,
  appliedAt: { type: Date, default: Date.now }
});

const Migration = mongoose.model('Migration', migrationSchema);

// Run migrations
async function runMigrations() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('📦 Running migrations...\n');

    for (const migration of migrations) {
      const applied = await Migration.findOne({ version: migration.version });

      if (applied) {
        console.log(`⏭️  Migration ${migration.version} already applied: ${migration.name}`);
        continue;
      }

      console.log(`🔄 Running migration ${migration.version}: ${migration.name}`);
      await migration.up();

      await Migration.create({
        version: migration.version,
        name: migration.name
      });

      console.log(`✅ Migration ${migration.version} completed\n`);
    }

    console.log('✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔒 Database connection closed');
  }
}

// Rollback last migration
async function rollbackMigration() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const lastMigration = await Migration.findOne().sort({ appliedAt: -1 });

    if (!lastMigration) {
      console.log('ℹ️  No migrations to rollback');
      return;
    }

    const migration = migrations.find(m => m.version === lastMigration.version);

    if (!migration) {
      console.error(`❌ Migration ${lastMigration.version} not found in migration list`);
      return;
    }

    console.log(`🔙 Rolling back migration ${migration.version}: ${migration.name}`);
    await migration.down();

    await Migration.deleteOne({ version: migration.version });

    console.log(`✅ Migration ${migration.version} rolled back successfully`);
  } catch (error) {
    console.error('❌ Rollback error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔒 Database connection closed');
  }
}

// CLI
const command = process.argv[2];

if (command === 'rollback') {
  rollbackMigration();
} else {
  runMigrations();
}

module.exports = { runMigrations, rollbackMigration };
