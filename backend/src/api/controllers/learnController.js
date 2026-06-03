import asyncHandler from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import {
  getLegacyLearningModules,
  getLearningCourse,
  getLearningLesson,
  listLearningCourses,
  updateLearningProgress
} from '../services/learnService.js';
import {
  getLearningAdaptiveProfile,
  getLearningIntelligence,
  getLearningRecommendations
} from '../services/learnIntelligenceService.js';

export const getCourses = asyncHandler(async (req, res) => {
  const result = await listLearningCourses(req.user._id);
  res.json(result);
});

export const getCourse = asyncHandler(async (req, res) => {
  const [result, adaptive] = await Promise.all([
    getLearningCourse(req.params.id, req.user._id),
    getLearningAdaptiveProfile(req.user._id)
  ]);
  res.json({ ...result, adaptive });
});

export const getLesson = asyncHandler(async (req, res) => {
  const [result, adaptive] = await Promise.all([
    getLearningLesson(req.params.id, req.user._id),
    getLearningAdaptiveProfile(req.user._id)
  ]);
  res.json({ ...result, adaptive });
});

export const postProgress = asyncHandler(async (req, res) => {
  if (!req.body?.lessonId) {
    throw new AppError('lessonId is required', 400);
  }

  const result = await updateLearningProgress(req.user._id, req.body);
  res.json(result);
});

export const getModules = asyncHandler(async (req, res) => {
  const result = await listLearningCourses(req.user._id);
  res.json({ modules: getLegacyLearningModules(result.courses) });
});

export const getRecommendations = asyncHandler(async (req, res) => {
  const recommendations = await getLearningRecommendations(req.user._id, { period: req.query.period });
  res.json(recommendations);
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await getLearningIntelligence(req.user._id, { period: req.query.period });
  res.json(analytics);
});