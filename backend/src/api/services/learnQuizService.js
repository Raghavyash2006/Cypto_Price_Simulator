import mongoose from 'mongoose';
import Quiz from '../../models/Quiz.js';
import QuizAttempt from '../../models/QuizAttempt.js';
import User from '../../models/User.js';
import Course from '../../models/Course.js';
import Lesson from '../../models/Lesson.js';
import { AppError } from '../../utils/AppError.js';
import { generateGeminiText } from './integrations/geminiService.js';
import { ensureLearningCatalogSeeded } from './learnService.js';
import { scoreQuizAttempt } from './quizService.js';
import { unlockEligibleAchievements } from './gamificationService.js';

const LEVELS = ['beginner', 'intermediate', 'advanced'];
const QUESTION_TYPES = ['multiple_choice', 'true_false', 'scenario'];

function normalizeLevel(value, fallback = 'beginner') {
  const level = String(value || fallback || 'beginner').toLowerCase();
  return LEVELS.includes(level) ? level : fallback;
}

function normalizeCount(value, fallback = 5) {
  const count = Number.parseInt(value, 10);
  if (Number.isNaN(count)) return fallback;
  return Math.min(Math.max(count, 3), 10);
}

function normalizeText(value, max = 220) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function getQuestionDifficulty(level) {
  return level === 'advanced' ? 'hard' : level === 'intermediate' ? 'medium' : 'easy';
}

function quizDifficultyFromLevel(level) {
  if (level === 'advanced') return 'hard';
  if (level === 'intermediate') return 'medium';
  return 'easy';
}

function cloneId(value) {
  return value ? String(value) : null;
}

function serializeQuestion(question) {
  return {
    id: cloneId(question._id),
    question: question.question,
    questionType: question.questionType || 'multiple_choice',
    topic: question.topic || '',
    difficulty: question.difficulty || getQuestionDifficulty(question.level || 'beginner'),
    options: question.options || [],
    hint: question.hint || '',
    multiSelect: Boolean(question.multiSelect)
  };
}

function serializeQuiz(quiz) {
  if (!quiz) return null;

  return {
    id: cloneId(quiz._id),
    title: quiz.title,
    category: quiz.category,
    level: quiz.level,
    difficulty: quiz.difficulty,
    timeLimitSeconds: quiz.timeLimitSeconds,
    aiGenerated: Boolean(quiz.aiGenerated),
    sourceType: quiz.sourceType || 'general',
    sourceLesson: cloneId(quiz.sourceLesson),
    sourceCourse: cloneId(quiz.sourceCourse),
    contextSummary: quiz.contextSummary || '',
    xpReward: quiz.xpReward || 0,
    questionCount: (quiz.questions || []).length,
    createdAt: quiz.createdAt,
    questions: (quiz.questions || []).map(serializeQuestion)
  };
}

function getContextLabel({ lesson, course }) {
  if (lesson) return lesson.title;
  if (course) return course.title;
  return 'Crypto fundamentals';
}

function getContextSummary({ lesson, course }) {
  const fragments = [];

  if (lesson) {
    fragments.push(lesson.summary || lesson.description || lesson.content || '');
    if (Array.isArray(lesson.keyConcepts) && lesson.keyConcepts.length) {
      fragments.push(`Key concepts: ${lesson.keyConcepts.join(', ')}`);
    }
    if (Array.isArray(lesson.takeaways) && lesson.takeaways.length) {
      fragments.push(`Takeaways: ${lesson.takeaways.join('; ')}`);
    }
  }

  if (course) {
    fragments.push(course.description || '');
    if (Array.isArray(course.lessons) && course.lessons.length) {
      fragments.push(`Lesson outline: ${course.lessons.map((item) => item.title).join(' | ')}`);
    }
  }

  return normalizeText(fragments.filter(Boolean).join(' '), 900);
}

