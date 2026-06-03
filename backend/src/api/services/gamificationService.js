import mongoose from 'mongoose';
import NodeCache from 'node-cache';
import User from '../../models/User.js';
import Achievement from '../../models/Achievement.js';
import Transaction from '../../models/Transaction.js';
import QuizAttempt from '../../models/QuizAttempt.js';
import LearningProgress from '../../models/LearningProgress.js';
import AIChatHistory from '../../models/AIChatHistory.js';
import Portfolio from '../../models/Portfolio.js';
import { getPrices } from '../../services/coingeckoService.js';
import { getIo, getUserRoom } from '../../config/socket.js';

const LEVEL_BANDS = [
  { rank: 1, title: 'Beginner', minXp: 0, band: 'beginner' },
  { rank: 2, title: 'Apprentice', minXp: 300, band: 'beginner' },
  { rank: 3, title: 'Trader', minXp: 900, band: 'intermediate' },
  { rank: 4, title: 'Analyst', minXp: 2200, band: 'intermediate' },
  { rank: 5, title: 'Pro Trader', minXp: 4200, band: 'advanced' },
  { rank: 6, title: 'Elite Investor', minXp: 7000, band: 'expert' }
];

const ACHIEVEMENT_RULES = [
  {
    key: 'first_trade',
    title: 'First Trade',
    description: 'Complete your first simulated trade.',
    xpReward: 75,
    badgeImage: '⚡',
    evaluate: async (metrics) => metrics.tradeCount >= 1
  },
  {
    key: 'streak_runner',
    title: 'Streak Runner',
    description: 'Claim a 3-day streak.',
    xpReward: 125,
    badgeImage: '🔥',
    evaluate: async (metrics) => metrics.streak >= 3
  },
  {
    key: 'referral_connector',
    title: 'Referral Connector',
    description: 'Invite your first friend.',
    xpReward: 100,
    badgeImage: '🤝',
    evaluate: async (metrics) => metrics.referralCount >= 1
  },
  {
    key: 'xp_sprinter',
    title: 'XP Sprinter',
    description: 'Earn 2,500 XP.',
    xpReward: 150,
    badgeImage: '🚀',
    evaluate: async (metrics) => metrics.xp >= 2500
  },
  {
    key: 'portfolio_builder',
    title: 'Portfolio Builder',
    description: 'Make at least five simulated trades.',
    xpReward: 175,
    badgeImage: '📈',
    evaluate: async (metrics) => metrics.tradeCount >= 5
  },
  {
    key: 'quiz_champion',
    title: 'Quiz Champion',
    description: 'Pass five crypto quizzes.',
    xpReward: 175,
    badgeImage: '🎓',
    evaluate: async (metrics) => metrics.quizPassCount >= 5
  },
  {
    key: 'ai_learner',
    title: 'AI Learner',
    description: 'Have five AI mentor sessions.',
    xpReward: 150,
    badgeImage: '🤖',
    evaluate: async (metrics) => metrics.aiMentorSessions >= 5
  },
  {
    key: 'profit_breaker',
    title: 'Profit Breaker',
    description: 'Lock in a profitable closed trade.',
    xpReward: 125,
    badgeImage: '💰',
    evaluate: async (metrics) => metrics.realizedPnL > 0
  },
  {
    key: 'consistency_master',
    title: 'Consistency Master',
    description: 'Reach a 7-day streak.',
    xpReward: 200,
    badgeImage: '📅',
    evaluate: async (metrics) => metrics.streak >= 7
  },
  {
    key: 'learning_starter',
    title: 'Learning Starter',
    description: 'Complete your first lesson.',
    xpReward: 90,
    badgeImage: '📘',
    evaluate: async (metrics) => metrics.learningCompletedLessons >= 1
  },
  {
    key: 'learning_consistency',
    title: 'Learning Consistency',
    description: 'Complete five lessons.',
    xpReward: 140,
    badgeImage: '🧠',
    evaluate: async (metrics) => metrics.learningCompletedLessons >= 5
  },
  {
    key: 'learning_quiz_master',
    title: 'Learning Quiz Master',
    description: 'Pass five learning quizzes.',
    xpReward: 175,
    badgeImage: '🎯',
    evaluate: async (metrics) => metrics.learningQuizPassCount >= 5
  },
  {
    key: 'learning_market_analyst',
    title: 'Learning Market Analyst',
    description: 'Finish two advanced learning courses or maintain strong learning accuracy.',
    xpReward: 190,
    badgeImage: '📊',
    evaluate: async (metrics) => metrics.completedLearningCourses >= 2 || (metrics.learningQuizAverage >= 80 && metrics.learningQuizAttemptCount >= 8)
  }
];

