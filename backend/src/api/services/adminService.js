import mongoose from 'mongoose';
import User from '../../models/User.js';
import Quiz from '../../models/Quiz.js';
import QuizAttempt from '../../models/QuizAttempt.js';
import Transaction from '../../models/Transaction.js';
import SocialActivity from '../../models/SocialActivity.js';
import SocialPost from '../../models/SocialPost.js';
import SocialComment from '../../models/SocialComment.js';
import NotificationAlert from '../../models/NotificationAlert.js';
import TradingCompetition from '../../models/TradingCompetition.js';
import { createQuiz as createGeneratedQuiz } from '../services/quizService.js';
import { getLeaderboard as getGamificationLeaderboard } from '../services/gamificationService.js';
import { escapeRegex, sanitizeText, toPositiveInt } from '../../utils/inputSanitizer.js';

const DEFAULT_LIMIT = 25;

function clampLimit(value, max = 100) {
  return Math.min(Math.max(Number(value) || DEFAULT_LIMIT, 1), max);
}

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfWeek(date = new Date()) {
  const value = startOfDay(date);
  const day = value.getDay();
  const diff = value.getDate() - day + (day === 0 ? -6 : 1);
  value.setDate(diff);
  return value;
}

function formatUser(user) {
  return {
    id: user._id,
    username: user.username,
    name: user.name,
    bio: user.bio || '',
    email: user.email,
    avatar: user.avatar,
    portfolioVisibility: user.portfolioVisibility || 'public',
    isAdmin: Boolean(user.isAdmin),
    isActive: user.isActive !== false,
    xp: user.xp || 0,
    level: user.level,
    streak: user.streak || 0,
    referralCount: user.referralCount || 0,
    virtualBalance: user.virtualBalance || 0,
    followersCount: Array.isArray(user.followers) ? user.followers.length : 0,
    followingCount: Array.isArray(user.following) ? user.following.length : 0,
    friendsCount: Array.isArray(user.friends) ? user.friends.length : 0,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function formatQuiz(quiz, attemptStats = {}) {
  return {
    id: quiz._id,
    title: quiz.title,
    category: quiz.category,
    level: quiz.level,
    difficulty: quiz.difficulty,
    timeLimitSeconds: quiz.timeLimitSeconds,
    aiGenerated: quiz.aiGenerated,
    questionCount: quiz.questions?.length || 0,
    xpReward: quiz.xpReward,
    attemptCount: attemptStats.attemptCount || 0,
    averagePercentage: Number(attemptStats.averagePercentage || 0),
    bestScore: attemptStats.bestScore || 0,
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt
  };
}

function formatPost(post) {
  return {
    id: post._id,
    content: post.content,
    visibility: post.visibility,
    tags: post.tags || [],
    mediaUrl: post.mediaUrl || '',
    likesCount: post.likesCount || 0,
    commentsCount: post.commentsCount || 0,
    author: post.author,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt
  };
}

function formatComment(comment) {
  return {
    id: comment._id,
    post: comment.post,
    content: comment.content,
    author: comment.author,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt
  };
}

function formatActivity(activity) {
  return {
    id: activity._id,
    type: activity.type,
    title: activity.title,
    summary: activity.summary,
    visibility: activity.visibility,
    entityType: activity.entityType,
    entityId: activity.entityId,
    actor: activity.actor,
    targetUser: activity.targetUser,
    createdAt: activity.createdAt
  };
}

function formatAlert(alert) {
  return {
    id: alert._id,
    user: alert.user,
    type: alert.type,
    title: alert.title,
    coinId: alert.coinId,
    coinName: alert.coinName,
    symbol: alert.symbol,
    direction: alert.direction,
    targetPrice: alert.targetPrice,
    portfolioMetric: alert.portfolioMetric,
    threshold: alert.threshold,
    isActive: alert.isActive,
    lastTriggeredAt: alert.lastTriggeredAt,
    lastTriggeredValue: alert.lastTriggeredValue,
    createdAt: alert.createdAt,
    updatedAt: alert.updatedAt
  };
}

async function buildTimelineCounts(model, field = 'createdAt', days = 7, match = {}) {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);
  const pipeline = [
    { $match: { ...match, [field]: { $gte: since } } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: `$${field}` }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ];
  const rows = await model.aggregate(pipeline);
  const series = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(since);
    date.setDate(since.getDate() + i);
    const key = date.toISOString().slice(0, 10);
    series.push({ label: key, count: rows.find((row) => row._id === key)?.count || 0 });
  }
  return series;
}

