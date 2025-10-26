const Category = require('../models/category.model');

// Create a new category
exports.createCategory = async (req, res) => {
  try {
    const { name, description, parent, icon, color, order } = req.body;

    // Check if parent category exists
    if (parent) {
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return res.status(400).json({ error: 'Parent category not found' });
      }
    }

    const category = new Category({
      name,
      description,
      parent: parent || null,
      icon: icon || '📁',
      color: color || '#3B82F6',
      order: order || 0
    });

    await category.save();
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Get all categories (flat list)
exports.getCategories = async (req, res) => {
  try {
    const { parent, isActive, sortBy = 'order', order = 'asc' } = req.query;

    const query = {};
    if (parent !== undefined) {
      query.parent = parent === 'null' ? null : parent;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const sortOrder = order === 'desc' ? -1 : 1;

    const categories = await Category.find(query)
      .populate('parent', 'name slug')
      .sort({ [sortBy]: sortOrder });

    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get category tree structure
exports.getCategoryTree = async (req, res) => {
  try {
    const tree = await Category.getTree();
    res.json({ success: true, data: tree });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('parent', 'name slug');

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Get children
    const children = await category.getChildren();

    // Get path
    const path = await category.getPath();

    res.json({ 
      success: true, 
      data: {
        ...category.toObject(),
        children,
        path
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get category by slug
exports.getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug })
      .populate('parent', 'name slug');

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Get children
    const children = await category.getChildren();

    // Get path
    const path = await category.getPath();

    res.json({ 
      success: true, 
      data: {
        ...category.toObject(),
        children,
        path
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { name, description, parent, icon, color, order, isActive } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Prevent setting itself as parent
    if (parent && parent === req.params.id) {
      return res.status(400).json({ error: 'Category cannot be its own parent' });
    }

    // Check if parent exists
    if (parent) {
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return res.status(400).json({ error: 'Parent category not found' });
      }
    }

    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (parent !== undefined) category.parent = parent || null;
    if (icon !== undefined) category.icon = icon;
    if (color !== undefined) category.color = color;
    if (order !== undefined) category.order = order;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();
    await category.populate('parent', 'name slug');

    res.json({ success: true, data: category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if category has children
    const children = await Category.find({ parent: category._id });
    if (children.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with child categories',
        childCount: children.length
      });
    }

    // Check if category has prompts
    const Prompt = require('../models/prompt.model');
    const promptCount = await Prompt.countDocuments({ category: category._id });
    if (promptCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with prompts',
        promptCount
      });
    }

    await category.deleteOne();
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = exports;
