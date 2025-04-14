const jwt = require('jsonwebtoken');
const User = require('../models/user');
const config = require('../config');
require('dotenv').config();

const authenticate = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });
  
    console.log('Received token:', token);
    console.log('Using secret for token verification:', process.env.JWT_SECRET || 'X7k9p2mQ8jL5vN3xZ4rT1wY6uI0hJ2cF');
  
    jwt.verify(token, process.env.JWT_SECRET || 'X7k9p2mQ8jL5vN3xZ4rT1wY6uI0hJ2cF', (err, decoded) => {
      if (err) {
        console.log('Token validation error:', err.message);
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ message: 'Token expired', refreshRequired: true });
        }
        return res.status(401).json({ message: 'Token is invalid', error: err.message });
      }
      req.user = { id: decoded.id };
      next();
    });
  };

module.exports = authenticate;