export async function getAdminOverview() {
  const [users, quizzes, alerts, competitions, transactions, activities, recentUsers, recentTransactions, recentPosts, recentAlerts, leaderboard] = await Promise.all([
    User.countDocuments({}),
    Quiz.countDocuments({}),
    NotificationAlert.countDocuments({ isActive: true }),
    TradingCompetition.countDocuments({ isActive: true }),
    Transaction.countDocuments({}),
    SocialActivity.countDocuments({}),
    User.find({}).sort({ createdAt: -1 }).limit(5).lean().exec(),
    Transaction.find({}).sort({ timestamp: -1 }).limit(5).populate('user', 'username name avatar').lean().exec(),
    SocialPost.find({}).sort({ createdAt: -1 }).limit(5).populate('author', 'username name avatar').lean().exec(),
    NotificationAlert.find({}).sort({ createdAt: -1 }).limit(5).lean().exec(),
    getGamificationLeaderboard(5)
  ]);

  const [userTrend, transactionTrend, postTrend, activityTrend] = await Promise.all([
    buildTimelineCounts(User, 'createdAt', 7),
    buildTimelineCounts(Transaction, 'timestamp', 7),
    buildTimelineCounts(SocialPost, 'createdAt', 7),
    buildTimelineCounts(SocialActivity, 'createdAt', 7)
  ]);

  const totalNotifications = await User.aggregate([
    { $project: { count: { $size: { $ifNull: ['$notifications', []] } } } },
    { $group: { _id: null, total: { $sum: '$count' } } }
  ]);

  return {
    stats: {
      users,
      quizzes,
      activeAlerts: alerts,
      competitions,
      transactions,
      activities,
      notifications: totalNotifications[0]?.total || 0
    },
    recent: {
      users: recentUsers.map(formatUser),
      transactions: recentTransactions,
      posts: recentPosts.map(formatPost),
      alerts: recentAlerts.map(formatAlert)
    },
    charts: {
      users: userTrend,
      transactions: transactionTrend,
      posts: postTrend,
      activity: activityTrend
    },
    leaderboard,
    generatedAt: new Date().toISOString()
  };
}

export async function listAdminUsers({ search, limit, page }) {
  const query = {};
  if (search) {
    const safeSearch = escapeRegex(sanitizeText(search, { maxLength: 80 }));
    query.$or = [
      { username: { $regex: safeSearch, $options: 'i' } },
      { name: { $regex: safeSearch, $options: 'i' } },
      { email: { $regex: safeSearch, $options: 'i' } }
    ];
  }

  const pageNumber = toPositiveInt(page, 1, { min: 1, max: 1000 });
  const pageSize = clampLimit(limit, 100);
  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize).lean().exec(),
    User.countDocuments(query)
  ]);

  return {
    users: users.map(formatUser),
    page: pageNumber,
    pageSize,
    total
  };
}

export async function updateAdminUser(userId, payload) {
  const updates = {};
  const allowed = ['isAdmin', 'isActive', 'xp', 'level', 'streak', 'virtualBalance', 'referralCount', 'bio', 'portfolioVisibility'];
  allowed.forEach((key) => {
    if (payload[key] !== undefined) updates[key] = payload[key];
  });

  if (updates.bio !== undefined) {
    updates.bio = sanitizeText(updates.bio, { maxLength: 240, allowNewlines: true });
  }

  if (updates.portfolioVisibility !== undefined) {
    updates.portfolioVisibility = ['public', 'followers', 'friends', 'private'].includes(String(updates.portfolioVisibility))
      ? String(updates.portfolioVisibility)
      : 'public';
  }

  const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true }).lean().exec();
  return user ? formatUser(user) : null;
}

