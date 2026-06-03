import NodeCache from 'node-cache';

const cache = new NodeCache();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_MESSAGES = 20;

export function mentorRateLimit(req, res, next) {
  const identifier = req.user?._id ? String(req.user._id) : req.ip;
  const key = `mentor-rate:${identifier}`;
  const now = Date.now();
  const current = cache.get(key) || { count: 0, windowStart: now };

  if (now - current.windowStart >= WINDOW_MS) {
    current.count = 0;
    current.windowStart = now;
  }

  current.count += 1;
  cache.set(key, current, Math.ceil(WINDOW_MS / 1000));

  if (current.count > MAX_MESSAGES) {
    res.status(429).json({
      message: 'You are sending messages too quickly. Please wait a few minutes before asking the mentor again.'
    });
    return;
  }

  next();
}
