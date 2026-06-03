import mongoose from 'mongoose';
import Achievement from '../../models/Achievement.js';
import LearningProgress from '../../models/LearningProgress.js';
import QuizAttempt from '../../models/QuizAttempt.js';
import User from '../../models/User.js';
import { listLearningCourses } from './learnService.js';
import { getPortfolioAnalytics } from './portfolioAnalyticsService.js';
import { generateGeminiText } from './integrations/geminiService.js';

const LEARNING_SOURCE_TYPES = ['learning_lesson', 'learning_course'];
const CACHE_TTL_MS = 45_000;
const AI_CACHE_TTL_MS = 5 * 60_000;

const cache = new Map();
const aiCache = new Map();

function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function normalizeLevel(value) {
  const level = String(value || '').toLowerCase();
  if (level === 'easy') return 'beginner';
  if (level === 'medium') return 'intermediate';
  if (level === 'hard') return 'advanced';
  if (['beginner', 'intermediate', 'advanced'].includes(level)) return level;
  return 'beginner';
}

function normalizeDifficulty(value) {
  return ['beginner', 'intermediate', 'advanced'].includes(String(value || '').toLowerCase()) ? String(value).toLowerCase() : 'beginner';
}

function dayKey(date) {
  return new Date(date || Date.now()).toISOString().slice(0, 10);
}

function buildEmptySeries(days = 14, labelPrefix = '') {
  const entries = [];
  const today = new Date();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    const label = labelPrefix ? `${labelPrefix} ${date.getMonth() + 1}/${date.getDate()}` : `${date.getMonth() + 1}/${date.getDate()}`;
    entries.push({ key: dayKey(date), label });
  }

  return entries;
}

function levelFromScore(score) {
  if (score < 36) return 'beginner';
  if (score < 72) return 'intermediate';
  return 'advanced';
}

function explanationStyleForLevel(level) {
  if (level === 'beginner') return 'simplified';
  if (level === 'advanced') return 'deep-dive';
  return 'balanced';
}

function quizFocusForLevel(level) {
  if (level === 'beginner') return 'multiple choice with guided explanations';
  if (level === 'advanced') return 'scenario-heavy with deeper market context';
  return 'mixed questions with practical tradeoffs';
}

function portfolioBehaviorScore(portfolioAnalytics) {
  const risk = portfolioAnalytics?.risk || {};
  const diversificationScore = clamp(risk.diversificationScore || 50);
  const concentrationScore = clamp(risk.concentrationScore || 50);
  const drawdownScore = clamp(risk.drawdownScore || 50);
  const volatilityScore = clamp(risk.volatilityScore || 50);

  return round((diversificationScore * 0.35) + ((100 - concentrationScore) * 0.25) + ((100 - drawdownScore) * 0.2) + ((100 - volatilityScore) * 0.2), 2);
}

function buildAttemptTopicMap(attempts) {
  return attempts.reduce((map, attempt) => {
    const courseId = String(attempt.quiz?.sourceCourse || '');
    const lessonId = String(attempt.quiz?.sourceLesson || '');
    const topicKey = courseId || lessonId || String(attempt.quiz?.category || 'general');
    if (!map.has(topicKey)) map.set(topicKey, []);
    map.get(topicKey).push(attempt);
    return map;
  }, new Map());
}

