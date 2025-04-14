const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const config = require('../config');
require('dotenv').config();

router.post('/refresh', (req, res) => {
  const refreshToken = req.body.refreshToken;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token is required' });

  // Verify refresh token (stored in database or secure storage)
  // For simplicity, assume it's validated against a stored token
  jwt.verify(refreshToken, process.env.REFRESH_SECRET || 'X7k9p2mQ8jL5vN3xZ4rT1wY6uI0hJ2cF', (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid refresh token' });

    // Generate new access token
    const accessToken = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET || 'X7k9p2mQ8jL5vN3xZ4rT1wY6uI0hJ2cF', { expiresIn: '1h' });
    res.json({ accessToken, refreshToken }); // Return new tokens
  });
});
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, branch, yearOfStudy, expertise } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      branch,
      yearOfStudy,
      expertise,
    });

    await newUser.save();

    return res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Server error during registration:', err);
    return res.status(500).json({ message: 'Server error during registration' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate access token (short-lived)
    const accessSecret = process.env.JWT_SECRET || 'X7k9p2mQ8jL5vN3xZ4rT1wY6uI0hJ2cF'; // Use env variable or fallback
    console.log('Using access secret for token generation:', accessSecret);
    const accessToken = jwt.sign({ id: user._id }, accessSecret, { expiresIn: '1h' });
    console.log('Generated access token for user', user.email, ':', accessToken);

    // Generate refresh token (long-lived)
    const refreshSecret = process.env.REFRESH_SECRET || 'Y8l3p6nQ9jM2vT5xZ7rW1uI4hK8cF'; // Use different secret for refresh
    console.log('Using refresh secret for token generation:', refreshSecret);
    const refreshToken = jwt.sign({ id: user._id }, refreshSecret, { expiresIn: '7d' });
    console.log('Generated refresh token for user', user.email, ':', refreshToken);

    // Store refresh token in the database for security (optional but recommended)
    user.refreshToken = refreshToken; // Add refreshToken field to User schema if not present
    await user.save();

    // Send both tokens and user data
    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        branch: user.branch,
        yearOfStudy: user.yearOfStudy,
        expertise: user.expertise,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

module.exports = router;