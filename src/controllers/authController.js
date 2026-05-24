const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const environment = require('../config/environment');
const { clean } = require('../utils/sanitize');

const authController = {
  // ---------- SIGNUP ----------
  signup: async (req, res, next) => {
    try {
      const { username, email, password, full_name } = req.body;

      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [email, username]
      );
      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          status: 'error',
          message: 'A user with this email or username already exists'
        });
      }

      const saltRounds = 12;
      const password_hash = await bcrypt.hash(password, saltRounds);

      const result = await query(
        `INSERT INTO users (username, email, password_hash, full_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, email, full_name, is_creator, is_admin, preferred_language, created_at`,
        [username, email, password_hash, full_name]
      );

      const user = result.rows[0];

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        environment.JWT_SECRET,
        { expiresIn: environment.JWT_EXPIRE }
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: environment.NODE_ENV === 'production',
        sameSite: environment.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.status(201).json({
        status: 'success',
        message: 'Account created successfully',
        data: { user, token }
      });
    } catch (error) {
      console.error('Signup error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Error creating account. Please try again.'
      });
    }
  },

  // ---------- LOGIN ----------
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const result = await query(
        'SELECT id, username, email, full_name, profile_picture, password_hash, is_creator, is_admin, is_active, preferred_language FROM users WHERE email = $1 AND is_active = true',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
      }

      const user = result.rows[0];
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
      }

      // Update last login
      query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]).catch(console.error);

      // Log admin login
      if (user.is_admin) {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || req.ip;
        query(
          `INSERT INTO admin_audit_logs (admin_id, action, ip_address)
           VALUES ($1, $2, $3)`,
          [user.id, 'Admin login', ip]
        ).catch(console.error);
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        environment.JWT_SECRET,
        { expiresIn: environment.JWT_EXPIRE }
      );

      const { password_hash, ...userWithoutPassword } = user;

      res.cookie('token', token, {
        httpOnly: true,
        secure: environment.NODE_ENV === 'production',
        sameSite: environment.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.json({
        status: 'success',
        message: 'Login successful',
        data: { user: userWithoutPassword, token }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ status: 'error', message: 'Error logging in. Please try again.' });
    }
  },

  // ---------- GET CURRENT USER ----------
  getMe: async (req, res, next) => {
    try {
      const result = await query(
        `SELECT id, username, email, full_name, profile_picture,
                is_creator, is_admin, creator_bio, preferred_language,
                created_at, last_login_at
         FROM users
         WHERE id = $1 AND is_active = true`,
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ status: 'error', message: 'User not found' });
      }

      return res.json({ status: 'success', data: { user: result.rows[0] } });
    } catch (error) {
      console.error('Get me error:', error);
      return res.status(500).json({ status: 'error', message: 'Error fetching user data' });
    }
  },

  // ---------- LOGOUT ----------
 logout: async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: environment.NODE_ENV === 'production',
    sameSite: environment.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/'
  });
  return res.json({ status: 'success', message: 'Logged out successfully' });
}

  // ---------- UPDATE PROFILE ----------
  updateProfile: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (req.body.full_name) {
        updateFields.push(`full_name = $${paramCount}`);
        values.push(clean(req.body.full_name));
        paramCount++;
      }
      if (req.body.preferred_language) {
        updateFields.push(`preferred_language = $${paramCount}`);
        values.push(req.body.preferred_language);
        paramCount++;
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ status: 'error', message: 'No fields to update' });
      }

      values.push(userId);
      const queryText = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING id, username, email, full_name, profile_picture, is_creator, is_admin, preferred_language, updated_at`;
      const result = await query(queryText, values);
      return res.json({ status: 'success', message: 'Profile updated successfully', data: { user: result.rows[0] } });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({ status: 'error', message: 'Error updating profile' });
    }
  },

  // ---------- CHANGE PASSWORD ----------
  changePassword: async (req, res, next) => {
    try {
      const { current_password, new_password } = req.body;
      const userId = req.user.id;

      const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ status: 'error', message: 'User not found' });
      }

      const isValidPassword = await bcrypt.compare(current_password, result.rows[0].password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ status: 'error', message: 'Current password is incorrect' });
      }

      const newPasswordHash = await bcrypt.hash(new_password, 12);
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, userId]);
      return res.json({ status: 'success', message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      return res.status(500).json({ status: 'error', message: 'Error changing password' });
    }
  }
};

module.exports = authController;