function calculateCourseTopicStats(courseCards, attemptTopicMap) {
  return courseCards.map((course) => {
    const attempts = attemptTopicMap.get(String(course.id)) || [];
    const attemptCount = attempts.length;
    const quizAccuracy = attemptCount ? round(attempts.reduce((sum, attempt) => sum + Number(attempt.percentage || 0), 0) / attemptCount, 2) : null;
    const quizXp = attempts.reduce((sum, attempt) => sum + Number(attempt.xpAwarded || 0), 0);
    const completion = clamp(course.completionPercentage || 0);
    const lessonCompletion = clamp(course.completedLessons && course.lessonCount ? (course.completedLessons / course.lessonCount) * 100 : completion);
    const learningScore = round((completion * 0.45) + ((quizAccuracy ?? completion) * 0.4) + (clamp(quizXp / Math.max(1, course.lessonCount * 80) * 100) * 0.15), 2);

    return {
      id: String(course.id),
      title: course.title,
      category: course.category,
      difficulty: normalizeLevel(course.difficulty),
      completion,
      lessonCompletion,
      quizAccuracy: quizAccuracy ?? 0,
      quizAttempts: attemptCount,
      quizXp,
      totalLessons: course.lessonCount || 0,
      completedLessons: course.completedLessons || 0,
      earnedXp: course.earnedXp || 0,
      learningScore,
      lastAccessedAt: course.lessons?.reduce((latest, lesson) => {
        const timestamp = lesson.lastAccessedAt ? new Date(lesson.lastAccessedAt).getTime() : 0;
        return timestamp > latest ? timestamp : latest;
      }, 0) || 0
    };
  });
}

function scoreTopicPriority(topic, profile) {
  const completionGap = 100 - clamp(topic.completion);
  const accuracyGap = 100 - clamp(topic.quizAccuracy || topic.completion);
  const profileBias = profile.level === 'beginner'
    ? (topic.difficulty === 'beginner' ? 8 : topic.difficulty === 'advanced' ? -10 : 4)
    : profile.level === 'advanced'
      ? (topic.difficulty === 'advanced' ? 10 : topic.difficulty === 'beginner' ? -5 : 4)
      : 6;

  return round((completionGap * 0.45) + (accuracyGap * 0.4) + profileBias, 2);
}

function buildLessonRecommendations(courseCards, topicStats, profile, portfolioAnalytics) {
  const weakTopicIds = new Set(topicStats.filter((topic) => topic.learningScore < 60).map((topic) => topic.id));
  const highRiskPortfolio = clamp(portfolioAnalytics?.risk?.riskScore || 0) >= 60;
  const highDiversification = clamp(portfolioAnalytics?.risk?.diversificationScore || 0) >= 65;

  const candidates = courseCards.flatMap((course) => {
    const topic = topicStats.find((item) => item.id === course.id) || null;
    return (course.lessons || []).map((lesson) => {
      const completion = clamp(lesson.completionPercentage || 0);
      if (completion >= 100) return null;

      const lessonDifficulty = normalizeLevel(lesson.difficulty);
      const difficultyWeight = profile.level === 'beginner'
        ? (lessonDifficulty === 'beginner' ? 16 : lessonDifficulty === 'intermediate' ? 8 : -8)
        : profile.level === 'advanced'
          ? (lessonDifficulty === 'advanced' ? 18 : lessonDifficulty === 'intermediate' ? 8 : -4)
          : (lessonDifficulty === 'intermediate' ? 10 : 6);

      const weakBoost = weakTopicIds.has(course.id) ? 14 : 0;
      const portfolioBoost = highRiskPortfolio && /risk|psychology|technical/i.test(String(course.category || '')) ? 12 : 0;
      const diversificationBoost = highDiversification && /deFi|market|analysis/i.test(String(course.category || '')) ? 8 : 0;
      const lessonGap = 100 - completion;
      const score = round((lessonGap * 0.5) + difficultyWeight + weakBoost + portfolioBoost + diversificationBoost, 2);

      return {
        id: lesson.id,
        courseId: course.id,
        courseTitle: course.title,
        title: lesson.title,
        slug: lesson.slug,
        description: lesson.description,
        difficulty: lesson.difficulty,
        completionPercentage: completion,
        estimatedDurationMinutes: lesson.estimatedDurationMinutes,
        estimatedReadingMinutes: lesson.estimatedReadingMinutes,
        xpReward: lesson.xpReward,
        score,
        recommendedQuizLevel: profile.level,
        reason:
          profile.level === 'beginner'
            ? 'Simplified review to reinforce the foundations.'
            : profile.level === 'advanced'
              ? 'Deep-dive lesson selected to stretch your current skill band.'
              : 'Balanced practice to move you toward the next skill tier.'
      };
    }).filter(Boolean);
  });

  return candidates.sort((left, right) => right.score - left.score).slice(0, 8).map((item) => ({
    ...item,
    reason: weakTopicIds.has(item.courseId)
      ? `You are underweight on ${item.courseTitle}. ${item.reason}`
      : item.reason
  }));
}

