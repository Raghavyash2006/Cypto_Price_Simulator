import NodeCache from 'node-cache';

const cache = new NodeCache();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 12;

export function aiRateLimit(req, res, next) {
  const identifier = req.user?._id ? String(req.user._id) : req.ip;
  const key = `ai-rate:${identifier}`;
  const now = Date.now();
  const entry = cache.get(key) || { count: 0, windowStart: now };

  if (now - entry.windowStart >= WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }

  entry.count += 1;
  cache.set(key, entry, Math.ceil(WINDOW_MS / 1000));

  if (entry.count > MAX_REQUESTS) {
    res.status(429).json({
      success: false,
      message: 'AI mentor rate limit reached. Please wait a moment before trying again.',
      meta: {
        retryAfterMs: Math.max(0, entry.windowStart + WINDOW_MS - now)
      }
    });
    return;
  }

  next();
}