const jwt = require('jsonwebtoken');
const environment = require('../config/environment');
const { query } = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    let token;
    if (req.cookies?.token) token = req.cookies.token;
    else if (req.headers.authorization?.startsWith('Bearer ')) token = req.headers.authorization.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const decoded = jwt.verify(token, environment.JWT_SECRET);
    const result = await query(
      `SELECT id, username, email, is_creator, is_admin, is_active FROM users WHERE id = $1 AND is_active = true`,
      [decoded.userId]
    );

    if (!result.rows.length) return res.status(401).json({ error: 'User not found or inactive' });

    req.user = result.rows[0]; // includes is_admin
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { authenticate };