function buildTimelineSeries(days = 14) {
  return buildEmptySeries(days);
}

function aggregateDailyStats(progressDocs, attempts, days = 14) {
  const series = buildTimelineSeries(days);
  const map = new Map(series.map((entry) => [entry.key, { ...entry, xp: 0, completedLessons: 0, completionSamples: [], quizAccuracySamples: [] }]));

  progressDocs.forEach((progress) => {
    const key = dayKey(progress.completedAt || progress.updatedAt || progress.lastAccessedAt || progress.createdAt);
    const entry = map.get(key);
    if (!entry) return;
    entry.xp += Number(progress.xpEarned || 0);
    entry.completionSamples.push(Number(progress.completionPercentage || 0));
    if (progress.completed) entry.completedLessons += 1;
  });

  attempts.forEach((attempt) => {
    const key = dayKey(attempt.completedAt || attempt.createdAt);
    const entry = map.get(key);
    if (!entry) return;
    entry.xp += Number(attempt.xpAwarded || 0);
    entry.quizAccuracySamples.push(Number(attempt.percentage || 0));
  });

  const completionGraph = [];
  const xpHistory = [];

  for (const entry of map.values()) {
    const completionAverage = entry.completionSamples.length
      ? round(entry.completionSamples.reduce((sum, value) => sum + value, 0) / entry.completionSamples.length, 2)
      : 0;
    const accuracyAverage = entry.quizAccuracySamples.length
      ? round(entry.quizAccuracySamples.reduce((sum, value) => sum + value, 0) / entry.quizAccuracySamples.length, 2)
      : 0;

    completionGraph.push({
      label: entry.label,
      completedLessons: entry.completedLessons,
      averageCompletion: completionAverage,
      quizAccuracy: accuracyAverage
    });

    xpHistory.push({
      label: entry.label,
      xp: round(entry.xp, 2)
    });
  }

  return { completionGraph, xpHistory };
}

async function getAiCoachNote({ profile, weakTopics, strongTopics, recommendations }) {
  const cacheKey = `${profile.userId}:${profile.level}:${profile.score}:${recommendations.slice(0, 3).map((item) => item.id).join(',')}`;
  const cached = aiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < AI_CACHE_TTL_MS) {
    return cached.value;
  }

  const prompt = [
    'Return valid JSON only with keys: summary, whyThisLevel, nextStep, focusTopics, quickPlan.',
    'You are creating a personalized learning recommendation for a crypto simulator learner.',
    `Learner level: ${profile.level}`,
    `Learner score: ${profile.score}`,
    `XP: ${profile.xp}`,
    `Streak: ${profile.streak}`,
    `Quiz accuracy: ${profile.quizAccuracy}`,
    `Portfolio risk: ${profile.portfolioRisk}`,
    `Weak topics: ${weakTopics.map((topic) => topic.title).join(', ') || 'none'}`,
    `Strong topics: ${strongTopics.map((topic) => topic.title).join(', ') || 'none'}`,
    `Recommended lessons: ${recommendations.map((lesson) => `${lesson.title} (${lesson.courseTitle})`).join(' | ')}`
  ].join('\n');

  const fallback = {
    summary: `Your current focus should be ${profile.level} content with a ${profile.explanationStyle} explanation style.`,
    whyThisLevel: `This matches your XP, quiz accuracy, streak, progress, and portfolio behavior.`,
    nextStep: recommendations[0]
      ? `Start with ${recommendations[0].title} in ${recommendations[0].courseTitle}.`
      : 'Continue with the next incomplete lesson in your learning path.',
    focusTopics: weakTopics.slice(0, 3).map((topic) => topic.title),
    quickPlan: [
      'Review one lesson',
      'Take one adaptive quiz',
      'Check progress after submission'
    ]
  };

  try {
    const response = await generateGeminiText({
      prompt,
      systemInstruction: 'You are a personalized learning strategist for a premium crypto simulator. Return JSON only.',
      temperature: 0.35,
      maxOutputTokens: 500
    });

    const raw = String(response.content || '').replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(raw.slice(raw.indexOf('{') >= 0 ? raw.indexOf('{') : 0, raw.lastIndexOf('}') + 1 || undefined));
    const value = {
      summary: String(parsed.summary || fallback.summary),
      whyThisLevel: String(parsed.whyThisLevel || fallback.whyThisLevel),
      nextStep: String(parsed.nextStep || fallback.nextStep),
      focusTopics: Array.isArray(parsed.focusTopics) ? parsed.focusTopics.slice(0, 4).map((item) => String(item)) : fallback.focusTopics,
      quickPlan: Array.isArray(parsed.quickPlan) ? parsed.quickPlan.slice(0, 4).map((item) => String(item)) : fallback.quickPlan
    };

    aiCache.set(cacheKey, { timestamp: Date.now(), value });
    return value;
  } catch {
    aiCache.set(cacheKey, { timestamp: Date.now(), value: fallback });
    return fallback;
  }
}

