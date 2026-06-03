import { Router } from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { getTransactions } from '../controllers/portfolioController.js';

const router = Router();

router.get('/', protect, getTransactions);

export default router;