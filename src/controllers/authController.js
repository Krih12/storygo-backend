const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const environment = require('../config/environment');
const { clean } = require('../utils/sanitize');

const authController = {
  // SIGNUP
  signup: async (req, res) => {
    try {
      const { username, email, password, full_name } = req.body;

      const existing = await query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [email, username]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ status: 'error', message: 'User already exists' });
      }

      const hashed = await bcrypt.hash(password, 12);
      const result = await query(
        `INSERT INTO users (username, email, password_hash, full_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, email, full_name, is_creator, is_admin`,
        [username, email, hashed, full_name]
      );

      const user = result.rows[0];
      const token = jwt.sign({ userId: user.id, email }, environment.JWT_SECRET, { expiresIn: '7d' });

     const isProduction = process.env.NODE_ENV === 'production';
res.cookie('token', token, {
  httpOnly: true,
  secure: isProduction,          // true on HTTPS (Render), false on localhost
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/'
});

      res.status(201).json({ status: 'success', data: { user, token } });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ status: 'error', message: 'Signup failed' });
    }
  },

  // LOGIN
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      const result = await query(
        `SELECT id, username, email, full_name, profile_picture,
                password_hash, is_creator, is_admin, is_active
         FROM users WHERE email = $1 AND is_active = true`,
        [email]
      );
      if (result.rows.length === 0) {
        return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
      }

      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
      }

      // Update last login (async, don't wait)
      query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]).catch(() => {});

      const token = jwt.sign({ userId: user.id, email }, environment.JWT_SECRET, { expiresIn: '7d' });
      const { password_hash, ...safeUser } = user;

      const isProd = environment.NODE_ENV === 'production';
      res.cookie('token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
      });

      res.json({ status: 'success', data: { user: safeUser, token } });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ status: 'error', message: 'Login failed' });
    }
  },

  // GET CURRENT USER
  getMe: async (req, res) => {
    try {
      const result = await query(
        `SELECT id, username, email, full_name, profile_picture,
                is_creator, is_admin, preferred_language, creator_bio
         FROM users WHERE id = $1 AND is_active = true`,
        [req.user.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ status: 'error', message: 'User not found' });
      }
      res.json({ status: 'success', data: { user: result.rows[0] } });
    } catch (error) {
      console.error('Get me error:', error);
      res.status(500).json({ status: 'error', message: 'Failed to fetch user' });
    }
  },

  // LOGOUT
  logout: async (req, res) => {
    const isProd = environment.NODE_ENV === 'production';
    res.clearCookie('token', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/'
    });
    res.json({ status: 'success', message: 'Logged out' });
  },

  // UPDATE PROFILE
  updateProfile: async (req, res) => {
    try {
      const { full_name, preferred_language, creator_bio } = req.body;
      const userId = req.user.id;
      const updates = [];
      const values = [];
      let idx = 1;

      if (full_name) { updates.push(`full_name = $${idx}`); values.push(clean(full_name)); idx++; }
      if (preferred_language) { updates.push(`preferred_language = $${idx}`); values.push(preferred_language); idx++; }
      if (creator_bio && req.user.is_creator) { updates.push(`creator_bio = $${idx}`); values.push(clean(creator_bio)); idx++; }

      if (updates.length === 0) {
        return res.status(400).json({ status: 'error', message: 'No fields to update' });
      }

      values.push(userId);
      const queryText = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, username, email, full_name, profile_picture, is_creator, is_admin, preferred_language, creator_bio`;
      const result = await query(queryText, values);
      res.json({ status: 'success', data: { user: result.rows[0] } });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ status: 'error', message: 'Update failed' });
    }
  },

  // CHANGE PASSWORD
  changePassword: async (req, res) => {
    try {
      const { current_password, new_password } = req.body;
      const userId = req.user.id;

      const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length === 0) {
        return res.status(404).json({ status: 'error', message: 'User not found' });
      }

      const match = await bcrypt.compare(current_password, userRes.rows[0].password_hash);
      if (!match) {
        return res.status(401).json({ status: 'error', message: 'Current password is incorrect' });
      }

      const newHash = await bcrypt.hash(new_password, 12);
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);
      res.json({ status: 'success', message: 'Password changed' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ status: 'error', message: 'Failed to change password' });
    }
  }
};

module.exports = authController;
