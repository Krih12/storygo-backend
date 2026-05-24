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

const authorizeOwner = (resourceType) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      let queryText;
      switch (resourceType) {
        case 'series':
          queryText = 'SELECT creator_id FROM series WHERE id = $1';
          break;
        case 'episode':
          queryText = `SELECT s.creator_id FROM episodes e JOIN series s ON e.series_id = s.id WHERE e.id = $1`;
          break;
        default:
          return res.status(400).json({ error: 'Invalid resource type' });
      }
      const result = await query(queryText, [resourceId]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Resource not found' });
      if (result.rows[0].creator_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { authenticate, optionalAuth, authorizeCreator, authorizeOwner };
