import { Router } from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { validateBody, validateObjectId } from '../../middleware/validate.js';
import {
  commentPost,
  compareProfiles,
  createFeedPost,
  followUser,
  getActivity,
  getCompetitionsList,
  getCompetitionBoard,
  getFeed,
  getLeaderboard,
  getNotifications,
  getProfile,
  joinTradingCompetition,
  likePost,
  requestFriend,
  respondToFriendRequest,
  updateSettings
} from '../controllers/socialController.js';

const router = Router();
const socialWriteRateLimit = createRateLimiter({
  keyPrefix: 'social-write',
  windowMs: 5 * 60 * 1000,
  max: 25,
  message: 'Too many social actions, please slow down.'
});

router.get('/feed', protect, getFeed);
router.post('/posts', protect, socialWriteRateLimit, validateBody(['content']), createFeedPost);
router.post('/posts/:postId/like', protect, socialWriteRateLimit, validateObjectId('postId'), likePost);
router.post('/posts/:postId/comments', protect, socialWriteRateLimit, validateObjectId('postId'), validateBody(['content']), commentPost);
router.post('/follow', protect, socialWriteRateLimit, validateBody(['username']), followUser);
router.post('/friends/request', protect, socialWriteRateLimit, validateBody(['username']), requestFriend);
router.post('/friends/respond', protect, socialWriteRateLimit, validateBody(['requestId', 'decision']), respondToFriendRequest);
router.get('/profile/:username', getProfile);
router.patch('/profile/settings', protect, socialWriteRateLimit, updateSettings);
router.get('/leaderboard', protect, getLeaderboard);
router.get('/activity', protect, getActivity);
router.post('/compare', protect, validateBody(['usernameA', 'usernameB']), compareProfiles);
router.get('/competitions', protect, getCompetitionsList);
router.post('/competitions/join', protect, socialWriteRateLimit, validateBody(['competitionId']), joinTradingCompetition);
router.get('/competitions/:competitionId', protect, validateObjectId('competitionId'), getCompetitionBoard);
router.get('/notifications', protect, getNotifications);

export default router;
