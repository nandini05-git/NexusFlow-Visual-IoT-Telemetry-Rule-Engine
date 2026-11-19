import rateLimit from 'express-rate-limit';

// Strict rate limiter for authentication endpoints (login, register)
// Default: 30 attempts per 15 minutes to prevent brute-force attacks
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT, 10) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
    details: 'Auth endpoint rate limit exceeded.',
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

// General API rate limiter
// Default: 1,000 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT, 10) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP. Please slow down.',
    details: 'General API rate limit exceeded.',
    success: false,
    message: 'Too many requests from this IP. Please slow down.',
  },
});

// Ingestion rate limiter
// By default, IoT hardware gateways and load testers push thousands of writes per minute.
// Configurable via INGEST_RATE_LIMIT. If unset or 0, rate limiting is disabled for ingest.
const ingestLimit = parseInt(process.env.INGEST_RATE_LIMIT, 10);
export const ingestLimiter =
  Number.isFinite(ingestLimit) && ingestLimit > 0
    ? rateLimit({
        windowMs: 15 * 60 * 1000,
        max: ingestLimit,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          error: 'Ingestion rate limit exceeded.',
          details: `Configured limit: ${ingestLimit} requests / 15m.`,
          success: false,
          message: 'Ingestion rate limit exceeded.',
        },
      })
    : (req, res, next) => next();
