const express = require('express');
const router = express.Router();
const seriesController = require('../controllers/seriesController');
const { authenticate, optionalAuth, authorizeCreator, authorizeOwner } = require('../middleware/authenticate');
const { uploadImage } = require('../middleware/upload');

// Public
router.get('/', optionalAuth, seriesController.getAllSeries);
router.get('/featured', seriesController.getFeaturedSeries);
router.get('/:id', optionalAuth, seriesController.getSeriesById);
router.get('/:id/episodes', optionalAuth, seriesController.getSeriesEpisodes);
router.post('/:id/rate', authenticate, seriesController.rateSeries);

// Creator
router.post('/', authenticate, authorizeCreator, uploadImage, seriesController.createSeries);
router.put('/:id', authenticate, authorizeCreator, authorizeOwner('series'), uploadImage, seriesController.updateSeries);
router.delete('/:id', authenticate, authorizeCreator, authorizeOwner('series'), seriesController.deleteSeries);

module.exports = router;