export async function deleteAdminUser(userId) {
  const user = await User.findByIdAndDelete(userId).lean().exec();
  return user ? formatUser(user) : null;
}

export async function listAdminQuizzes({ search, level, category, limit, page }) {
  const query = {};
  if (search) query.$text = { $search: sanitizeText(search, { maxLength: 80 }) };
  if (level) query.level = sanitizeText(level, { maxLength: 32 });
  if (category) query.category = sanitizeText(category, { maxLength: 80 });

  const pageNumber = toPositiveInt(page, 1, { min: 1, max: 1000 });
  const pageSize = clampLimit(limit, 100);
  const [quizzes, total, stats] = await Promise.all([
    Quiz.find(query).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize).lean().exec(),
    Quiz.countDocuments(query),
    QuizAttempt.aggregate([
      { $match: query.$text ? {} : query },
      {
        $group: {
          _id: '$quiz',
          attemptCount: { $sum: 1 },
          averagePercentage: { $avg: '$percentage' },
          bestScore: { $max: '$score' }
        }
      }
    ])
  ]);

  const statsMap = new Map(stats.map((row) => [String(row._id), row]));

  return {
    quizzes: quizzes.map((quiz) => formatQuiz(quiz, statsMap.get(String(quiz._id)) || {})),
    page: pageNumber,
    pageSize,
    total
  };
}

export async function createAdminQuiz(payload) {
  if (payload.mode === 'generated') {
    return createGeneratedQuiz(payload);
  }

  const quiz = await Quiz.create({
    title: sanitizeText(payload.title, { maxLength: 120 }),
    category: sanitizeText(payload.category, { maxLength: 80 }),
    level: sanitizeText(payload.level, { maxLength: 32 }),
    difficulty: sanitizeText(payload.difficulty, { maxLength: 32 }),
    timeLimitSeconds: toPositiveInt(payload.timeLimitSeconds, 300, { min: 60, max: 3600 }),
    aiGenerated: Boolean(payload.aiGenerated),
    questions: payload.questions || [],
    xpReward: toPositiveInt(payload.xpReward, 100, { min: 0, max: 10000 })
  });

  return quiz.toObject();
}

export async function updateAdminQuiz(quizId, payload) {
  const updates = {};
  ['title', 'category', 'level', 'difficulty', 'timeLimitSeconds', 'aiGenerated', 'questions', 'xpReward'].forEach((key) => {
    if (payload[key] !== undefined) updates[key] = payload[key];
  });

  if (updates.title !== undefined) updates.title = sanitizeText(updates.title, { maxLength: 120 });
  if (updates.category !== undefined) updates.category = sanitizeText(updates.category, { maxLength: 80 });
  if (updates.level !== undefined) updates.level = sanitizeText(updates.level, { maxLength: 32 });
  if (updates.difficulty !== undefined) updates.difficulty = sanitizeText(updates.difficulty, { maxLength: 32 });
  if (updates.timeLimitSeconds !== undefined) updates.timeLimitSeconds = toPositiveInt(updates.timeLimitSeconds, 300, { min: 60, max: 3600 });
  if (updates.xpReward !== undefined) updates.xpReward = toPositiveInt(updates.xpReward, 100, { min: 0, max: 10000 });

  const quiz = await Quiz.findByIdAndUpdate(quizId, { $set: updates }, { new: true }).lean().exec();
  return quiz ? quiz : null;
}

export async function deleteAdminQuiz(quizId) {
  const quiz = await Quiz.findByIdAndDelete(quizId).lean().exec();
  return quiz ? quiz : null;
}

