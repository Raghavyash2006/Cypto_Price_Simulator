import { Router } from 'express';
import { getSession, streamReply } from '../controllers/mentorController.js';
import { protect } from '../../middleware/authMiddleware.js';

const router = Router();

router.get('/session', protect, getSession);
router.post('/chat', protect, ...streamReply);

export default router;
