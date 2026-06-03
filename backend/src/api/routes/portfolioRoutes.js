import { Router } from 'express';
import { buy, sell, getPortfolio } from '../controllers/portfolioController.js';
import { protect } from '../../middleware/authMiddleware.js';
import { validateBody } from '../../middleware/validate.js';

const router = Router();

router.post('/buy', protect, validateBody(['coinId', 'quantity']), buy);
router.post('/sell', protect, validateBody(['coinId', 'quantity']), sell);
router.get('/', protect, getPortfolio);

export default router;