const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register a new user
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: 'Username, email, and password are required' 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }
    
    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      where: { email } 
    });
    
    if (existingUser) {
      return res.status(409).json({ 
        error: 'User with this email already exists' 
      });
    }
    
    // Check if username is taken
    const existingUsername = await User.findOne({ 
      where: { username } 
    });
    
    if (existingUsername) {
      return res.status(409).json({ 
        error: 'Username is already taken' 
      });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create new user
    const user = await User.create({
      username,
      email,
      password: hashedPassword
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        username: user.username 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ 
      error: 'Failed to register user',
      details: error.message 
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }
    
    // Find user by email
    const user = await User.findOne({ 
      where: { email } 
    });
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        username: user.username 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ 
      error: 'Failed to login',
      details: error.message 
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    // User info should be attached to req by auth middleware
    const userId = req.user.userId;
    
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'createdAt', 'updatedAt']
    });
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }
    
    res.status(200).json({
      message: 'Profile retrieved successfully',
      user
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      error: 'Failed to fetch profile',
      details: error.message 
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;
    
    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Current password and new password are required' 
      });
    }
    
    // Validate new password strength
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'New password must be at least 6 characters long' 
      });
    }
    
    // Find user
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Current password is incorrect' 
      });
    }
    
    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    user.password = hashedPassword;
    await user.save();
    
    res.status(200).json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ 
      error: 'Failed to change password',
      details: error.message 
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  changePassword
};