function getPromptContext({ lesson, course, level, count, title }) {
  const contextBits = [];

  if (lesson) {
    contextBits.push(`Lesson title: ${lesson.title}`);
    contextBits.push(`Lesson difficulty: ${lesson.difficulty}`);
    contextBits.push(`Lesson summary: ${lesson.summary || lesson.description || ''}`);
    if (lesson.content) contextBits.push(`Lesson content: ${normalizeText(lesson.content, 2000)}`);
    if (Array.isArray(lesson.keyConcepts) && lesson.keyConcepts.length) contextBits.push(`Key concepts: ${lesson.keyConcepts.join(', ')}`);
    if (Array.isArray(lesson.takeaways) && lesson.takeaways.length) contextBits.push(`Takeaways: ${lesson.takeaways.join('; ')}`);
  }

  if (course) {
    contextBits.push(`Course title: ${course.title}`);
    contextBits.push(`Course difficulty: ${course.difficulty}`);
    contextBits.push(`Course description: ${course.description || ''}`);
    if (Array.isArray(course.lessons) && course.lessons.length) {
      contextBits.push(`Course lesson titles: ${course.lessons.map((item) => item.title).join(', ')}`);
    }
  }

  if (!lesson && !course) {
    contextBits.push('General crypto learning quiz covering wallet safety, blockchain basics, risk management, and trading psychology.');
  }

  return [
    'Generate a strict JSON object for a crypto learning quiz.',
    'Return only valid JSON. No markdown, no code fences, no commentary.',
    'The JSON shape must be:',
    '{ title, category, level, difficulty, timeLimitSeconds, xpReward, contextSummary, questions: [{ questionType, question, options, correctAnswers, explanation, hint }] }',
    'Question types must be one of multiple_choice, true_false, or scenario.',
    'Use 4 options for multiple_choice and scenario questions, and exactly 2 options for true_false questions.',
    'correctAnswers must be an array of zero-based option indexes.',
    'At least one question should be scenario-based when the level is intermediate or advanced.',
    'Explanations should be concise, educational, and specific to the provided context.',
    `Title guidance: ${title || getContextLabel({ lesson, course })} quiz`,
    `Target level: ${level}`,
    `Question count: ${count}`,
    'Context follows below.',
    ...contextBits
  ].join('\n');
}

function extractJsonObject(content) {
  const raw = String(content || '').trim();
  if (!raw) return null;

  const fenced = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();

  const candidates = [fenced];
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start >= 0 && end > start) {
    candidates.push(fenced.slice(start, end + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next candidate
    }
  }

  return null;
}

function normalizeQuestion(rawQuestion, fallbackIndex, level) {
  const questionType = QUESTION_TYPES.includes(String(rawQuestion?.questionType || '').toLowerCase())
    ? String(rawQuestion.questionType).toLowerCase()
    : ((Array.isArray(rawQuestion?.options) && rawQuestion.options.length === 2) ? 'true_false' : 'multiple_choice');

  const difficulty = QUESTION_TYPES.includes(String(rawQuestion?.questionType || '').toLowerCase()) ? getQuestionDifficulty(level) : getQuestionDifficulty(level);
  const topic = normalizeText(rawQuestion?.topic || rawQuestion?.category || 'crypto learning', 80);

  const options = Array.isArray(rawQuestion?.options)
    ? rawQuestion.options.map((option) => normalizeText(option, 140)).filter(Boolean)
    : [];

  const correctAnswers = Array.isArray(rawQuestion?.correctAnswers)
    ? [...new Set(rawQuestion.correctAnswers.map((value) => Number.parseInt(value, 10)).filter((value) => Number.isInteger(value) && value >= 0))]
    : [];

  const fallbackOptions = questionType === 'true_false'
    ? ['True', 'False']
    : [
        'It is the safest and most accurate answer.',
        'It is unrelated to the lesson.',
        'It only applies to short-term hype.',
        'It should be ignored entirely.'
      ];

  const resolvedOptions = options.length >= (questionType === 'true_false' ? 2 : 4)
    ? options.slice(0, questionType === 'true_false' ? 2 : 4)
    : fallbackOptions;

  const resolvedCorrectAnswers = correctAnswers.length
    ? correctAnswers.filter((index) => index < resolvedOptions.length)
    : [0];

  return {
    question: normalizeText(rawQuestion?.question || `${topic} question ${fallbackIndex + 1}: which choice best fits?`, 240),
    questionType,
    topic,
    difficulty,
    options: resolvedOptions,
    correctAnswers: resolvedCorrectAnswers,
    explanation: normalizeText(rawQuestion?.explanation || `This answer is supported by the ${topic} lesson context.`, 260),
    hint: normalizeText(rawQuestion?.hint || '', 180),
    multiSelect: resolvedCorrectAnswers.length > 1
  };
}

