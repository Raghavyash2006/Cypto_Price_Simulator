import { Router } from 'express';
import { buy, sell, getPortfolio, getAnalytics } from '../controllers/tradeController.js';
import { protect } from '../../middleware/authMiddleware.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { validateBody } from '../../middleware/validate.js';

const router = Router();
const tradeRateLimit = createRateLimiter({
	keyPrefix: 'trade-write',
	windowMs: 5 * 60 * 1000,
	max: 12,
	message: 'Trade rate limit reached. Please wait before placing more orders.'
});

router.post('/buy', protect, tradeRateLimit, validateBody(['coinId', 'quantity']), buy);
router.post('/sell', protect, tradeRateLimit, validateBody(['coinId', 'quantity']), sell);
router.get('/portfolio', protect, getPortfolio);
router.get('/analytics', protect, getAnalytics);

export default router;
