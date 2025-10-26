const Tag = require('../models/Tag');

// Get all tags
exports.getAllTags = async (req, res) => {
  try {
    const tags = await Tag.find().sort({ name: 1 });
    res.json(tags);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tags', error: error.message });
  }
};

// Get tag by ID
exports.getTagById = async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }
    res.json(tag);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tag', error: error.message });
  }
};

// Create new tag
exports.createTag = async (req, res) => {
  try {
    const { name, color } = req.body;
    
    // Check if tag already exists
    const existingTag = await Tag.findOne({ name });
    if (existingTag) {
      return res.status(400).json({ message: 'Tag already exists' });
    }

    const tag = new Tag({
      name,
      color: color || '#3B82F6' // Default blue color
    });

    const savedTag = await tag.save();
    res.status(201).json(savedTag);
  } catch (error) {
    res.status(500).json({ message: 'Error creating tag', error: error.message });
  }
};

// Update tag
exports.updateTag = async (req, res) => {
  try {
    const { name, color } = req.body;
    
    const tag = await Tag.findByIdAndUpdate(
      req.params.id,
      { name, color },
      { new: true, runValidators: true }
    );

    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    res.json(tag);
  } catch (error) {
    res.status(500).json({ message: 'Error updating tag', error: error.message });
  }
};

// Delete tag
exports.deleteTag = async (req, res) => {
  try {
    const tag = await Tag.findByIdAndDelete(req.params.id);
    
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting tag', error: error.message });
  }
};
