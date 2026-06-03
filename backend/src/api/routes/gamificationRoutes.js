import { Router } from 'express';
import {
  applyReferralCode,
  claimMissionReward,
  claimStreakReward,
  getOverview,
  getUserLeaderboard
} from '../controllers/gamificationController.js';
import { protect } from '../../middleware/authMiddleware.js';

const router = Router();

router.get('/overview', protect, getOverview);
router.get('/leaderboard', protect, getUserLeaderboard);
router.post('/streak/claim', protect, claimStreakReward);
router.post('/missions/claim', protect, claimMissionReward);
router.post('/referrals/apply', protect, applyReferralCode);

export default router;
