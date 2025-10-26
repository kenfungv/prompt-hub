const Prompt = require('../models/prompt.model');
const Category = require('../models/category.model');
const Tag = require('../models/tag.model');

// Create a new prompt
exports.createPrompt = async (req, res) => {
  try {
    const { title, content, description, category, tags, metadata, author, status } = req.body;

    // Validate category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    // Validate tags exist
    if (tags && tags.length > 0) {
      const tagsExist = await Tag.find({ _id: { $in: tags } });
      if (tagsExist.length !== tags.length) {
        return res.status(400).json({ error: 'One or more invalid tag IDs' });
      }
    }

    const prompt = new Prompt({
      title,
      content,
      description,
      category,
      tags: tags || [],
      metadata: metadata || {},
      author,
      status: status || 'draft'
    });

    await prompt.save();

    // Update category prompt count
    await Category.findByIdAndUpdate(category, { $inc: { 'metadata.promptCount': 1 } });

    // Update tag prompt counts
    if (tags && tags.length > 0) {
      await Tag.updateMany(
        { _id: { $in: tags } },
        { $inc: { 'metadata.promptCount': 1 } }
      );
    }

    await prompt.populate(['category', 'tags']);
    res.status(201).json({ success: true, data: prompt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all prompts with filters
exports.getPrompts = async (req, res) => {
  try {
    const { 
      category, 
      tags, 
      status, 
      author, 
      search,
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (author) query.author = author;
    if (tags) {
      query.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    }
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;
    const sortOrder = order === 'desc' ? -1 : 1;

    const prompts = await Prompt.find(query)
      .populate('category')
      .populate('tags')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Prompt.countDocuments(query);

    res.json({
      success: true,
      data: prompts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single prompt by ID
exports.getPromptById = async (req, res) => {
  try {
    const prompt = await Prompt.findById(req.params.id)
      .populate('category')
      .populate('tags');

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    // Increment usage count
    prompt.usageCount += 1;
    await prompt.save();

    res.json({ success: true, data: prompt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update prompt
exports.updatePrompt = async (req, res) => {
  try {
    const { title, description, category, tags, metadata, status } = req.body;
    const prompt = await Prompt.findById(req.params.id);

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    if (title) prompt.title = title;
    if (description) prompt.description = description;
    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ error: 'Invalid category ID' });
      }
      prompt.category = category;
    }
    if (tags) {
      const tagsExist = await Tag.find({ _id: { $in: tags } });
      if (tagsExist.length !== tags.length) {
        return res.status(400).json({ error: 'One or more invalid tag IDs' });
      }
      prompt.tags = tags;
    }
    if (metadata) prompt.metadata = { ...prompt.metadata, ...metadata };
    if (status) prompt.status = status;

    await prompt.save();
    await prompt.populate(['category', 'tags']);

    res.json({ success: true, data: prompt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete prompt
exports.deletePrompt = async (req, res) => {
  try {
    const prompt = await Prompt.findById(req.params.id);

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    // Update category prompt count
    await Category.findByIdAndUpdate(prompt.category, { $inc: { 'metadata.promptCount': -1 } });

    // Update tag prompt counts
    if (prompt.tags && prompt.tags.length > 0) {
      await Tag.updateMany(
        { _id: { $in: prompt.tags } },
        { $inc: { 'metadata.promptCount': -1 } }
      );
    }

    await prompt.deleteOne();

    res.json({ success: true, message: 'Prompt deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new version
exports.createNewVersion = async (req, res) => {
  try {
    const { content, description, updatedBy } = req.body;
    const prompt = await Prompt.findById(req.params.id);

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    await prompt.createNewVersion(content, description, updatedBy);
    await prompt.populate(['category', 'tags']);

    res.json({ success: true, data: prompt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get version history
exports.getVersionHistory = async (req, res) => {
  try {
    const prompt = await Prompt.findById(req.params.id);

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    res.json({ 
      success: true, 
      data: {
        currentVersion: prompt.version,
        history: prompt.versionHistory
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Rollback to specific version
exports.rollbackToVersion = async (req, res) => {
  try {
    const { version } = req.params;
    const prompt = await Prompt.findById(req.params.id);

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    await prompt.rollbackToVersion(parseInt(version));
    await prompt.populate(['category', 'tags']);

    res.json({ success: true, data: prompt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = exports;
