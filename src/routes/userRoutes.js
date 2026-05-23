const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const { body, param } = require('express-validator');
const { avatarUpload } = require('../middleware/upload');

// ============================================
// PUBLIC ROUTES (no authentication required)
// ============================================
router.get('/stats/global', userController.getGlobalStats);
router.get('/top-creators', userController.getTopCreators);

// ============================================
// PROTECTED ROUTES (authentication required)
// ============================================
router.use(authenticate);

// Profile
router.get('/profile', userController.getProfile);
router.put('/profile', [
  body('full_name').optional().trim().isLength({ min: 2, max: 100 }),
  body('preferred_language').optional().isLength({ min: 2, max: 10 }),
  body('creator_bio').optional().trim().isLength({ max: 1000 })
], userController.updateProfile);

// Avatar
router.post('/avatar', avatarUpload, userController.uploadAvatar);
router.delete('/avatar', userController.removeAvatar);

// Password change
router.post('/change-password', userController.changePassword);

// Creator upgrade
router.put('/become-creator', userController.becomeCreator);

// Listening history
router.get('/listening-history', userController.getListeningHistory);

// Bookmarks (episodes)
router.get('/bookmarks', userController.getBookmarks);

// Bookmarked series (via activity)
router.get('/bookmarked-series', userController.getBookmarkedSeries);

// Liked series
router.get('/liked-series', userController.getLikedSeries);

// Following list
router.get('/following', userController.getFollowing);

// Follow / Unfollow a creator
router.post('/follow/:id', [
  param('id').isUUID().withMessage('Invalid creator ID')
], userController.followCreator);
router.delete('/unfollow/:id', [
  param('id').isUUID().withMessage('Invalid creator ID')
], userController.unfollowCreator);

// User stats
router.get('/stats', userController.getUserStats);

// Followers list
router.get('/followers', userController.getFollowers);

// Creator analytics (for creator dashboard)
router.get('/creator-analytics', userController.getCreatorAnalytics);

// Creator stats (summary for dashboard)
router.get('/creator-stats', userController.getCreatorStats);

module.exports = router;