const dashboardCache = new NodeCache({ stdTTL: 30, useClones: false });

function dashboardCacheKey(prefix, scope, extra = '') {
  return [prefix, String(scope), extra].filter(Boolean).join(':');
}

function readDashboardCache(prefix, scope, extra = '') {
  return dashboardCache.get(dashboardCacheKey(prefix, scope, extra));
}

function writeDashboardCache(prefix, scope, value, extra = '') {
  dashboardCache.set(dashboardCacheKey(prefix, scope, extra), value, 30);
}

function invalidateDashboardCache(scope) {
  const prefix = `dashboard:${String(scope)}:`;
  for (const key of dashboardCache.keys()) {
    if (key.startsWith(prefix)) {
      dashboardCache.del(key);
    }
  }
}

const DAILY_MISSIONS = [
  {
    key: 'daily_trade',
    title: 'Place one trade',
    description: 'Execute a buy or sell order today.',
    target: 1,
    rewardXp: 120,
    measure: (metrics) => metrics.tradeCountToday
  },
  {
    key: 'daily_xp',
    title: 'Earn 150 XP',
    description: 'Stack learning and trading rewards in a single day.',
    target: 150,
    rewardXp: 140,
    measure: (metrics) => metrics.rewardXpToday
  },
  {
    key: 'daily_streak',
    title: 'Maintain your streak',
    description: 'Claim today’s streak reward.',
    target: 1,
    rewardXp: 100,
    measure: (metrics) => (metrics.lastStreakAtToday ? 1 : 0)
  },
  {
    key: 'daily_ai',
    title: 'Use the AI mentor',
    description: 'Send one trading question to the mentor today.',
    target: 1,
    rewardXp: 90,
    measure: (metrics) => metrics.aiMentorSessionsToday
  }
];

const WEEKLY_CHALLENGES = [
  {
    key: 'weekly_trader',
    title: 'Weekly trader',
    description: 'Complete five simulated trades this week.',
    target: 5,
    rewardXp: 250,
    measure: (metrics) => metrics.tradeCountWeek
  },
  {
    key: 'weekly_xp',
    title: 'Weekly XP burst',
    description: 'Earn 1,000 XP this week.',
    target: 1000,
    rewardXp: 300,
    measure: (metrics) => metrics.rewardXpWeek
  },
  {
    key: 'weekly_referral',
    title: 'Bring a friend',
    description: 'Earn at least one successful referral.',
    target: 1,
    rewardXp: 250,
    measure: (metrics) => metrics.referralCount
  },
  {
    key: 'weekly_mentor',
    title: 'Mentor sprint',
    description: 'Use the AI mentor five times this week.',
    target: 5,
    rewardXp: 250,
    measure: (metrics) => metrics.aiMentorSessionsWeek
  }
];

const MAX_NOTIFICATIONS = 20;

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfWeek(date = new Date()) {
  const value = startOfDay(date);
  const offset = (value.getDay() + 6) % 7;
  value.setDate(value.getDate() - offset);
  return value;
}

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function weekKey(date = new Date()) {
  const weekStart = startOfWeek(date).toISOString().slice(0, 10);
  return `week:${weekStart}`;
}

function levelFromXp(xp = 0) {
  const current = [...LEVEL_BANDS].reverse().find((band) => xp >= band.minXp) || LEVEL_BANDS[0];
  const next = LEVEL_BANDS.find((band) => band.minXp > current.minXp) || null;
  const xpIntoLevel = Math.max(0, xp - current.minXp);
  const xpSpan = next ? next.minXp - current.minXp : Math.max(current.minXp, 1000);

  return {
    rank: current.rank,
    title: current.title,
    band: current.band,
    minXp: current.minXp,
    nextMinXp: next?.minXp || null,
    nextTitle: next?.title || current.title,
    progress: next ? Math.min(1, xpIntoLevel / xpSpan) : 1,
    xpToNext: next ? Math.max(0, next.minXp - xp) : 0
  };
}

