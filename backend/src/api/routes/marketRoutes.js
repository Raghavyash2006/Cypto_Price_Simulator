import { Router } from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { validateBody } from '../../middleware/validate.js';
import {
	addWatchlistCoin,
	clearUserWatchlist,
	getCoinChart,
	getCoinDetails,
	getLatestSnapshot,
	getMarketSentiment,
	getOverview,
	getPrices,
	getRecentMarketEvents,
	getRecentMarketSnapshots,
	getTopMovers,
	getTrending,
	getWatchlist,
	removeWatchlistCoin,
	searchCoins
} from '../controllers/marketController.js';

const router = Router();
const marketWriteRateLimit = createRateLimiter({
	keyPrefix: 'market-write',
	windowMs: 5 * 60 * 1000,
	max: 25,
	message: 'Too many market actions, please slow down.'
});
const marketSearchRateLimit = createRateLimiter({
	keyPrefix: 'market-search',
	windowMs: 1 * 60 * 1000,
	max: 60,
	message: 'Market search rate limit reached. Please wait a moment.'
});

router.get('/prices', getPrices);
router.get('/trending', getTrending);
router.get('/overview', getOverview);
router.get('/search', marketSearchRateLimit, searchCoins);
router.get('/coin/:id', getCoinDetails);
router.get('/coin/:id/chart', getCoinChart);
router.get('/movers', getTopMovers);
router.get('/sentiment', protect, getMarketSentiment);
router.get('/events', protect, getRecentMarketEvents);
router.get('/snapshots', protect, getRecentMarketSnapshots);
router.get('/snapshot/latest', protect, getLatestSnapshot);
router.get('/watchlist', protect, getWatchlist);
router.post('/watchlist', protect, marketWriteRateLimit, validateBody(['coinId']), addWatchlistCoin);
router.delete('/watchlist/:coinId', protect, marketWriteRateLimit, removeWatchlistCoin);
router.delete('/watchlist', protect, marketWriteRateLimit, clearUserWatchlist);

export default router;
