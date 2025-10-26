const Prompt = require('../models/prompt.model');

// Create a new prompt
exports.createPrompt = async (req, res) => {
  try {
    const { title, description, content, category, tags, userId } = req.body;
    
    const newPrompt = new Prompt({
      title,
      description,
      content,
      category,
      tags,
      userId
    });
    
    const savedPrompt = await newPrompt.save();
    res.status(201).json(savedPrompt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all prompts
exports.getAllPrompts = async (req, res) => {
  try {
    const prompts = await Prompt.find().populate('userId', 'username email');
    res.status(200).json(prompts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single prompt by ID
exports.getPromptById = async (req, res) => {
  try {
    const prompt = await Prompt.findById(req.params.id).populate('userId', 'username email');
    
    if (!prompt) {
      return res.status(404).json({ message: 'Prompt not found' });
    }
    
    res.status(200).json(prompt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a prompt by ID
exports.updatePrompt = async (req, res) => {
  try {
    const { title, description, content, category, tags } = req.body;
    
    const updatedPrompt = await Prompt.findByIdAndUpdate(
      req.params.id,
      { title, description, content, category, tags, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    if (!updatedPrompt) {
      return res.status(404).json({ message: 'Prompt not found' });
    }
    
    res.status(200).json(updatedPrompt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a prompt by ID
exports.deletePrompt = async (req, res) => {
  try {
    const deletedPrompt = await Prompt.findByIdAndDelete(req.params.id);
    
    if (!deletedPrompt) {
      return res.status(404).json({ message: 'Prompt not found' });
    }
    
    res.status(200).json({ message: 'Prompt deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
