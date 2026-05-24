const { query } = require('../config/database');

module.exports = async function (req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const result = await query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (!result.rows[0] || !result.rows[0].is_admin) {
      return res.status(403).json({ error: 'Admin access denied' });
    }
    next();
  } catch (err) {
    console.error('Admin check error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