async function buildLearningLeaderboard(courseCards, progressDocs, attempts, currentUserId) {
  const progressRows = await LearningProgress.aggregate([
    {
      $group: {
        _id: '$user',
        learningXp: { $sum: '$xpEarned' },
        completedLessons: { $sum: { $cond: ['$completed', 1, 0] } },
        averageCompletion: { $avg: '$completionPercentage' }
      }
    }
  ]);

  const quizRows = await QuizAttempt.aggregate([
    {
      $lookup: {
        from: 'quizzes',
        localField: 'quiz',
        foreignField: '_id',
        as: 'quiz'
      }
    },
    { $unwind: '$quiz' },
    { $match: { 'quiz.sourceType': { $in: LEARNING_SOURCE_TYPES } } },
    {
      $group: {
        _id: '$user',
        quizXp: { $sum: '$xpAwarded' },
        quizAttempts: { $sum: 1 },
        quizAverage: { $avg: '$percentage' },
        quizPasses: { $sum: { $cond: ['$isPassed', 1, 0] } }
      }
    }
  ]);

  const combined = new Map();

  progressRows.forEach((row) => {
    combined.set(String(row._id), {
      userId: String(row._id),
      learningXp: Number(row.learningXp || 0),
      completedLessons: Number(row.completedLessons || 0),
      averageCompletion: round(row.averageCompletion || 0, 2),
      quizXp: 0,
      quizAttempts: 0,
      quizAverage: 0,
      quizPasses: 0
    });
  });

  quizRows.forEach((row) => {
    const current = combined.get(String(row._id)) || {
      userId: String(row._id),
      learningXp: 0,
      completedLessons: 0,
      averageCompletion: 0,
      quizXp: 0,
      quizAttempts: 0,
      quizAverage: 0,
      quizPasses: 0
    };

    current.quizXp = Number(row.quizXp || 0);
    current.quizAttempts = Number(row.quizAttempts || 0);
    current.quizAverage = round(row.quizAverage || 0, 2);
    current.quizPasses = Number(row.quizPasses || 0);
    combined.set(String(row._id), current);
  });

  const userIds = [...combined.keys()].map((value) => new mongoose.Types.ObjectId(value));
  if (!userIds.length) {
    return { rows: [], currentUserRank: null, currentUserScore: 0 };
  }

  const users = await User.find({ _id: { $in: userIds } }).select('username name avatar').lean().exec();
  const userMap = new Map(users.map((user) => [String(user._id), user]));

  const rows = [...combined.values()].map((row) => {
    const user = userMap.get(row.userId) || {};
    const learningScore = round((row.learningXp * 0.45) + (row.quizXp * 0.45) + (row.completedLessons * 20) + (row.averageCompletion * 0.6) + (row.quizAverage * 0.4), 2);
    return {
      userId: row.userId,
      username: user.username || 'learner',
      name: user.name || user.username || 'Learner',
      avatar: user.avatar || '',
      learningXp: round(row.learningXp, 2),
      quizXp: round(row.quizXp, 2),
      completedLessons: row.completedLessons,
      averageCompletion: row.averageCompletion,
      quizAttempts: row.quizAttempts,
      quizAverage: row.quizAverage,
      quizPasses: row.quizPasses,
      learningScore
    };
  }).sort((left, right) => right.learningScore - left.learningScore).slice(0, 10)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const currentUserRank = rows.find((row) => String(row.userId) === String(currentUserId))?.rank || null;
  const currentUserScore = rows.find((row) => String(row.userId) === String(currentUserId))?.learningScore || 0;

  return { rows, currentUserRank, currentUserScore };
}

