import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from '../../routes/authRoutes.js';
import gamificationRoutes from '../../routes/gamificationRoutes.js';
import mentorRoutes from '../../routes/mentorRoutes.js';
import learningRoutes from '../../routes/learningRoutes.js';
import quizRoutes from '../../routes/quizRoutes.js';
import adminRoutes from '../../routes/adminRoutes.js';
import arenaRoutes from '../../routes/arenaRoutes.js';
import notificationRoutes from '../../routes/notificationRoutes.js';
import socialRoutes from '../../routes/socialRoutes.js';
import marketRoutes from '../../routes/marketRoutes.js';
import tradeRoutes from '../../routes/tradeRoutes.js';
import portfolioRoutes from '../../routes/portfolioRoutes.js';
import transactionRoutes from '../../routes/transactionRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/gamification', gamificationRoutes);
router.use('/mentor', mentorRoutes);
router.use('/learning', learningRoutes);
router.use('/quizzes', quizRoutes);
router.use('/admin', adminRoutes);
router.use('/arena', arenaRoutes);
router.use('/notifications', notificationRoutes);
router.use('/social', socialRoutes);
router.use('/market', marketRoutes);
router.use('/trade', tradeRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/transactions', transactionRoutes);

export default router;
