const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const { isBadBot } = require('../utils/botBlocker');
const { isIPBlocked, blockIP } = require('../utils/ipBlocker');
const wafRules = require('../utils/wafRules');

// Global Rate Limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests, please try again later.',
});

// Auth limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts.',
});

// WAF interceptor
function wafInterceptor(req, res, next) {
  const toCheck = JSON.stringify(req.query) + JSON.stringify(req.body) + req.originalUrl;
  for (const [name, rule] of Object.entries(wafRules)) {
    if (rule.regex.test(toCheck)) {
      blockIP(req.ip, 3600);
      console.warn(`[WAF] ${name} from ${req.ip}`);
      return res.status(403).json({ error: 'Blocked by security policy' });
    }
  }
  next();
}

function requestSizeLimiter(maxSize = '1mb') {
  const size = require('bytes')(maxSize);
  return (req, res, next) => {
    const len = parseInt(req.headers['content-length'], 10);
    if (len > size) return res.status(413).json({ error: 'Request too large' });
    next();
  };
}

function botBlocker(req, res, next) {
  if (isBadBot(req.headers['user-agent'])) {
    blockIP(req.ip, 7200);
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}

function applySecurityMiddleware(app, environment) {
  // Helmet with CSP
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "https://js.stripe.com", "https://cdn.jsdelivr.net"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://*.cloudinary.com"],
          connectSrc: ["'self'", environment.CLIENT_URL, "https://api.cloudinary.com"],
          frameSrc: ["https://js.stripe.com"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
    })
  );

  // ✅ CORS – now inside the function, `app` is defined
  app.use(cors({
    origin: environment.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));

  app.use(hpp());
  app.use(xss());
  app.use(requestSizeLimiter('10mb'));
  app.use(botBlocker);
  app.use('/api/', wafInterceptor);
  app.use('/api/', globalLimiter);

  app.use((req, res, next) => {
    if (isIPBlocked(req.ip)) return res.status(403).json({ error: 'IP blocked' });
    next();
  });
}

module.exports = { globalLimiter, authLimiter, applySecurityMiddleware };
