import asyncHandler from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { explainLesson, generateLessonExamples, summarizeLesson } from '../services/learnAiService.js';

function requireLessonId(body) {
  if (!body?.lessonId) {
    throw new AppError('lessonId is required', 400);
  }
}

export const explain = asyncHandler(async (req, res) => {
  requireLessonId(req.body);
  const result = await explainLesson({ userId: req.user._id, lessonId: req.body.lessonId, question: req.body.question || req.body.prompt || '' });
  res.json(result);
});

export const summarize = asyncHandler(async (req, res) => {
  requireLessonId(req.body);
  const result = await summarizeLesson({ userId: req.user._id, lessonId: req.body.lessonId, question: req.body.question || req.body.prompt || '' });
  res.json(result);
});

export const examples = asyncHandler(async (req, res) => {
  requireLessonId(req.body);
  const result = await generateLessonExamples({ userId: req.user._id, lessonId: req.body.lessonId, question: req.body.question || req.body.prompt || '' });
  res.json(result);
});