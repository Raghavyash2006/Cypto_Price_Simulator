import MarketEvent from '../../models/MarketEvent.js';
import { sanitizeText } from '../../utils/inputSanitizer.js';

const EVENT_LIMIT = 50;

function normalizeEvent(event = {}) {
  return {
    user: event.user || null,
    type: sanitizeText(event.type || 'market', { maxLength: 40 }),
    title: sanitizeText(event.title || 'Market event', { maxLength: 120 }),
    message: sanitizeText(event.message || '', { maxLength: 240, allowNewlines: true }),
    severity: ['low', 'normal', 'high', 'urgent'].includes(String(event.severity)) ? String(event.severity) : 'normal',
    source: sanitizeText(event.source || 'market', { maxLength: 40 }),
    metadata: event.metadata || {}
  };
}

export async function recordMarketEvent(event = {}) {
  const payload = normalizeEvent(event);
  const doc = await MarketEvent.create(payload);
  return doc.toObject();
}

export async function listMarketEvents({ userId = null, types = [], limit = EVENT_LIMIT } = {}) {
  const query = {};

  if (userId) {
    query.$or = [{ user: userId }, { user: null }];
  }

  if (Array.isArray(types) && types.length) {
    query.type = { $in: types };
  }

  const events = await MarketEvent.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.max(1, Math.min(EVENT_LIMIT, Number(limit) || EVENT_LIMIT)))
    .lean()
    .exec();

  return events.map((event) => ({
    id: event._id,
    type: event.type,
    title: event.title,
    message: event.message,
    severity: event.severity,
    source: event.source,
    metadata: event.metadata,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt
  }));
}