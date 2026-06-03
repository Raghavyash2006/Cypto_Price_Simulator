import { Router } from 'express';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { validateBody } from '../../middleware/validate.js';
import {
  getAnalytics,
  getCourse,
  getCourses,
  getLesson,
  getModules,
  getRecommendations,
  postProgress
} from '../controllers/learnController.js';
import { generateQuiz, getQuizHistory, submitQuiz } from '../controllers/learnQuizController.js';
import { explain, examples, summarize } from '../controllers/learnAiController.js';
import { protect } from '../../middleware/authMiddleware.js';
import { aiRateLimit } from '../middleware/aiRateLimit.js';

const router = Router();
const learnWriteRateLimit = createRateLimiter({
  keyPrefix: 'learn-write',
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: 'Too many learning actions, please wait a bit.'
});

router.get('/courses', protect, getCourses);
router.get('/course/:id', protect, getCourse);
router.get('/lesson/:id', protect, getLesson);
router.post('/progress', protect, learnWriteRateLimit, validateBody(['lessonId']), postProgress);
router.get('/analytics', protect, getAnalytics);

router.post('/quiz/generate', protect, learnWriteRateLimit, validateBody(['lessonId']), generateQuiz);
router.post('/quiz/submit', protect, learnWriteRateLimit, validateBody(['quizId', 'answers']), submitQuiz);
router.get('/quiz/history', protect, getQuizHistory);

router.post('/ai/explain', protect, aiRateLimit, validateBody(['lessonId']), explain);
router.post('/ai/summarize', protect, aiRateLimit, validateBody(['lessonId']), summarize);
router.post('/ai/examples', protect, aiRateLimit, validateBody(['lessonId']), examples);

router.get('/modules', protect, getModules);
router.get('/recommendations', protect, getRecommendations);

export default router;