async function buildAdaptiveProfile(userId, courseCards, progressDocs, attempts, portfolioAnalytics) {
  const user = await User.findById(userId).select('xp level streak virtualBalance referralCount badges').lean().exec();
  if (!user) {
    throw new Error('User not found');
  }

  const completedLessons = progressDocs.filter((progress) => progress.completed).length;
  const completionRate = courseCards.length
    ? round(courseCards.reduce((sum, course) => sum + Number(course.completionPercentage || 0), 0) / courseCards.length, 2)
    : 0;

  const learningAttempts = attempts.filter((attempt) => LEARNING_SOURCE_TYPES.includes(String(attempt.quiz?.sourceType || '')));
  const averageQuizAccuracy = learningAttempts.length
    ? round(learningAttempts.reduce((sum, attempt) => sum + Number(attempt.percentage || 0), 0) / learningAttempts.length, 2)
    : 50;
  const recentAttempts = learningAttempts.slice(0, 10);
  const recentAccuracy = recentAttempts.length
    ? round(recentAttempts.reduce((sum, attempt) => sum + Number(attempt.percentage || 0), 0) / recentAttempts.length, 2)
    : averageQuizAccuracy;

  const portfolioScore = portfolioBehaviorScore(portfolioAnalytics);
  const xpScore = clamp((Number(user.xp || 0) / 5000) * 100);
  const streakScore = clamp((Number(user.streak || 0) / 14) * 100);
  const completionScore = clamp(completionRate);
  const historyScore = clamp((completedLessons / Math.max(1, progressDocs.length)) * 100);
  const quizScore = clamp(averageQuizAccuracy);

  const compositeScore = round((xpScore * 0.22) + (quizScore * 0.28) + (streakScore * 0.12) + (completionScore * 0.2) + (portfolioScore * 0.18), 2);
  const level = levelFromScore(compositeScore);

  return {
    userId: String(user._id),
    level,
    score: compositeScore,
    explanationStyle: explanationStyleForLevel(level),
    quizFocus: quizFocusForLevel(level),
    lessonDepth: level === 'beginner' ? 'simplified lessons' : level === 'advanced' ? 'advanced market analysis' : 'balanced lessons',
    quizLevel: level,
    factors: {
      xp: round(xpScore, 2),
      quizAccuracy: round(quizScore, 2),
      recentAccuracy: round(recentAccuracy, 2),
      streak: round(streakScore, 2),
      completion: round(completionScore, 2),
      history: round(historyScore, 2),
      portfolioBehavior: round(portfolioScore, 2)
    },
    profileNotes: [
      level === 'beginner' ? 'Keep explanations simple and reinforce fundamentals.' : null,
      level === 'advanced' ? 'Push scenario-based content and deeper market analysis.' : null,
      portfolioScore < 45 ? 'Prioritize risk management due to portfolio behavior.' : null
    ].filter(Boolean)
  };
}

