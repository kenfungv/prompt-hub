const Prompt = require('../models/prompt.model');

// Fork a prompt
exports.forkPrompt = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, content, tags, price, forkReason, modifications } = req.body;
    const author = req.user?.id || req.body.author; // fallback if auth middleware not present

    const prompt = await Prompt.findById(id);
    if (!prompt) return res.status(404).json({ message: 'Prompt not found' });

    const fork = await prompt.createFork({
      author,
      forkReason,
      modifications: { title, description, content, tags, price, ...modifications }
    });

    return res.status(201).json(fork);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get forks (direct children)
exports.getPromptForks = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' } = req.query;

    const prompt = await Prompt.findById(id);
    if (!prompt) return res.status(404).json({ message: 'Prompt not found' });

    const forks = await prompt.getAllForks({
      limit: Math.min(Number(limit), 100),
      skip: (Number(page) - 1) * Number(limit),
      sort: { [sortBy]: order === 'asc' ? 1 : -1 }
    });

    return res.status(200).json({
      total: prompt.forks?.length || 0,
      page: Number(page),
      limit: Number(limit),
      items: forks
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get fork tree (full hierarchy)
exports.getForkTree = async (req, res) => {
  try {
    const { id } = req.params;
    const prompt = await Prompt.findById(id);
    if (!prompt) return res.status(404).json({ message: 'Prompt not found' });

    const tree = await prompt.getForkTree();
    return res.status(200).json(tree);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get fork chain (ancestry path)
exports.getForkChain = async (req, res) => {
  try {
    const { id } = req.params;
    const prompt = await Prompt.findById(id);
    if (!prompt) return res.status(404).json({ message: 'Prompt not found' });

    const chain = await prompt.getForkChainDetails();
    return res.status(200).json(chain);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get original prompt
exports.getOriginalPrompt = async (req, res) => {
  try {
    const { id } = req.params;
    const prompt = await Prompt.findById(id);
    if (!prompt) return res.status(404).json({ message: 'Prompt not found' });

    const original = await prompt.getOriginalPrompt();
    return res.status(200).json(original);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Fork stats
exports.getForkStats = async (req, res) => {
  try {
    const { id } = req.params;
    const prompt = await Prompt.findById(id);
    if (!prompt) return res.status(404).json({ message: 'Prompt not found' });

    // depth = longest chain length from this node
    const tree = await prompt.getForkTree();
    const calcDepth = (node) => {
      if (!node || !node.children || node.children.length === 0) return 0;
      return 1 + Math.max(...node.children.map(calcDepth));
    };
    const depth = calcDepth(tree);

    return res.status(200).json({
      totalForks: prompt.forkCount || 0,
      depth
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Compare with parent
exports.compareForkWithParent = async (req, res) => {
  try {
    const { id } = req.params;
    const prompt = await Prompt.findById(id);
    if (!prompt) return res.status(404).json({ message: 'Prompt not found' });
    if (!prompt.forkParent) return res.status(400).json({ message: 'No parent for this prompt' });

    const parent = await Prompt.findById(prompt.forkParent);
    const changeLog = prompt.generateDiff(parent.content, prompt.content);
    return res.status(200).json({ parentId: parent._id, changeLog });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Compare with original
exports.compareForkWithOriginal = async (req, res) => {
  try {
    const { id } = req.params;
    const prompt = await Prompt.findById(id);
    if (!prompt) return res.status(404).json({ message: 'Prompt not found' });

    const originalId = prompt.originalPrompt || prompt._id;
    const original = await Prompt.findById(originalId);
    const changeLog = prompt.generateDiff(original.content, prompt.content);
    return res.status(200).json({ originalId: original._id, changeLog });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Version control handlers
exports.createVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, description, changeLog } = req.body;
    const updatedBy = req.user?.email || 'system';

    const prompt = await Prompt.findById(id);
    if (!prompt) return res.status(404).json({ message: 'Prompt not found' });

    await prompt.createNewVersion(content, description, updatedBy, changeLog);
    return res.status(201).json(prompt);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getVersions = async (req, res) => {
  try {
    const { id } = req.params;
    const prompt = await Prompt.findById(id).select('version versionHistory');
    if (!prompt) return res.status(404).json({ message: 'Prompt not found' });

    return res.status(200).json({ current: prompt.version, history: prompt.versionHistory });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getVersion = async (req, res) => {
  try {
    const { id, versionNumber } = req.params;
    const prompt = await Prompt.findById(id).select('version versionHistory content description');
    if (!prompt) return res.status(404).json({ message: 'Prompt not found' });

    if (Number(versionNumber) === prompt.version) {
      return res.status(200).json({ version: prompt.version, content: prompt.content, description: prompt.description });
    }

    const v = prompt.versionHistory.find(v => v.version === Number(versionNumber));
    if (!v) return res.status(404).json({ message: 'Version not found' });
    return res.status(200).json(v);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getVersionDiff = async (req, res) => {
  try {
    const { id, versionNumber } = req.params;
    const prompt = await Prompt.findById(id).select('version versionHistory');
    if (!prompt) return res.status(404).json({ message: 'Prompt not found' });

    const diff = prompt.getVersionDiff(Number(versionNumber));
    return res.status(200).json(diff);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.rollbackVersion = async (req, res) => {
  try {
    const { id, versionNumber } = req.params;
    const prompt = await Prompt.findById(id);
    if (!prompt) return res.status(404).json({ message: 'Prompt not found' });

    await prompt.rollbackToVersion(Number(versionNumber));
    return res.status(200).json(prompt);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.compareVersions = async (req, res) => {
  try {
    const { id, versionNumber, compareVersionNumber } = req.params;
    const prompt = await Prompt.findById(id).select('version versionHistory content');
    if (!prompt) return res.status(404).json({ message: 'Prompt not found' });

    const getVersionContent = (vn) => {
      vn = Number(vn);
      if (vn === prompt.version) return prompt.content;
      const pv = prompt.versionHistory.find(v => v.version === vn);
      return pv ? pv.content : null;
    };

    const base = getVersionContent(versionNumber);
    const target = getVersionContent(compareVersionNumber);
    if (base === null || target === null) return res.status(404).json({ message: 'Version not found' });

    const changeLog = prompt.generateDiff(base, target);
    return res.status(200).json({ changeLog });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