function buildFallbackQuestions({ title, level, contextLabel, lesson, course, count }) {
  const baseLabel = title || contextLabel || 'crypto learning';
  const focusTerms = [
    ...(lesson?.keyConcepts || []),
    ...(lesson?.takeaways || []),
    ...(course?.lessons || []).slice(0, 4).map((item) => item.title)
  ].filter(Boolean);

  const promptFocus = focusTerms.length ? focusTerms.slice(0, 4).join(', ') : baseLabel;
  const questionBank = [
    {
      questionType: 'multiple_choice',
      question: `Which idea is most closely associated with ${promptFocus}?`,
      options: [baseLabel, 'Random speculation', 'Ignoring risk controls', 'Trading without a plan'],
      correctAnswers: [0],
      explanation: `The lesson material around ${baseLabel} focuses on the core concept, not speculation.`,
      hint: 'Look for the concept that matches the lesson theme.',
      topic: promptFocus,
      difficulty: getQuestionDifficulty(level)
    },
    {
      questionType: 'true_false',
      question: `True or false: the lesson on ${baseLabel} reinforces disciplined decision-making.`,
      options: ['True', 'False'],
      correctAnswers: [0],
      explanation: 'Learning content in this module is designed to reinforce disciplined, informed decisions.',
      hint: 'Think about how the platform frames risk and process.',
      topic: promptFocus,
      difficulty: getQuestionDifficulty(level)
    },
    {
      questionType: 'scenario',
      question: `A learner is reviewing ${baseLabel}. Which choice best shows they understood the practical takeaway?`,
      options: ['They apply the concept with a plan and a risk limit.', 'They skip the lesson and guess.', 'They increase exposure because the chart looks exciting.', 'They ignore the context entirely.'],
      correctAnswers: [0],
      explanation: 'The best answer reflects applied understanding and risk-aware behavior.',
      hint: 'Pick the choice that shows disciplined execution.',
      topic: promptFocus,
      difficulty: getQuestionDifficulty(level)
    },
    {
      questionType: 'multiple_choice',
      question: `What should a learner do first after studying ${baseLabel}?`,
      options: ['Review the key concepts and confirm the main takeaway', 'Take the biggest possible position', 'Ignore the lesson summary', 'Trade without checking anything'],
      correctAnswers: [0],
      explanation: 'Reviewing the key concepts is the safest and most effective next step.',
      hint: 'The platform emphasizes learning before action.',
      topic: promptFocus,
      difficulty: getQuestionDifficulty(level)
    },
    {
      questionType: 'multiple_choice',
      question: `Which outcome is most aligned with the lesson on ${baseLabel}?`,
      options: ['Better reasoning and stronger crypto literacy', 'Guaranteed profits', 'Instant wealth', 'No need for research'],
      correctAnswers: [0],
      explanation: 'The lesson is about improving reasoning and literacy, not promising outcomes.',
      hint: 'Choose the realistic learning outcome.',
      topic: promptFocus,
      difficulty: getQuestionDifficulty(level)
    }
  ];

  return questionBank.slice(0, count).map((question, index) => normalizeQuestion(question, index, level));
}

function buildFallbackQuiz({ title, level, category, contextLabel, lesson, course, count }) {
  const questionLevel = normalizeLevel(level);
  const fallbackTitle = title || `${contextLabel || category || 'Crypto'} quiz`;

  return {
    title: fallbackTitle,
    category: normalizeText(category || contextLabel || 'crypto learning', 80),
    level: questionLevel,
    difficulty: quizDifficultyFromLevel(questionLevel),
    timeLimitSeconds: questionLevel === 'advanced' ? 450 : questionLevel === 'intermediate' ? 390 : 330,
    xpReward: Math.max(120, count * 60),
    contextSummary: getContextSummary({ lesson, course }),
    questions: buildFallbackQuestions({ title: fallbackTitle, level: questionLevel, contextLabel: contextLabel || category, lesson, course, count })
  };
}

async function resolveLearningContext({ lessonId, courseId }) {
  await ensureLearningCatalogSeeded();

  const lesson = lessonId ? await Lesson.findById(lessonId).lean().exec() : null;
  const courseFromLesson = lesson ? await Course.findById(lesson.course).lean().exec() : null;
  const course = !lesson && courseId ? await Course.findById(courseId).lean().exec() : courseFromLesson;

  if (lessonId && !lesson) {
    throw new AppError('Lesson not found', 404);
  }

  if (courseId && !course) {
    throw new AppError('Course not found', 404);
  }

  let sourceType = 'general';
  if (lesson) sourceType = 'learning_lesson';
  else if (course) sourceType = 'learning_course';

  return { lesson, course, sourceType };
}

