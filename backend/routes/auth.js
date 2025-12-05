const express = require('express');
const router = express.Router();
const UserModel = require('../database/models/users');
const { ensureInitialized } = require('../database/db');

// Note: In production, use proper password hashing (bcrypt) and JWT tokens

// POST /api/v1/auth/token - Login endpoint
router.post('/token', async (req, res) => {
  try {
    // Ensure database is initialized (important for Vercel serverless)
    await ensureInitialized();
    
    // Handle both JSON and form-urlencoded
    const username = req.body.username || req.body.email;
    const password = req.body.password;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Username/email and password are required'
      });
    }
    
    // Find user by email - handle potential DB errors
    let user;
    try {
      user = await UserModel.findByEmail(username);
    } catch (dbError) {
      console.error('Database error in login:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Unable to access user database'
      });
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'User not found'
      });
    }
    
    // Verify password (in production, use bcrypt.compare)
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Incorrect password'
      });
    }
    
    // Generate mock JWT token (in production, use jsonwebtoken)
    const token = Buffer.from(JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    })).toString('base64');
    
    res.json({
      success: true,
      access_token: token,
      token_type: 'bearer',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    // Ensure we always return JSON
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred during login'
      });
    }
  }
});

// POST /api/v1/auth/register - Register endpoint (optional)
router.post('/register', async (req, res) => {
  try {
    // Ensure database is initialized (important for Vercel serverless)
    await ensureInitialized();
    
    const { email, password, name } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Email and password are required'
      });
    }
    
    // Check if user already exists - handle potential DB errors
    let existingUser;
    try {
      existingUser = await UserModel.findByEmail(email);
    } catch (dbError) {
      console.error('Database error in registration:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Unable to access user database'
      });
    }
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }
    
    // Create new user
    const newUser = {
      id: `user-${Date.now()}`,
      email,
      password, // In production, hash this with bcrypt
      name: name || email.split('@')[0],
      role: 'operator'
    };
    
    // Handle potential DB errors during user creation
    try {
      await UserModel.create(newUser);
    } catch (dbError) {
      console.error('Database error creating user:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Unable to create user account'
      });
    }
    
    // Generate token
    const token = Buffer.from(JSON.stringify({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      exp: Date.now() + 24 * 60 * 60 * 1000
    })).toString('base64');
    
    res.status(201).json({
      success: true,
      access_token: token,
      token_type: 'bearer',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    // Ensure we always return JSON
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred during registration'
      });
    }
  }
});

// GET /api/v1/auth/me - Get current user (requires token)
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    
    // Check if token is expired
    if (decoded.exp < Date.now()) {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    
    const user = await UserModel.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

// POST /api/v1/auth/logout - Logout endpoint
router.post('/logout', (req, res) => {
  // In a real app, you might invalidate the token in a blacklist
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;