function pushNotification(user, type, message, metadata = {}) {
  user.notifications = Array.isArray(user.notifications) ? user.notifications : [];
  const notification = {
    type,
    title: message,
    message,
    source: 'gamification',
    priority: type === 'achievement' || type === 'streak' ? 'high' : 'normal',
    metadata,
    read: false
  };
  user.notifications.unshift(notification);
  user.notifications = user.notifications.slice(0, MAX_NOTIFICATIONS);
  const io = getIo();
  if (io && user?._id) {
    io.to(getUserRoom(user._id)).emit('notification:new', notification);
  }
  return notification;
}

function rewardKey(type, templateKey, date = new Date()) {
  return `${type}:${type === 'daily' ? dateKey(date) : weekKey(date)}:${templateKey}`;
}

async function ensureAchievementCatalog(session) {
  const seeded = [];

  for (const rule of ACHIEVEMENT_RULES) {
    const achievement = await Achievement.findOneAndUpdate(
      { key: rule.key },
      {
        $setOnInsert: {
          key: rule.key,
          title: rule.title,
          description: rule.description,
          badgeImage: rule.badgeImage,
          xpReward: rule.xpReward
        }
      },
      { new: true, upsert: true, session }
    );

    seeded.push(achievement);
  }

  return seeded;
}

async function getUserMetrics(userId, session) {
  const user = await User.findById(userId).session(session).lean();
  if (!user) {
    throw new Error('User not found');
  }

  const now = new Date();
  const today = startOfDay(now);
  const weekStart = startOfWeek(now);

  const [tradeCountToday, tradeCountWeek, rewardXpToday, rewardXpWeek, totalTrades, achievements, quizPassCount, quizAttemptCount, aiMentorSessions, aiMentorSessionsToday, aiMentorSessionsWeek, realizedPnL, learningCompletedLessons, completedLearningCourses, learningProgressXp, learningQuizStats] = await Promise.all([
    Transaction.countDocuments({ user: userId, type: { $in: ['buy', 'sell'] }, timestamp: { $gte: today } }).session(session),
    Transaction.countDocuments({ user: userId, type: { $in: ['buy', 'sell'] }, timestamp: { $gte: weekStart } }).session(session),
    Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), type: 'reward', timestamp: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).session(session),
    Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), type: 'reward', timestamp: { $gte: weekStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).session(session),
    Transaction.countDocuments({ user: userId, type: { $in: ['buy', 'sell'] } }).session(session),
    Achievement.find({ _id: { $in: user.achievements || [] } }).session(session).lean(),
    QuizAttempt.countDocuments({ user: userId, isPassed: true }).session(session),
    QuizAttempt.countDocuments({ user: userId }).session(session),
    AIChatHistory.countDocuments({ userId }).session(session),
    AIChatHistory.countDocuments({ userId, createdAt: { $gte: today } }).session(session),
    AIChatHistory.countDocuments({ userId, createdAt: { $gte: weekStart } }).session(session),
    Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), type: 'sell' } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$metadata.realizedPnL', 0] } } } }
    ]).session(session),
    LearningProgress.countDocuments({ user: userId, completed: true }).session(session),
    LearningProgress.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), completed: true } },
      { $group: { _id: '$course' } }
    ]).session(session),
    LearningProgress.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: '$xpEarned' } } }
    ]).session(session),
    QuizAttempt.aggregate([
      {
        $lookup: {
          from: 'quizzes',
          localField: 'quiz',
          foreignField: '_id',
          as: 'quiz'
        }
      },
      { $unwind: '$quiz' },
      { $match: { user: new mongoose.Types.ObjectId(userId), 'quiz.sourceType': { $in: ['learning_lesson', 'learning_course'] } } },
      {
        $group: {
          _id: null,
          passCount: { $sum: { $cond: ['$isPassed', 1, 0] } },
          attemptCount: { $sum: 1 },
          averagePercentage: { $avg: '$percentage' }
        }
      }
    ]).session(session)
  ]);

  return {
    user,
    tradeCountToday,
    tradeCountWeek,
    rewardXpToday: rewardXpToday[0]?.total || 0,
    rewardXpWeek: rewardXpWeek[0]?.total || 0,
    tradeCount: totalTrades,
    quizPassCount,
    quizAttemptCount,
    aiMentorSessions,
    aiMentorSessionsToday,
    aiMentorSessionsWeek,
    realizedPnL: realizedPnL[0]?.total || 0,
    learningCompletedLessons,
    completedLearningCourses: completedLearningCourses.length,
    learningProgressXp: learningProgressXp[0]?.total || 0,
    learningQuizPassCount: learningQuizStats[0]?.passCount || 0,
    learningQuizAttemptCount: learningQuizStats[0]?.attemptCount || 0,
    learningQuizAverage: Number(learningQuizStats[0]?.averagePercentage || 0),
    streak: user.streak || 0,
    achievements,
    now
  };
}

