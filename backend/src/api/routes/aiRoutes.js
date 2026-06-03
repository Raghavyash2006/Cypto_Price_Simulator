import { Router } from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { validateBody } from '../../middleware/validate.js';
import { aiRateLimit } from '../middleware/aiRateLimit.js';
import { chat, deleteHistory, getHistory } from '../controllers/aiController.js';

const router = Router();

router.get('/history', protect, getHistory);
router.delete('/history', protect, deleteHistory);
router.post('/chat', protect, validateBody(['message']), aiRateLimit, chat);

export default router;