async function buildAchievementSnapshot(userId) {
  const user = await User.findById(userId).select('badges achievements').lean().exec();
  if (!user) return [];

  const badgeIds = [...new Set([...(user.badges || []), ...(user.achievements || [])].map((value) => String(value)))];
  if (!badgeIds.length) return [];

  const badges = await Achievement.find({ _id: { $in: badgeIds } }).lean().exec();
  return badges
    .filter((badge) => String(badge.key || '').startsWith('learn_') || String(badge.key || '').startsWith('quiz_'))
    .map((badge) => ({
      id: String(badge._id),
      key: badge.key,
      title: badge.title,
      description: badge.description,
      badgeImage: badge.badgeImage,
      xpReward: badge.xpReward
    }));
}

async function loadAnalytics(userId, options = {}) {
  const [courses, progressDocs, attempts, portfolioAnalytics] = await Promise.all([
    listLearningCourses(userId),
    LearningProgress.find({ user: userId }).lean().exec(),
    QuizAttempt.find({ user: userId }).sort({ createdAt: -1 }).limit(300).populate('quiz', 'title category level difficulty sourceType sourceCourse sourceLesson aiGenerated').lean().exec(),
    getPortfolioAnalytics(userId, { period: options.period || '30d', skipAIInsights: true }).catch(() => ({ risk: {}, summary: {}, trading: {}, historical: [], allocation: [], performance: [], tradeTimeline: [] }))
  ]);

  const currentUser = await User.findById(userId).select('xp level streak').lean().exec();
  if (!currentUser) {
    throw new Error('User not found');
  }

  const learningCourses = courses.courses || [];
  const learningAttempts = attempts.filter((attempt) => LEARNING_SOURCE_TYPES.includes(String(attempt.quiz?.sourceType || '')));
  const attemptTopicMap = buildAttemptTopicMap(learningAttempts);
  const topicStats = calculateCourseTopicStats(learningCourses, attemptTopicMap);
  const adaptiveProfile = await buildAdaptiveProfile(userId, learningCourses, progressDocs, learningAttempts, portfolioAnalytics);
  const recommendedNextLessons = buildLessonRecommendations(learningCourses, topicStats, adaptiveProfile, portfolioAnalytics);
  const weakTopics = [...topicStats]
    .sort((left, right) => scoreTopicPriority(left, adaptiveProfile) - scoreTopicPriority(right, adaptiveProfile))
    .filter((topic) => topic.learningScore < 75)
    .slice(0, 5)
    .map((topic) => ({
      id: topic.id,
      title: topic.title,
      category: topic.category,
      learningScore: topic.learningScore,
      completion: topic.completion,
      quizAccuracy: topic.quizAccuracy,
      reason:
        topic.completion < 50
          ? 'Completion is still low.'
          : topic.quizAccuracy < 70
            ? 'Quiz accuracy needs work.'
            : 'This topic deserves another pass.'
    }));
  const strongTopics = [...topicStats]
    .sort((left, right) => right.learningScore - left.learningScore)
    .filter((topic) => topic.learningScore >= 75)
    .slice(0, 5)
    .map((topic) => ({
      id: topic.id,
      title: topic.title,
      category: topic.category,
      learningScore: topic.learningScore,
      completion: topic.completion,
      quizAccuracy: topic.quizAccuracy,
      reason: 'Strong completion and accuracy signal.'
    }));

  const { completionGraph, xpHistory } = aggregateDailyStats(progressDocs, learningAttempts, 14);
  const learningAccuracy = learningAttempts.length ? round(learningAttempts.reduce((sum, attempt) => sum + Number(attempt.percentage || 0), 0) / learningAttempts.length, 2) : 0;
  const recentAccuracy = learningAttempts.slice(0, 5).length
    ? round(learningAttempts.slice(0, 5).reduce((sum, attempt) => sum + Number(attempt.percentage || 0), 0) / Math.max(1, learningAttempts.slice(0, 5).length), 2)
    : 0;
  const totalLearningXp = progressDocs.reduce((sum, progress) => sum + Number(progress.xpEarned || 0), 0) + learningAttempts.reduce((sum, attempt) => sum + Number(attempt.xpAwarded || 0), 0);
  const achievements = await buildAchievementSnapshot(userId);
  const leaderboard = await buildLearningLeaderboard(learningCourses, progressDocs, learningAttempts, userId);
  const aiRecommendation = await getAiCoachNote({ profile: adaptiveProfile, weakTopics, strongTopics, recommendations: recommendedNextLessons });

  const courseCompletion = learningCourses.length
    ? round(learningCourses.reduce((sum, course) => sum + Number(course.completionPercentage || 0), 0) / learningCourses.length, 2)
    : 0;

  const currentProfile = {
    level: normalizeLevel(currentUser.level),
    xp: Number(currentUser.xp || 0),
    streak: Number(currentUser.streak || 0),
    completionRate: courseCompletion,
    quizAccuracy: learningAccuracy,
    recentAccuracy,
    portfolioRisk: clamp(portfolioAnalytics?.risk?.riskScore || 0),
    adaptiveLevel: adaptiveProfile.level,
    adaptiveScore: adaptiveProfile.score,
    explanationStyle: adaptiveProfile.explanationStyle,
    quizFocus: adaptiveProfile.quizFocus
  };

  return {
    profile: currentProfile,
    adaptive: adaptiveProfile,
    stats: {
      totalCourses: learningCourses.length,
      totalLessons: learningCourses.reduce((sum, course) => sum + Number(course.lessonCount || 0), 0),
      completedLessons: learningCourses.reduce((sum, course) => sum + Number(course.completedLessons || 0), 0),
      totalXpEarned: totalLearningXp,
      courseCompletion,
      streak: currentProfile.streak,
      quizAccuracy: learningAccuracy,
      recentAccuracy,
      portfolioRisk: currentProfile.portfolioRisk,
      quizAttempts: learningAttempts.length,
      completedCourses: learningCourses.filter((course) => Number(course.completionPercentage || 0) >= 100).length
    },
    weakTopics,
    strongTopics,
    completionGraph,
    xpHistory,
    recommendedNextLessons,
    achievements,
    leaderboard,
    personalizedRecommendation: aiRecommendation,
    updatedAt: new Date().toISOString()
  };
}