async function unlockEligibleAchievements(userId, session) {
  const metrics = await getUserMetrics(userId, session);
  await ensureAchievementCatalog(session);

  const user = await User.findById(userId).session(session);
  if (!user) {
    throw new Error('User not found');
  }

  const unlocked = [];
  for (const rule of ACHIEVEMENT_RULES) {
    const shouldUnlock = await rule.evaluate(metrics);
    if (!shouldUnlock) continue;

    const achievement = await Achievement.findOne({ key: rule.key }).session(session);
    if (!achievement) continue;

    const alreadyUnlocked = (user.badges || []).some((badgeId) => String(badgeId) === String(achievement._id));
    if (alreadyUnlocked) continue;

    user.badges = Array.isArray(user.badges) ? user.badges : [];
    user.achievements = Array.isArray(user.achievements) ? user.achievements : [];
    user.badges.push(achievement._id);
    user.achievements.push(achievement._id);
    user.xp = (user.xp || 0) + (achievement.xpReward || 0);
    pushNotification(user, 'achievement', `Unlocked achievement: ${achievement.title}`, {
      achievementId: achievement._id,
      xpReward: achievement.xpReward
    });

    await Transaction.create(
      [
        {
          user: user._id,
          type: 'reward',
          symbol: 'XP',
          amount: achievement.xpReward || 0,
          metadata: { reason: `achievement:${achievement.key}` }
        }
      ],
      { session }
    );

    unlocked.push(achievement);
  }

  return { user, unlocked };
}

function buildMissionState(kind, templates, metrics, claimedRewardKeys, dateValue) {
  return templates.map((template) => {
    const periodKey = rewardKey(kind, template.key, dateValue);
    const current = template.measure(metrics);
    const progress = template.target <= 0 ? 100 : Math.min(100, Math.round((current / template.target) * 100));
    return {
      key: template.key,
      periodKey,
      title: template.title,
      description: template.description,
      rewardXp: template.rewardXp,
      target: template.target,
      current,
      progress,
      completed: current >= template.target,
      claimed: claimedRewardKeys.includes(periodKey)
    };
  });
}

function buildOverviewPayload(user, metrics) {
  const level = levelFromXp(user.xp || 0);
  const claimedRewardKeys = user.gamification?.claimedRewardKeys || [];
  const today = new Date();

  return {
    user: {
      id: user._id,
      username: user.username,
      name: user.name,
      avatar: user.avatar,
      xp: user.xp || 0,
      level: user.level,
      streak: user.streak || 0,
      lastStreakAt: user.lastStreakAt,
      referralCode: user.referralCode,
      referralCount: user.referralCount || 0,
      virtualBalance: user.virtualBalance || 0
    },
    level,
    badges: metrics.achievements.map((achievement) => ({
      id: achievement._id,
      key: achievement.key,
      title: achievement.title,
      description: achievement.description,
      badgeImage: achievement.badgeImage,
      xpReward: achievement.xpReward
    })),
    missions: buildMissionState('daily', DAILY_MISSIONS, metrics, claimedRewardKeys, today),
    challenges: buildMissionState('weekly', WEEKLY_CHALLENGES, metrics, claimedRewardKeys, today),
    notifications: (user.notifications || []).slice(0, 8),
    summary: {
      tradeCountToday: metrics.tradeCountToday,
      tradeCountWeek: metrics.tradeCountWeek,
      rewardXpToday: metrics.rewardXpToday,
      rewardXpWeek: metrics.rewardXpWeek,
      achievementsUnlocked: metrics.achievements.length,
      quizPassCount: metrics.quizPassCount,
      learningCompletedLessons: metrics.learningCompletedLessons,
      completedLearningCourses: metrics.completedLearningCourses,
      learningQuizPassCount: metrics.learningQuizPassCount,
      learningQuizAverage: metrics.learningQuizAverage,
      aiMentorSessionsToday: metrics.aiMentorSessionsToday,
      aiMentorSessionsWeek: metrics.aiMentorSessionsWeek,
      realizedPnL: metrics.realizedPnL
    }
  };
}

