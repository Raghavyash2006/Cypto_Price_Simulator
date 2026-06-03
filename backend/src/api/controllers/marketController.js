import * as marketService from '../services/marketService.js';
import asyncHandler from '../../utils/asyncHandler.js';
import {
  addToWatchlist,
  clearWatchlist,
  getWatchlist as loadWatchlist,
  removeFromWatchlist
} from '../services/watchlistService.js';
import {
  getLatestMarketSnapshot,
  getMarketIntelligence,
  listRecentMarketSnapshots
} from '../services/marketIntelligenceService.js';
import { listMarketEvents } from '../services/marketEventService.js';
import { sanitizeText, toPositiveInt } from '../../utils/inputSanitizer.js';

export const getPrices = asyncHandler(async (req, res) => {
  const ids = sanitizeText(req.query.ids || '', { maxLength: 500 })
    .split(',')
    .map((id) => sanitizeText(id, { maxLength: 80 }))
    .filter(Boolean);
  if (ids.length === 0) return res.status(400).json({ message: 'ids query is required' });
  const data = await marketService.getPrices(ids, sanitizeText(req.query.vs || 'usd', { maxLength: 10 }));
  res.json(data);
});

export const getTrending = asyncHandler(async (_req, res) => {
  const data = await marketService.getTrending();
  res.json(data);
});

export const getOverview = asyncHandler(async (req, res) => {
  const limit = toPositiveInt(req.query.limit, 50, { min: 1, max: 100 });
  const trendingLimit = toPositiveInt(req.query.trendingLimit, 7, { min: 1, max: 25 });
  const moversLimit = toPositiveInt(req.query.moversLimit, 5, { min: 1, max: 25 });
  const data = await marketService.getMarketOverview({ limit, trendingLimit, moversLimit });
  res.json(data);
});

export const searchCoins = asyncHandler(async (req, res) => {
  const q = sanitizeText(req.query.q || '', { maxLength: 120 });
  if (!q) return res.status(400).json({ message: 'q query is required' });
  const data = await marketService.searchCoins(q);
  res.json(data);
});

export const getCoinDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = await marketService.getCoinDetails(id);
  res.json(data);
});

export const getCoinChart = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const days = toPositiveInt(req.query.days, 7, { min: 1, max: 365 });
  const vs = sanitizeText(req.query.vs || 'usd', { maxLength: 10 });
  const data = await marketService.getCoinMarketChart(id, vs, days);
  res.json(data);
});

export const getTopMovers = asyncHandler(async (req, res) => {
  const limit = toPositiveInt(req.query.limit, 10, { min: 1, max: 50 });
  const data = await marketService.getTopMovers(limit);
  res.json(data);
});

export const getWatchlist = asyncHandler(async (req, res) => {
  const data = await loadWatchlist(req.user._id);
  res.json(data);
});

export const addWatchlistCoin = asyncHandler(async (req, res) => {
  const data = await addToWatchlist(req.user._id, req.body);
  res.status(201).json(data);
});

export const removeWatchlistCoin = asyncHandler(async (req, res) => {
  const data = await removeFromWatchlist(req.user._id, req.params.coinId);
  res.json(data);
});

export const clearUserWatchlist = asyncHandler(async (req, res) => {
  const data = await clearWatchlist(req.user._id);
  res.json(data);
});

export const getMarketSentiment = asyncHandler(async (req, res) => {
  const data = await getMarketIntelligence(req.user._id);
  res.json(data);
});

export const getRecentMarketEvents = asyncHandler(async (req, res) => {
  const events = await listMarketEvents({ userId: req.user?._id || null, limit: toPositiveInt(req.query.limit, 20, { min: 1, max: 50 }) });
  res.json({ events });
});

export const getRecentMarketSnapshots = asyncHandler(async (req, res) => {
  const snapshots = await listRecentMarketSnapshots(toPositiveInt(req.query.limit, 12, { min: 1, max: 24 }));
  res.json({ snapshots });
});

export const getLatestSnapshot = asyncHandler(async (_req, res) => {
  const snapshot = await getLatestMarketSnapshot();
  res.json({ snapshot });
});