async function generateGeminiQuiz({ lesson, course, level, count, title }) {
  const contextSummary = getContextSummary({ lesson, course });
  const prompt = getPromptContext({ lesson, course, level, count, title });

  const response = await generateGeminiText({
    prompt,
    systemInstruction: 'You author quiz content for a premium crypto learning platform. The output must be safe, factual, and valid JSON only.',
    temperature: 0.45,
    maxOutputTokens: 2200
  });

  const parsed = extractJsonObject(response.content);
  if (!parsed || !Array.isArray(parsed.questions) || !parsed.questions.length) {
    return buildFallbackQuiz({ title, level, category: parsed?.category, contextLabel: getContextLabel({ lesson, course }), lesson, course, count });
  }

  const normalizedLevel = normalizeLevel(parsed.level || level);
  const normalizedQuestions = parsed.questions.slice(0, count).map((question, index) => normalizeQuestion(question, index, normalizedLevel));

  if (!normalizedQuestions.length) {
    return buildFallbackQuiz({ title, level: normalizedLevel, category: parsed.category, contextLabel: getContextLabel({ lesson, course }), lesson, course, count });
  }

  return {
    title: normalizeText(parsed.title || `${getContextLabel({ lesson, course })} quiz`, 120),
    category: normalizeText(parsed.category || course?.category || lesson?.difficulty || 'crypto learning', 80),
    level: normalizedLevel,
    difficulty: quizDifficultyFromLevel(normalizedLevel),
    timeLimitSeconds: Number(parsed.timeLimitSeconds) || (normalizedLevel === 'advanced' ? 450 : normalizedLevel === 'intermediate' ? 390 : 330),
    xpReward: Math.max(120, Number(parsed.xpReward) || normalizedQuestions.length * 70),
    contextSummary: normalizeText(parsed.contextSummary || contextSummary, 900),
    questions: normalizedQuestions
  };
}

function calculateStreakBonus(user, quiz) {
  const streak = Number(user?.streak || 0);
  if (!streak) return 0;
  if (!quiz?.sourceType || quiz.sourceType === 'general') return 0;

  return Math.min(60, Math.max(10, streak * 6));
}

function summarizeAttempt(attempt) {
  return {
    id: cloneId(attempt._id),
    quizId: cloneId(attempt.quiz),
    title: attempt.title,
    category: attempt.category,
    level: attempt.level,
    score: attempt.score,
    percentage: attempt.percentage,
    correctCount: attempt.correctCount,
    wrongCount: attempt.wrongCount,
    unansweredCount: attempt.unansweredCount,
    xpAwarded: attempt.xpAwarded,
    durationSeconds: attempt.durationSeconds,
    isPassed: attempt.isPassed,
    createdAt: attempt.createdAt,
    metadata: attempt.metadata || {}
  };
}

export async function generateLearningQuiz({ lessonId, courseId, level, count = 5, title } = {}) {
  const normalizedLevel = normalizeLevel(level);
  const normalizedCount = normalizeCount(count);
  const { lesson, course, sourceType } = await resolveLearningContext({ lessonId, courseId });
  const quizPayload = await generateGeminiQuiz({ lesson, course, level: normalizedLevel, count: normalizedCount, title });
  const hasMalformedQuestion = (quizPayload.questions || []).some((question) => !String(question.question || '').trim() || !Array.isArray(question.options) || question.options.length < 2 || !Array.isArray(question.correctAnswers) || !question.correctAnswers.length);
  const finalPayload = hasMalformedQuestion
    ? buildFallbackQuiz({
        title,
        level: normalizedLevel,
        category: quizPayload.category,
        contextLabel: getContextLabel({ lesson, course }),
        lesson,
        course,
        count: normalizedCount
      })
    : quizPayload;

  const quiz = await Quiz.create({
    title: normalizeText(title || finalPayload.title, 120),
    category: finalPayload.category,
    level: finalPayload.level,
    difficulty: finalPayload.difficulty,
    timeLimitSeconds: finalPayload.timeLimitSeconds,
    aiGenerated: true,
    sourceType,
    sourceLesson: lesson?._id || null,
    sourceCourse: course?._id || null,
    contextSummary: finalPayload.contextSummary || getContextSummary({ lesson, course }),
    questions: finalPayload.questions,
    xpReward: finalPayload.xpReward
  });

  return serializeQuiz(quiz.toObject());
}

