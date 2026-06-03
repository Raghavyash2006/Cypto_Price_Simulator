const stores = new Map();

function getClientKey(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || 'anonymous';
}

export function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 120,
  message = 'Too many requests, please try again later.',
  keyPrefix = 'global'
} = {}) {
  return function rateLimit(req, res, next) {
    const key = `${keyPrefix}:${getClientKey(req)}`;
    const now = Date.now();
    const entry = stores.get(key);

    if (!entry || entry.resetAt <= now) {
      stores.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;

    if (entry.count > max) {
      res.status(429).json({
        success: false,
        message,
        meta: {
          retryAfterMs: entry.resetAt - now
        }
      });
      return;
    }

    next();
  };
}