export async function getAdminLeaderboard(limit = 20) {
  return getGamificationLeaderboard(limit);
}

export async function getAdminAnalytics() {
  const weekStart = startOfWeek();
  const [newUsers, trades, rewards, socialPosts, comments, alerts, quizAttempts] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: weekStart } }),
    Transaction.countDocuments({ timestamp: { $gte: weekStart }, type: { $in: ['buy', 'sell'] } }),
    Transaction.countDocuments({ timestamp: { $gte: weekStart }, type: 'reward' }),
    SocialPost.countDocuments({ createdAt: { $gte: weekStart } }),
    SocialComment.countDocuments({ createdAt: { $gte: weekStart } }),
    NotificationAlert.countDocuments({ createdAt: { $gte: weekStart } }),
    QuizAttempt.countDocuments({ createdAt: { $gte: weekStart } })
  ]);

  return {
    summary: {
      newUsers,
      trades,
      rewards,
      socialPosts,
      comments,
      alerts,
      quizAttempts
    },
    charts: {
      users: await buildTimelineCounts(User, 'createdAt', 7),
      transactions: await buildTimelineCounts(Transaction, 'timestamp', 7),
      posts: await buildTimelineCounts(SocialPost, 'createdAt', 7),
      quizAttempts: await buildTimelineCounts(QuizAttempt, 'createdAt', 7)
    }
  };
}

export async function listAdminActivity({ limit = 20 }) {
  const [transactions, activities] = await Promise.all([
    Transaction.find({}).sort({ timestamp: -1 }).limit(clampLimit(limit)).populate('user', 'username name avatar').lean().exec(),
    SocialActivity.find({}).sort({ createdAt: -1 }).limit(clampLimit(limit)).populate('actor', 'username name avatar').populate('targetUser', 'username name avatar').lean().exec()
  ]);

  return {
    transactions,
    activities: activities.map(formatActivity)
  };
}

export async function listAdminNotifications({ limit = 25 }) {
  const alerts = await NotificationAlert.find({}).sort({ createdAt: -1 }).limit(clampLimit(limit)).lean().exec();
  const recentNotifications = await User.aggregate([
    { $unwind: '$notifications' },
    { $sort: { 'notifications.createdAt': -1 } },
    { $limit: clampLimit(limit) },
    {
      $project: {
        userId: '$_id',
        username: '$username',
        name: '$name',
        notification: '$notifications'
      }
    }
  ]);

  return {
    alerts: alerts.map(formatAlert),
    notifications: recentNotifications.map((row) => ({
      id: row.notification?._id,
      userId: row.userId,
      username: row.username,
      name: row.name,
      ...row.notification
    }))
  };
}

export async function listModerationQueue({ limit = 25 }) {
  const [posts, comments] = await Promise.all([
    SocialPost.find({}).sort({ createdAt: -1 }).limit(clampLimit(limit)).populate('author', 'username name avatar isAdmin').lean().exec(),
    SocialComment.find({}).sort({ createdAt: -1 }).limit(clampLimit(limit)).populate('author', 'username name avatar isAdmin').populate('post', 'content author').lean().exec()
  ]);

  return {
    posts: posts.map(formatPost),
    comments: comments.map(formatComment)
  };
}

export async function deleteModeratedPost(postId) {
  await SocialComment.deleteMany({ post: postId });
  const deleted = await SocialPost.findByIdAndDelete(postId).lean().exec();
  return deleted ? formatPost(deleted) : null;
}

export async function deleteModeratedComment(commentId) {
  const deleted = await SocialComment.findByIdAndDelete(commentId).lean().exec();
  return deleted ? formatComment(deleted) : null;
}

export async function seedAdminStats() {
  const [userCount, quizCount, alertCount] = await Promise.all([
    User.countDocuments({}),
    Quiz.countDocuments({}),
    NotificationAlert.countDocuments({ isActive: true })
  ]);

  return { userCount, quizCount, alertCount };
}
