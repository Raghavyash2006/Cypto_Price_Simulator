import asyncHandler from '../../utils/asyncHandler.js';
import {
  claimDailyStreak,
  claimReward,
  getGamificationOverview,
  getLeaderboard,
  processReferral
} from '../services/gamificationService.js';

export const getOverview = asyncHandler(async (req, res) => {
  const overview = await getGamificationOverview(req.user._id);
  res.json(overview);
});

export const getUserLeaderboard = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit || 10);
  const leaderboard = await getLeaderboard(limit, req.query.sortBy);
  res.json({ leaderboard });
});

export const claimStreakReward = asyncHandler(async (req, res) => {
  const result = await claimDailyStreak(req.user._id);
  res.json({ message: 'Daily streak claimed', ...result });
});

export const claimMissionReward = asyncHandler(async (req, res) => {
  const { rewardType, rewardKey } = req.body;
  if (!rewardType || !rewardKey) {
    res.status(400);
    throw new Error('rewardType and rewardKey are required');
  }

  const result = await claimReward(req.user._id, rewardType, rewardKey);
  res.json({ message: 'Reward claimed', ...result });
});

export const applyReferralCode = asyncHandler(async (req, res) => {
  const { referralCode, newUserId } = req.body;
  if (!referralCode || !newUserId) {
    res.status(400);
    throw new Error('referralCode and newUserId are required');
  }

  const result = await processReferral(referralCode, newUserId);
  if (!result) {
    res.status(404);
    throw new Error('Referral could not be processed');
  }

  res.json({ message: 'Referral processed', result });
});
