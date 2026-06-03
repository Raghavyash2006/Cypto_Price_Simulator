import { Router } from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { requireAdmin } from '../../middleware/adminMiddleware.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { validateObjectId } from '../../middleware/validate.js';
import {
  createQuiz,
  deleteQuiz,
  deleteUser,
  getActivity,
  getAnalytics,
  getLeaderboard,
  getModerationQueue,
  getNotifications,
  getOverview,
  getQuizzes,
  getUsers,
  removeComment,
  removePost,
  updateQuiz,
  updateUser
} from '../controllers/adminController.js';

const router = Router();
const adminRateLimit = createRateLimiter({
  keyPrefix: 'admin',
  windowMs: 5 * 60 * 1000,
  max: 60,
  message: 'Too many admin requests, please slow down.'
});

router.use(protect, requireAdmin, adminRateLimit);

router.get('/overview', getOverview);
router.get('/users', getUsers);
router.patch('/users/:userId', validateObjectId('userId'), updateUser);
router.delete('/users/:userId', validateObjectId('userId'), deleteUser);
router.get('/quizzes', getQuizzes);
router.post('/quizzes', createQuiz);
router.patch('/quizzes/:quizId', validateObjectId('quizId'), updateQuiz);
router.delete('/quizzes/:quizId', validateObjectId('quizId'), deleteQuiz);
router.get('/leaderboard', getLeaderboard);
router.get('/analytics', getAnalytics);
router.get('/activity', getActivity);
router.get('/notifications', getNotifications);
router.get('/moderation', getModerationQueue);
router.delete('/moderation/posts/:postId', validateObjectId('postId'), removePost);
router.delete('/moderation/comments/:commentId', validateObjectId('commentId'), removeComment);

export default router;
