const jwt = require('jsonwebtoken');
const environment = require('../config/environment');
const { query } = require('../config/database');

// Protect admin routes – verify JWT + check is_admin
const requireAdmin = (req, res, next) => {
  console.log('req.user:', req.user);
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access denied' });
  }
  next();
};

// Check for a specific role (e.g., 'super_admin') – you can extend this later
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

module.exports = { requireAdmin, requireRole };
