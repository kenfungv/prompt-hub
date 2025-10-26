const Tag = require('../models/tag.model');

// Create a new tag
exports.createTag = async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;

    const tag = new Tag({
      name,
      description,
      color: color || '#10B981',
      icon: icon || '🏷️'
    });

    await tag.save();
    res.status(201).json({ success: true, data: tag });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Tag name already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Get all tags
exports.getTags = async (req, res) => {
  try {
    const { isActive, sortBy = 'name', order = 'asc', limit } = req.query;

    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const sortOrder = order === 'desc' ? -1 : 1;
    let tagsQuery = Tag.find(query).sort({ [sortBy]: sortOrder });

    if (limit) {
      tagsQuery = tagsQuery.limit(parseInt(limit));
    }

    const tags = await tagsQuery;
    res.json({ success: true, data: tags });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get popular tags
exports.getPopularTags = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const tags = await Tag.getPopular(parseInt(limit));
    res.json({ success: true, data: tags });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Search tags
exports.searchTags = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const tags = await Tag.searchTags(q.trim());
    res.json({ success: true, data: tags });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single tag by ID
exports.getTagById = async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json({ success: true, data: tag });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get tag by slug
exports.getTagBySlug = async (req, res) => {
  try {
    const tag = await Tag.findOne({ slug: req.params.slug });

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json({ success: true, data: tag });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update tag
exports.updateTag = async (req, res) => {
  try {
    const { name, description, color, icon, isActive } = req.body;
    const tag = await Tag.findById(req.params.id);

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    if (name !== undefined) tag.name = name;
    if (description !== undefined) tag.description = description;
    if (color !== undefined) tag.color = color;
    if (icon !== undefined) tag.icon = icon;
    if (isActive !== undefined) tag.isActive = isActive;

    await tag.save();
    res.json({ success: true, data: tag });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Tag name already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Delete tag
exports.deleteTag = async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Check if tag is used in prompts
    const Prompt = require('../models/prompt.model');
    const promptCount = await Prompt.countDocuments({ tags: tag._id });
    if (promptCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete tag that is used in prompts',
        promptCount
      });
    }

    await tag.deleteOne();
    res.json({ success: true, message: 'Tag deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Increment tag usage
exports.incrementUsage = async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    await tag.incrementUsage();
    res.json({ success: true, data: tag });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = exports;
