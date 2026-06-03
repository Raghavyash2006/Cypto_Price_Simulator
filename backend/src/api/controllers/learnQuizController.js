import asyncHandler from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import {
  generateLearningQuiz,
  getLearningQuizHistory,
  submitLearningQuiz
} from '../services/learnQuizService.js';

export const generateQuiz = asyncHandler(async (req, res) => {
  const quiz = await generateLearningQuiz({
    lessonId: req.body.lessonId,
    courseId: req.body.courseId,
    level: req.body.level,
    count: req.body.count,
    title: req.body.title
  });

  res.status(201).json({ quiz });
});

export const submitQuiz = asyncHandler(async (req, res) => {
  const { quizId, answers, startedAt, completedAt, timeSpentSeconds } = req.body;

  if (!quizId) {
    throw new AppError('quizId is required', 400);
  }

  const result = await submitLearningQuiz({
    userId: req.user._id,
    quizId,
    answers,
    startedAt,
    completedAt,
    timeSpentSeconds
  });

  res.json(result);
});

export const getQuizHistory = asyncHandler(async (req, res) => {
  const history = await getLearningQuizHistory({
    userId: req.user._id,
    lessonId: req.query.lessonId,
    courseId: req.query.courseId,
    limit: req.query.limit
  });

  res.json(history);
});