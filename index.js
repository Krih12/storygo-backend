const express = require('express');
const { applySecurityMiddleware } = require('./src/middleware/security');
const environment = require('./src/config/environment');

const app = express();

applySecurityMiddleware(app, environment); // CORS, helmet, etc.

// Then other middleware and routes
app.use(express.json());
app.use(cookieParser());
// ... rest of your app
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());
app.use(passport.initialize());
app.set('trust proxy', 1);

// API Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/novels', require('./src/routes/novelRoutes'));
app.use('/api/admin/schedule', require('./src/routes/scheduleRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/series', require('./src/routes/seriesRoutes'));
app.use('/api/episodes', require('./src/routes/episodeRoutes'));
app.use('/api/categories', require('./src/routes/categoryRoutes'));
app.use('/api/activity', require('./src/routes/activityRoutes'));
app.use('/api/search', require('./src/routes/searchRoutes'));
app.use('/api/trending', require('./src/routes/trendingRoutes'));
app.use('/api/payments', require('./src/routes/paymentRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));

// Health check
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Global error handler
app.use(errorHandler);

const PORT = environment.PORT || 5000;

// Initialize database and start server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Secure Story-Go server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
  });
