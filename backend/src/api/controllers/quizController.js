import asyncHandler from '../../utils/asyncHandler.js';
import {
  createQuiz,
  ensureSeedQuizzes,
  getQuizAnalytics,
  getQuizById,
  getQuizCatalogTags,
  getQuizLeaderboard,
  getQuizProgress,
  listQuizzes,
  scoreQuizAttempt
} from '../services/quizService.js';

export const getQuizzes = asyncHandler(async (req, res) => {
  await ensureSeedQuizzes();
  const quizzes = await listQuizzes({
    level: req.query.level,
    category: req.query.category,
    search: req.query.search,
    limit: req.query.limit,
    viewerId: req.user._id
  });

  res.json({ quizzes, tags: getQuizCatalogTags() });
});

export const getQuiz = asyncHandler(async (req, res) => {
  const result = await getQuizById(req.params.quizId, req.user._id);
  res.json(result);
});

export const createGeneratedQuiz = asyncHandler(async (req, res) => {
  const { level, category, focus, count, title } = req.body;
  const quiz = await createQuiz({ level, category, focus, count, title });
  res.status(201).json({ quiz });
});

export const submitQuiz = asyncHandler(async (req, res) => {
  const { quizId, answers, startedAt, completedAt, timeSpentSeconds } = req.body;
  if (!quizId) {
    res.status(400);
    throw new Error('quizId is required');
  }

  const result = await scoreQuizAttempt({
    userId: req.user._id,
    quizId,
    answers,
    startedAt,
    completedAt,
    timeSpentSeconds
  });

  res.json(result);
});

export const getQuizResults = asyncHandler(async (req, res) => {
  const result = await getQuizProgress(req.user._id, req.params.quizId || null);
  res.json(result);
});

export const getLeaderboard = asyncHandler(async (req, res) => {
  const leaderboard = await getQuizLeaderboard({ quizId: req.query.quizId, limit: req.query.limit });
  res.json({ leaderboard });
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await getQuizAnalytics({ quizId: req.query.quizId, userId: req.user._id });
  res.json(analytics);
});