async function persistReward(user, amount, reason, metadata, session) {
  const safeAmount = Math.max(0, Number(amount) || 0);
  if (!safeAmount) {
    return null;
  }

  user.xp = (user.xp || 0) + safeAmount;
  user.notifications = Array.isArray(user.notifications) ? user.notifications : [];
  pushNotification(user, 'xp', `You earned ${safeAmount} XP from ${reason}`, { amount: safeAmount, reason, ...metadata });

  await Transaction.create(
    [
      {
        user: user._id,
        type: 'reward',
        symbol: 'XP',
        amount: safeAmount,
        metadata: { reason, ...metadata }
      }
    ],
    { session }
  );

  return safeAmount;
}

export async function awardXp(userId, amount, reason = 'reward', metadata = {}) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error('User not found');
    }

    await persistReward(user, amount, reason, metadata, session);
    const unlocked = await unlockEligibleAchievements(userId, session);
    const level = levelFromXp(user.xp || 0);
    user.level = level.band;
    await user.save({ session });
    await session.commitTransaction();
    session.endSession();

    const io = getIo();
    if (io) {
      io.emit('gamification:reward', {
        userId: String(user._id),
        amount,
        reason,
        levelRank: level.rank,
        unlockedAchievements: unlocked.unlocked.map((achievement) => achievement.title)
      });
    }

    invalidateDashboardCache(userId);
    invalidateDashboardCache('leaderboard:global');

    return {
      user: user.toSafeObject(),
      level,
      unlockedAchievements: unlocked.unlocked.map((achievement) => ({
        id: achievement._id,
        key: achievement.key,
        title: achievement.title,
        description: achievement.description,
        badgeImage: achievement.badgeImage,
        xpReward: achievement.xpReward
      }))
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

export async function claimDailyStreak(userId) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error('User not found');
    }

    const now = new Date();
    const last = user.lastStreakAt ? new Date(user.lastStreakAt) : null;
    const oneDay = 24 * 60 * 60 * 1000;

    if (last && now - last < oneDay) {
      throw new Error('Streak already claimed today');
    }

    if (last && now - last < 2 * oneDay) {
      user.streak = (user.streak || 0) + 1;
    } else {
      user.streak = 1;
    }

    user.lastStreakAt = now;
    const xpAward = 50 + Math.min(user.streak * 15, 250);
    await persistReward(user, xpAward, 'daily streak', { streak: user.streak }, session);
    const unlocked = await unlockEligibleAchievements(userId, session);
    user.level = levelFromXp(user.xp || 0).band;
    await user.save({ session });
    await session.commitTransaction();
    session.endSession();

    const io = getIo();
    if (io) {
      io.emit('gamification:streak', {
        userId: String(user._id),
        streak: user.streak,
        xpAward
      });
    }

    invalidateDashboardCache(userId);
    invalidateDashboardCache('leaderboard:global');

    return {
      streak: user.streak,
      xpAward,
      unlockedAchievements: unlocked.unlocked.map((achievement) => ({
        id: achievement._id,
        title: achievement.title,
        key: achievement.key,
        xpReward: achievement.xpReward
      }))
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

export async function processReferral(referrerCode, newUserId) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const referrer = await User.findOne({ referralCode: referrerCode }).session(session);
    const newUser = await User.findById(newUserId).session(session);

    if (!referrer || !newUser) {
      await session.abortTransaction();
      session.endSession();
      return null;
    }

    referrer.referralCount = (referrer.referralCount || 0) + 1;
    newUser.referredBy = referrer._id;

    await persistReward(referrer, 150, 'referral bonus', { referredUserId: String(newUser._id) }, session);
    referrer.virtualBalance = (referrer.virtualBalance || 0) + 250;
    pushNotification(referrer, 'referral', 'Referral bonus unlocked: +150 XP and +250 virtual balance', {
      referredUserId: newUser._id
    });
    pushNotification(newUser, 'referral', 'Welcome bonus unlocked through a referral code', {
      referrerId: referrer._id
    });

    await persistReward(newUser, 50, 'referral welcome bonus', { referrerId: String(referrer._id) }, session);
    const referrerAchievements = await unlockEligibleAchievements(referrer._id, session);
    const newUserAchievements = await unlockEligibleAchievements(newUser._id, session);
    referrer.level = levelFromXp(referrer.xp || 0).band;
    newUser.level = levelFromXp(newUser.xp || 0).band;

    await referrer.save({ session });
    await newUser.save({ session });
    await session.commitTransaction();
    session.endSession();

    return {
      referrer,
      newUser,
      unlocked: {
        referrer: referrerAchievements.unlocked.map((achievement) => achievement.title),
        newUser: newUserAchievements.unlocked.map((achievement) => achievement.title)
      }
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

export async function claimReward(userId, rewardType, rewardKeyValue) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error('User not found');
    }

    const metrics = await getUserMetrics(userId, session);
    const claimedRewardKeys = user.gamification?.claimedRewardKeys || [];
    const periodKey = rewardKeyValue || rewardKey(rewardType, rewardType, new Date());
    if (claimedRewardKeys.includes(periodKey)) {
      throw new Error('Reward already claimed');
    }

    const templates = rewardType === 'weekly' ? WEEKLY_CHALLENGES : DAILY_MISSIONS;
    const dateValue = new Date();
    const selected = templates.map((template) => ({
      ...template,
      periodKey: rewardKey(rewardType, template.key, dateValue),
      current: template.measure(metrics),
      progress: template.target <= 0 ? 100 : Math.min(100, Math.round((template.measure(metrics) / template.target) * 100))
    })).find((template) => template.periodKey === periodKey);

    if (!selected) {
      throw new Error('Reward not found');
    }

    if (selected.current < selected.target) {
      throw new Error('Reward is not ready yet');
    }

    user.gamification = user.gamification || { claimedRewardKeys: [] };
    user.gamification.claimedRewardKeys = [...new Set([...(user.gamification.claimedRewardKeys || []), periodKey])];
    await persistReward(user, selected.rewardXp, `${rewardType} ${selected.key}`, { periodKey }, session);
    const unlocked = await unlockEligibleAchievements(userId, session);
    user.level = levelFromXp(user.xp || 0).band;
    await user.save({ session });
    await session.commitTransaction();
    session.endSession();

    return {
      rewardKey: periodKey,
      rewardXp: selected.rewardXp,
      unlockedAchievements: unlocked.unlocked.map((achievement) => ({
        id: achievement._id,
        title: achievement.title,
        key: achievement.key,
        xpReward: achievement.xpReward
      }))
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

export async function getGamificationOverview(userId) {
  const cached = readDashboardCache('dashboard:overview', userId);
  if (cached) {
    return cached;
  }

  const session = await mongoose.startSession();
  try {
    const user = await User.findById(userId).populate('badges').session(session);
    if (!user) {
      throw new Error('User not found');
    }

    const metrics = await getUserMetrics(userId, session);
    const overview = buildOverviewPayload(user, metrics);
    writeDashboardCache('dashboard:overview', userId, overview);
    return overview;
  } finally {
    session.endSession();
  }
}

export { unlockEligibleAchievements };

async function buildProfitMetrics(userId) {
  const holdings = await Portfolio.find({ user: userId }).lean().exec();
  if (!holdings.length) {
    return { totalValue: 0, investedCapital: 0, profitLoss: 0, profitLossPct: 0 };
  }

  const symbols = [...new Set(holdings.map((holding) => String(holding.coinId || holding.symbol || '').toLowerCase()).filter(Boolean))];
  const prices = symbols.length ? await getPrices(symbols, 'usd') : {};
  let totalValue = 0;
  let investedCapital = 0;

  holdings.forEach((holding) => {
    const coinKey = String(holding.coinId || holding.symbol || '').toLowerCase();
    const price = prices[coinKey]?.usd || holding.currentPrice || 0;
    totalValue += price * (holding.quantity || 0);
    investedCapital += (holding.buyPrice || 0) * (holding.quantity || 0);
  });

  const profitLoss = totalValue - investedCapital;
  const profitLossPct = investedCapital ? (profitLoss / investedCapital) * 100 : 0;

  return { totalValue, investedCapital, profitLoss, profitLossPct };
}

export async function getLeaderboard(limit = 10, sortBy = 'xp') {
  const cacheKey = `${Number(limit) || 10}:${String(sortBy || 'xp').toLowerCase()}`;
  const cached = readDashboardCache('dashboard:leaderboard', 'global', cacheKey);
  if (cached) {
    return cached;
  }

  const cappedLimit = Math.max(1, Math.min(Number(limit) || 10, 100));
  const normalizedSort = String(sortBy || 'xp').toLowerCase();
  const candidateLimit = normalizedSort === 'profit' || normalizedSort === 'growth'
    ? Math.min(100, Math.max(cappedLimit * 4, cappedLimit))
    : cappedLimit;

  const baseUsers = await User.find()
    .limit(candidateLimit)
    .select('username name avatar xp level streak referralCount badges')
    .populate('badges')
    .lean()
    .exec();

  let users = baseUsers;

  if (normalizedSort === 'profit' || normalizedSort === 'growth') {
    const withMetrics = await Promise.all(
      baseUsers.map(async (user) => ({
        user,
        metrics: await buildProfitMetrics(user._id)
      }))
    );

    withMetrics.sort((left, right) => {
      if (normalizedSort === 'profit') return right.metrics.profitLoss - left.metrics.profitLoss || right.user.xp - left.user.xp;
      return right.metrics.profitLossPct - left.metrics.profitLossPct || right.user.xp - left.user.xp;
    });

    users = withMetrics.map((entry) => ({
      ...entry.user,
      profitLoss: entry.metrics.profitLoss,
      profitLossPct: entry.metrics.profitLossPct,
      totalValue: entry.metrics.totalValue
    }));
  } else if (normalizedSort === 'streak') {
    users.sort((left, right) => right.streak - left.streak || right.xp - left.xp || right.referralCount - left.referralCount);
  } else if (normalizedSort === 'referrals') {
    users.sort((left, right) => right.referralCount - left.referralCount || right.xp - left.xp || right.streak - left.streak);
  } else {
    users.sort((left, right) => right.xp - left.xp || right.referralCount - left.referralCount || right.updatedAt - left.updatedAt);
  }

  const leaderboard = users.slice(0, cappedLimit).map((user, index) => {
    const level = levelFromXp(user.xp || 0);
    return {
      id: user._id,
      rank: index + 1,
      username: user.username,
      name: user.name || user.username,
      avatar: user.avatar,
      xp: user.xp || 0,
      level: level.title,
      streak: user.streak || 0,
      referralCount: user.referralCount || 0,
      badgeCount: Array.isArray(user.badges) ? user.badges.length : 0,
      profitLoss: user.profitLoss,
      profitLossPct: user.profitLossPct,
      totalValue: user.totalValue
    };
  });

  writeDashboardCache('dashboard:leaderboard', 'global', leaderboard, cacheKey);
  return leaderboard;
}

export function getLevelProgress(xp) {
  return levelFromXp(xp);
}

export function getDailyMissions(metrics, claimedRewardKeys = []) {
  return buildMissionState('daily', DAILY_MISSIONS, metrics, claimedRewardKeys, new Date());
}

export function getWeeklyChallenges(metrics, claimedRewardKeys = []) {
  return buildMissionState('weekly', WEEKLY_CHALLENGES, metrics, claimedRewardKeys, new Date());
}

export { levelFromXp };
