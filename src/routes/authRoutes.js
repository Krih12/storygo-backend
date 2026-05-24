const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const passport = require('passport');
const { query } = require('../config/database');
const environment = require('../config/environment');
const { authLimiter } = require('../middleware/security');
const authController = require('../controllers/authController');
const otpController = require('../controllers/otpController');

// Apply rate limiter to all auth endpoints
router.use(authLimiter);

// ---------- EMAIL / PASSWORD SIGNUP ----------
router.post('/signup', [
  body('username').trim().isLength({ min: 3, max: 50 }).matches(/^[a-zA-Z0-9_]+$/),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('full_name').trim().isLength({ min: 2, max: 100 })
], authController.signup);

// ---------- EMAIL / PASSWORD LOGIN (classic, no brute‑force) ----------
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], authController.login);

// ---------- OTHER ROUTES ----------
router.get('/me', require('../middleware/authenticate').authenticate, authController.getMe);
router.post('/logout', require('../middleware/authenticate').authenticate, authController.logout);
router.put('/update-profile', require('../middleware/authenticate').authenticate, authController.updateProfile);
router.put('/change-password', require('../middleware/authenticate').authenticate, authController.changePassword);
// ---------- GOOGLE OAUTH ----------
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user) => {
    if (err || !user) return res.redirect('/auth?mode=login');
    const token = jwt.sign({ userId: user.id, email: user.email }, environment.JWT_SECRET, { expiresIn: environment.JWT_EXPIRE });
    res.cookie('token', token, {
      httpOnly: true,
      secure: environment.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.redirect(environment.CLIENT_URL);
  })(req, res, next);
});

module.exports = router;