export async function getLearningAdaptiveProfile(userId, options = {}) {
  const cacheKey = `${String(userId)}:profile:${options.period || '30d'}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.value.profile;
  }

  const analytics = await loadAnalytics(userId, options);
  const value = analytics.profile;
  cache.set(cacheKey, { timestamp: Date.now(), value: analytics });
  return value;
}

export async function getLearningIntelligence(userId, options = {}) {
  const cacheKey = `${String(userId)}:analytics:${options.period || '30d'}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.value;
  }

  const analytics = await loadAnalytics(userId, options);
  cache.set(cacheKey, { timestamp: Date.now(), value: analytics });
  return analytics;
}

export async function getLearningRecommendations(userId, options = {}) {
  const analytics = await getLearningIntelligence(userId, options);
  return {
    profile: analytics.profile,
    adaptive: analytics.adaptive,
    weakTopics: analytics.weakTopics,
    strongTopics: analytics.strongTopics,
    recommendedNextLessons: analytics.recommendedNextLessons,
    personalizedRecommendation: analytics.personalizedRecommendation,
    achievements: analytics.achievements,
    leaderboard: analytics.leaderboard,
    updatedAt: analytics.updatedAt
  };
}

export function invalidateLearningAnalyticsCache(userId = null) {
  if (userId) {
    const key = String(userId);
    for (const cacheKey of [...cache.keys()]) {
      if (cacheKey.startsWith(`${key}:`)) {
        cache.delete(cacheKey);
      }
    }

    for (const aiKey of [...aiCache.keys()]) {
      if (aiKey.startsWith(`${key}:`)) {
        aiCache.delete(aiKey);
      }
    }
    return;
  }

  cache.clear();
  aiCache.clear();
}