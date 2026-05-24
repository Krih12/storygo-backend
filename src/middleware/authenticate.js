const jwt = require('jsonwebtoken');
const environment = require('../config/environment');
const { query } = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, environment.JWT_SECRET);
    const result = await query(
      `SELECT id, username, email, is_creator, is_admin, is_active FROM users WHERE id = $1 AND is_active = true`,
      [decoded.userId]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = result.rows[0]; // includes is_admin
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const decoded = jwt.verify(token, environment.JWT_SECRET);
      const result = await query(
        `SELECT id, username, email, is_creator, is_admin, is_active FROM users WHERE id = $1 AND is_active = true`,
        [decoded.userId]
      );
      if (result.rows.length) req.user = result.rows[0];
    }
  } catch (err) {}
  next();
};

const authorizeCreator = (req, res, next) => {
  if (!req.user || !req.user.is_creator) {
    return res.status(403).json({ error: 'Creator access required' });
  }
  next();
};

module.exports = { authenticate, optionalAuth, authorizeCreator };