export async function submitLearningQuiz({ userId, quizId, answers = [], startedAt, completedAt, timeSpentSeconds } = {}) {
  if (!quizId) {
    throw new AppError('quizId is required', 400);
  }

  const [quiz, user] = await Promise.all([
    Quiz.findById(quizId).lean().exec(),
    User.findById(userId).select('streak xp').lean().exec()
  ]);

  if (!quiz) {
    throw new AppError('Quiz not found', 404);
  }

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const bonusXp = calculateStreakBonus(user, quiz);
  const scored = await scoreQuizAttempt({
    userId,
    quizId,
    answers,
    startedAt,
    completedAt,
    timeSpentSeconds,
    bonusXp,
    bonusLabel: bonusXp ? `streak:${user.streak || 0}` : ''
  });

  const achievementSession = await mongoose.startSession();
  let unlockedAchievements = [];

  try {
    achievementSession.startTransaction();
    const result = await unlockEligibleAchievements(userId, achievementSession);
    unlockedAchievements = (result.unlocked || []).map((achievement) => ({
      id: cloneId(achievement._id),
      key: achievement.key,
      title: achievement.title,
      xpReward: achievement.xpReward,
      badgeImage: achievement.badgeImage
    }));
    await achievementSession.commitTransaction();
  } catch {
    await achievementSession.abortTransaction();
  } finally {
    achievementSession.endSession();
  }

  try {
    const { invalidateLearningAnalyticsCache } = await import('./learnIntelligenceService.js');
    invalidateLearningAnalyticsCache(userId);
  } catch {
    // Cache invalidation is best-effort.
  }

  return {
    ...scored,
    rewards: {
      bonusXp,
      streak: Number(user.streak || 0),
      achievements: unlockedAchievements
    }
  };
}

export async function getLearningQuizHistory({ userId, lessonId = null, courseId = null, limit = 12 } = {}) {
  const normalizedLimit = Math.min(Math.max(Number(limit) || 12, 1), 30);
  const quizQuery = { sourceType: { $in: ['learning_lesson', 'learning_course'] } };

  if (lessonId) {
    quizQuery.sourceLesson = lessonId;
  } else if (courseId) {
    quizQuery.sourceCourse = courseId;
  }

  const quizzes = await Quiz.find(quizQuery).select('_id title category level difficulty sourceType sourceLesson sourceCourse aiGenerated timeLimitSeconds xpReward contextSummary createdAt').lean().exec();

  if (!quizzes.length) {
    return {
      quizzes: [],
      attempts: [],
      stats: {
        totalAttempts: 0,
        passedAttempts: 0,
        averagePercentage: 0,
        totalXp: 0,
        streakBonusXp: 0
      }
    };
  }

  const quizIds = quizzes.map((quiz) => quiz._id);
  const attempts = await QuizAttempt.find({ user: userId, quiz: { $in: quizIds } })
    .sort({ createdAt: -1 })
    .limit(normalizedLimit)
    .populate('quiz', 'title category level difficulty sourceType sourceLesson sourceCourse aiGenerated timeLimitSeconds xpReward')
    .lean()
    .exec();

  const streakBonusXp = attempts.reduce((sum, attempt) => sum + Number(attempt?.metadata?.bonusXp || 0), 0);
  const averagePercentage = attempts.length
    ? attempts.reduce((sum, attempt) => sum + Number(attempt.percentage || 0), 0) / attempts.length
    : 0;

  return {
    quizzes: quizzes.map((quiz) => ({
      id: cloneId(quiz._id),
      title: quiz.title,
      category: quiz.category,
      level: quiz.level,
      difficulty: quiz.difficulty,
      sourceType: quiz.sourceType,
      sourceLesson: cloneId(quiz.sourceLesson),
      sourceCourse: cloneId(quiz.sourceCourse),
      aiGenerated: quiz.aiGenerated,
      timeLimitSeconds: quiz.timeLimitSeconds,
      xpReward: quiz.xpReward,
      contextSummary: quiz.contextSummary || '',
      createdAt: quiz.createdAt
    })),
    attempts: attempts.map((attempt) => ({
      ...summarizeAttempt(attempt),
      quiz: attempt.quiz
        ? {
            id: cloneId(attempt.quiz._id),
            title: attempt.quiz.title,
            category: attempt.quiz.category,
            level: attempt.quiz.level,
            difficulty: attempt.quiz.difficulty,
            sourceType: attempt.quiz.sourceType,
            sourceLesson: cloneId(attempt.quiz.sourceLesson),
            sourceCourse: cloneId(attempt.quiz.sourceCourse),
            aiGenerated: attempt.quiz.aiGenerated,
            timeLimitSeconds: attempt.quiz.timeLimitSeconds,
            xpReward: attempt.quiz.xpReward
          }
        : null
    })),
    stats: {
      totalAttempts: attempts.length,
      passedAttempts: attempts.filter((attempt) => attempt.isPassed).length,
      averagePercentage: Number(averagePercentage.toFixed(2)),
      totalXp: attempts.reduce((sum, attempt) => sum + Number(attempt.xpAwarded || 0), 0),
      streakBonusXp
    }
  };
}