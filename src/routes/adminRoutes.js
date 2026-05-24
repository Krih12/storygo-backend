const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const { requireAdmin } = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');

router.use(authenticate);
router.use(requireAdmin);

router.get('/dashboard', adminController.getDashboardStats);
router.get('/database/users', adminController.getAllUsersData);
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId/status', adminController.toggleUserStatus);
router.get('/series', adminController.getAllSeries);
router.put('/series/:seriesId/status', adminController.updateSeriesStatus);
router.get('/episodes', adminController.getAllEpisodes);
router.get('/payments', adminController.getPayments);
router.get('/subscriptions', adminController.getSubscriptions);
router.get('/ratings', adminController.getAllRatings);
router.delete('/ratings/:id', adminController.deleteRating);
router.put('/plans/:id', adminController.updatePlan);
router.post('/plans', adminController.createPlan);
router.put('/users/:id/revenue', adminController.updateCreatorRevenueShare);
router.get('/storage', adminController.getStorageStats);
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/creators', adminController.getCreators);
router.get('/listeners/cities', adminController.getListenerCities);

module.exports = router;
