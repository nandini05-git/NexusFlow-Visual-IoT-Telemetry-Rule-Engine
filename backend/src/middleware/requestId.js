import crypto from 'crypto';

/**
 * Lightweight Request ID & Logging Middleware
 * Attaches unique UUID to each request, sets X-Request-Id header,
 * and logs standard structured lines: [req-id] METHOD PATH STATUS DURATIONms
 */
export const requestIdMiddleware = (req, res, next) => {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    // Suppress high-volume batch load testing logs if status is 2xx to prevent flooding console
    if (req.originalUrl === '/api/ingest/batch' && res.statusCode < 400) {
      return;
    }
    console.log(`[${reqId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });

  next();
};
