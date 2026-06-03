import { Router } from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { validateBody, validateObjectId } from '../../middleware/validate.js';
import {
  createGeneratedQuiz,
  getAnalytics,
  getLeaderboard,
  getQuiz,
  getQuizResults,
  getQuizzes,
  submitQuiz
} from '../controllers/quizController.js';

const router = Router();
const quizWriteRateLimit = createRateLimiter({
  keyPrefix: 'quiz-write',
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: 'Too many quiz actions, please slow down.'
});

router.get('/', protect, getQuizzes);
router.get('/leaderboard', protect, getLeaderboard);
router.get('/analytics', protect, getAnalytics);
router.get('/:quizId', protect, validateObjectId('quizId'), getQuiz);
router.get('/:quizId/results', protect, validateObjectId('quizId'), getQuizResults);
router.post('/generate', protect, quizWriteRateLimit, createGeneratedQuiz);
router.post('/submit', protect, quizWriteRateLimit, validateBody(['quizId', 'answers']), submitQuiz);

export default router;
