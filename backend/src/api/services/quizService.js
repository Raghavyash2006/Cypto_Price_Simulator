import mongoose from 'mongoose';
import Quiz from '../../models/Quiz.js';
import QuizAttempt from '../../models/QuizAttempt.js';
import User from '../../models/User.js';
import Transaction from '../../models/Transaction.js';
import { getIo, getUserRoom } from '../../config/socket.js';

const CATEGORY_LIBRARY = {
  beginner: ['wallet safety', 'blockchain basics', 'market fundamentals'],
  intermediate: ['technical analysis', 'risk management', 'portfolio strategy'],
  advanced: ['DeFi', 'derivatives', 'portfolio optimization']
};

const QUIZ_CATALOG_CATEGORIES = [
  'wallet safety',
  'blockchain basics',
  'market fundamentals',
  'technical analysis',
  'risk management',
  'portfolio strategy',
  'DeFi',
  'derivatives',
  'portfolio optimization'
];

const LEVEL_ORDER = ['beginner', 'intermediate', 'advanced'];
const QUIZ_LIMITS = { list: 20, leaderboard: 10, analyticsRecent: 12 };
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_QUIZ_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';

function normalizeLevel(level) {
  const value = String(level || 'beginner').toLowerCase();
  if (LEVEL_ORDER.includes(value)) return value;
  return 'beginner';
}

function normalizeCategory(category) {
  const value = String(category || 'general').trim().toLowerCase();
  return value || 'general';
}

function sanitizeText(value, max = 220) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function quizTimeLimit(level) {
  if (level === 'advanced') return 420;
  if (level === 'intermediate') return 360;
  return 300;
}

function buildQuestion(question, options, correctAnswers, explanation = '', topic = '', difficulty = 'medium') {
  const normalizedCorrectAnswers = Array.from(new Set((correctAnswers || []).map((value) => Number(value)).filter((value) => Number.isInteger(value))));
  return {
    question: sanitizeText(question, 220),
    options: (options || []).map((option) => sanitizeText(option, 120)).slice(0, 5),
    correctAnswers: normalizedCorrectAnswers,
    explanation: sanitizeText(explanation, 220),
    hint: '',
    topic: sanitizeText(topic, 80),
    difficulty,
    multiSelect: normalizedCorrectAnswers.length > 1
  };
}

function normalizeQuestion(question, { level, category, focus, index }) {
  const topic = sanitizeText(question?.topic || question?.category || category || focus || 'crypto fundamentals', 80);
  const difficulty = level === 'advanced' ? 'hard' : level === 'intermediate' ? 'medium' : 'easy';
  const questionText = sanitizeText(question?.question || `${topic} question ${index + 1}: which choice best fits?`, 220);
  const options = Array.isArray(question?.options) ? question.options : [];
  const correctAnswers = Array.isArray(question?.correctAnswers) ? question.correctAnswers : [];
  const explanation = sanitizeText(question?.explanation || `This answer reflects the key idea behind ${topic}.`, 220);
  return buildQuestion(questionText, options, correctAnswers, explanation, topic, difficulty);
}

function sanitizeQuestionForClient(question) {
  return {
    _id: question._id,
    question: question.question,
    options: question.options || [],
    hint: question.hint || '',
    topic: question.topic || '',
    difficulty: question.difficulty || 'medium',
    multiSelect: Boolean(question.multiSelect)
  };
}

function sanitizeQuizForClient(quiz) {
  return {
    ...quiz,
    questions: (quiz.questions || []).map(sanitizeQuestionForClient)
  };
}

function sanitizeAttemptForClient(attempt) {
  if (!attempt) return null;
  const { answers, ...rest } = attempt;
  return rest;
}

function buildFallbackQuiz({ title, level, category, focus, count = 5 }) {
  const topic = sanitizeText(category || focus || 'crypto fundamentals', 80);
  const difficulty = level === 'advanced' ? 'hard' : level === 'intermediate' ? 'medium' : 'easy';

  const questionBank = [
    {
      question: `Which choice best reflects ${topic} in practice?`,
      options: [topic, 'Random speculation', 'Ignoring risk controls', 'Trading without a plan'],
      correctAnswers: [0],
      explanation: `The correct answer matches the lesson focus on ${topic}.`,
      topic,
      difficulty
    },
    {
      question: `A learner is studying ${topic}. What should they do first?`,
      options: ['Review the core concept and key terms', 'Take the biggest possible position', 'Ignore the summary', 'Copy a random trade'],
      correctAnswers: [0],
      explanation: 'The safest and most educational next step is to review the concept before acting.',
      topic,
      difficulty
    },
    {
      question: `Why is ${topic} important for a crypto learner?`,
      options: ['It improves decision-making and risk awareness', 'It guarantees profits', 'It removes the need for research', 'It works only in bull markets'],
      correctAnswers: [0],
      explanation: 'This topic strengthens decision-making and helps learners avoid impulsive moves.',
      topic,
      difficulty
    },
    {
      question: `Which action best shows understanding of ${topic}?`,
      options: ['Applying the concept with a clear plan', 'Skipping the lesson and guessing', 'Ignoring the risk side', 'Chasing every price move'],
      correctAnswers: [0],
      explanation: 'Applied understanding means using the concept deliberately, not guessing.',
      topic,
      difficulty
    },
    {
      question: `What outcome is most realistic after learning ${topic}?`,
      options: ['Stronger reasoning and better crypto literacy', 'Guaranteed profits', 'Instant wealth', 'No need for practice'],
      correctAnswers: [0],
      explanation: 'Learning improves reasoning and literacy, not guaranteed outcomes.',
      topic,
      difficulty
    }
  ];

  return {
    title: sanitizeText(title || `${topic} fundamentals`, 120),
    category: sanitizeText(category || topic, 80),
    difficulty,
    level,
    timeLimitSeconds: quizTimeLimit(level),
    aiGenerated: false,
    questions: questionBank.slice(0, count).map((question, index) => normalizeQuestion(question, { level, category, focus, index }))
  };
}

function buildQuizPrompt({ level, category, focus, count }) {
  return [
    'Generate a JSON object for a crypto learning quiz.',
    'Return only valid JSON. No markdown, no commentary.',
    'The JSON shape must be: { title, category, level, timeLimitSeconds, questions: [{ question, options, correctAnswers, explanation }] }.',
    'Questions must have 4 answer options each.',
    'correctAnswers must be an array of zero-based option indexes.',
    'Explanations should be concise and educational.',
    `Level: ${level}`,
    `Category: ${category}`,
    `Focus: ${focus}`,
    `Question count: ${count}`,
    'Make the quiz beginner-friendly when the level is beginner, progressively more difficult for higher levels, and keep all content aligned to crypto education.'
  ].join('\n');
}

async function generateAiQuiz({ level, category, focus, count }) {
  if (!process.env.OPENAI_API_KEY) {
    return buildFallbackQuiz({ title: `${category} fundamentals`, level, category, focus, count });
  }

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.55,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are an expert crypto quiz author for a learning platform.' },
        { role: 'user', content: buildQuizPrompt({ level, category, focus, count }) }
      ]
    })
  });

  if (!response.ok) {
    return buildFallbackQuiz({ title: `${category} fundamentals`, level, category, focus, count });
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    return buildFallbackQuiz({ title: `${category} fundamentals`, level, category, focus, count });
  }

  try {
    const parsed = JSON.parse(content);
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    if (!questions.length) {
      return buildFallbackQuiz({ title: `${category} fundamentals`, level, category, focus, count });
    }

    const normalizedQuestions = questions.slice(0, count).map((question, index) => normalizeQuestion(question, { level, category, focus, index }));
    const hasMalformedQuestion = normalizedQuestions.some((question) => !question.question || question.options.length < 4 || !question.correctAnswers.length);
    if (hasMalformedQuestion) {
      return buildFallbackQuiz({ title: `${category} fundamentals`, level, category, focus, count });
    }

    return {
      title: sanitizeText(parsed.title || `${category} mastery quiz`, 120),
      category: normalizeCategory(parsed.category || category),
      level,
      timeLimitSeconds: Number(parsed.timeLimitSeconds) || quizTimeLimit(level),
      aiGenerated: true,
      questions: normalizedQuestions
    };
  } catch {
    return buildFallbackQuiz({ title: `${category} fundamentals`, level, category, focus, count });
  }
}

function scoreQuestion(question, selectedAnswers = []) {
  const expected = Array.from(new Set((question.correctAnswers || []).map((value) => Number(value)))).sort((left, right) => left - right);
  const actual = Array.from(new Set((selectedAnswers || []).map((value) => Number(value)))).sort((left, right) => left - right);
  const exactMatch = expected.length === actual.length && expected.every((value, index) => value === actual[index]);
  return exactMatch ? 1 : 0;
}

function buildProgressSummary(quizDoc, attempts) {
  const totalAttempts = attempts.length;
  const completedAttempts = attempts.filter((attempt) => attempt.percentage >= 70).length;
  const bestAttempt = attempts[0] || null;
  const averageScore = totalAttempts ? attempts.reduce((sum, attempt) => sum + attempt.score, 0) / totalAttempts : 0;
  const averagePercentage = totalAttempts ? attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / totalAttempts : 0;
  const totalXp = attempts.reduce((sum, attempt) => sum + attempt.xpAwarded, 0);
  const completionRate = totalAttempts ? Math.round((completedAttempts / totalAttempts) * 100) : 0;

  return {
    quiz: {
      id: quizDoc._id,
      title: quizDoc.title,
      category: quizDoc.category,
      level: quizDoc.level,
      difficulty: quizDoc.difficulty,
      timeLimitSeconds: quizDoc.timeLimitSeconds,
      questionCount: quizDoc.questions.length,
      aiGenerated: quizDoc.aiGenerated
    },
    attempts: totalAttempts,
    completedAttempts,
    completionRate,
    averageScore: Number(averageScore.toFixed(2)),
    averagePercentage: Number(averagePercentage.toFixed(2)),
    bestAttempt,
    totalXp
  };
}

async function persistAttemptAndReward({ user, quiz, attemptData, session }) {
  const [attempt] = await QuizAttempt.create([
    {
      user: user._id,
      quiz: quiz._id,
      title: quiz.title,
      category: quiz.category,
      level: quiz.level,
      timeLimitSeconds: quiz.timeLimitSeconds,
      startedAt: attemptData.startedAt,
      completedAt: attemptData.completedAt,
      durationSeconds: attemptData.durationSeconds,
      totalQuestions: attemptData.totalQuestions,
      correctCount: attemptData.correctCount,
      wrongCount: attemptData.wrongCount,
      unansweredCount: attemptData.unansweredCount,
      score: attemptData.score,
      percentage: attemptData.percentage,
      xpAwarded: attemptData.xpAwarded,
      isPassed: attemptData.isPassed,
      answers: attemptData.answers,
      metadata: attemptData.metadata
    }
  ], { session });

  user.xp = (user.xp || 0) + attemptData.xpAwarded;
  user.notifications = Array.isArray(user.notifications) ? user.notifications : [];
  const notification = {
    type: 'quiz',
    title: 'Quiz completed',
    message: `Quiz completed: +${attemptData.xpAwarded} XP (${attemptData.percentage}% score)`,
    source: 'quiz',
    actionUrl: `/quizzes/${quiz._id}`,
    priority: 'high',
    metadata: { quizId: quiz._id, attemptId: attempt._id, percentage: attemptData.percentage }
  };
  user.notifications.unshift(notification);
  user.notifications = user.notifications.slice(0, 20);
  await user.save({ session });

  const io = getIo();
  if (io) {
    io.to(getUserRoom(user._id)).emit('notification:new', notification);
  }

  await Transaction.create([
    {
      user: user._id,
      type: 'reward',
      symbol: 'XP',
      amount: attemptData.xpAwarded,
      metadata: { reason: `quiz:${quiz._id}`, quizId: quiz._id, attemptId: attempt._id }
    }
  ], { session });

  return attempt;
}

export async function listQuizzes({ level, category, search, limit = QUIZ_LIMITS.list, viewerId }) {
  const query = {};
  if (level) query.level = normalizeLevel(level);
  if (category) query.category = normalizeCategory(category);
  if (search) query.$text = { $search: search };

  const quizzes = await Quiz.find(query)
    .sort({ level: 1, createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || QUIZ_LIMITS.list, 1), 50))
    .lean()
    .exec();

  const quizIds = quizzes.map((quiz) => quiz._id);
  const attempts = viewerId
    ? await QuizAttempt.find({ user: viewerId, quiz: { $in: quizIds } }).sort({ createdAt: -1 }).lean().exec()
    : [];

  const attemptMap = new Map();
  attempts.forEach((attempt) => {
    attemptMap.set(String(attempt.quiz), attempt);
  });

  return quizzes.map((quiz) => {
    const attempt = attemptMap.get(String(quiz._id));
    return {
      ...sanitizeQuizForClient(quiz),
      lastAttempt: attempt || null,
      bestScore: attempt?.score || 0,
      progress: attempt ? Math.min(100, Math.round(attempt.percentage)) : 0,
      completed: attempt ? attempt.percentage >= 70 : false
    };
  });
}

export async function getQuizById(quizId, viewerId) {
  const quiz = await Quiz.findById(quizId).lean().exec();
  if (!quiz) {
    throw new Error('Quiz not found');
  }

  const attempts = viewerId
    ? await QuizAttempt.find({ user: viewerId, quiz: quiz._id }).sort({ createdAt: -1 }).limit(5).lean().exec()
    : [];

  return {
    quiz: {
      ...sanitizeQuizForClient(quiz),
      attempts,
      questionCount: quiz.questions.length,
      timeLimitSeconds: quiz.timeLimitSeconds || quizTimeLimit(quiz.level)
    },
    progress: buildProgressSummary(quiz, attempts)
  };
}

export async function createQuiz({ level, category, focus, count = 5, title }) {
  const normalizedLevel = normalizeLevel(level);
  const normalizedCategory = normalizeCategory(category);
  const quizPayload = await generateAiQuiz({ level: normalizedLevel, category: normalizedCategory, focus: focus || CATEGORY_LIBRARY[normalizedLevel]?.[0] || normalizedCategory, count });
  const quiz = await Quiz.create({
    title: sanitizeText(title || quizPayload.title, 120),
    category: quizPayload.category || normalizedCategory,
    level: quizPayload.level || normalizedLevel,
    difficulty: normalizedLevel === 'advanced' ? 'hard' : normalizedLevel === 'intermediate' ? 'medium' : 'easy',
    timeLimitSeconds: quizPayload.timeLimitSeconds || quizTimeLimit(normalizedLevel),
    aiGenerated: true,
    questions: quizPayload.questions,
    xpReward: Math.max(100, quizPayload.questions.length * 60)
  });

  return quiz.toObject();
}

export async function ensureSeedQuizzes() {
  const existingCount = await Quiz.countDocuments({});
  if (existingCount > 0) return;

  const seeds = [
    { title: 'Crypto basics bootcamp', level: 'beginner', category: 'wallet safety', focus: 'wallet basics' },
    { title: 'Market momentum check', level: 'intermediate', category: 'technical analysis', focus: 'risk management' },
    { title: 'DeFi risk lab', level: 'advanced', category: 'DeFi', focus: 'impermanent loss' }
  ];

  for (const seed of seeds) {
    // eslint-disable-next-line no-await-in-loop
    await createQuiz({ ...seed, count: 5 });
  }
}

export async function scoreQuizAttempt({ userId, quizId, answers = [], startedAt, completedAt, timeSpentSeconds, bonusXp = 0, bonusLabel = '' }) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const quiz = await Quiz.findById(quizId).session(session);
    if (!quiz) throw new Error('Quiz not found');

    const user = await User.findById(userId).session(session);
    if (!user) throw new Error('User not found');

    const totalQuestions = quiz.questions.length;
    const normalizedAnswers = Array.isArray(answers) ? answers : [];
    const answersBreakdown = [];
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    quiz.questions.forEach((question, index) => {
      const selectedAnswers = normalizedAnswers[index]?.selectedAnswers || normalizedAnswers[index] || [];
      const selectedList = Array.isArray(selectedAnswers) ? selectedAnswers : [selectedAnswers].filter((value) => value !== undefined && value !== null);
      const correct = scoreQuestion(question, selectedList);
      if (selectedList.length === 0) {
        unansweredCount += 1;
      } else if (correct) {
        correctCount += 1;
      } else {
        wrongCount += 1;
      }

      answersBreakdown.push({
        questionIndex: index,
        question: question.question,
        options: question.options || [],
        selectedAnswers: selectedList.map((value) => Number(value)),
        correct: Boolean(correct),
        pointsAwarded: correct ? 1 : 0,
        correctAnswers: (question.correctAnswers || []).map((value) => Number(value)),
        explanation: question.explanation || '',
        multiSelect: Boolean(question.multiSelect)
      });
    });

    const score = correctCount * 10;
    const percentage = totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const durationSeconds = Math.max(0, Number(timeSpentSeconds) || Math.round((new Date(completedAt || Date.now()) - new Date(startedAt || Date.now())) / 1000));
    const timedBonus = quiz.timeLimitSeconds ? Math.max(0, Math.round(((quiz.timeLimitSeconds - Math.min(durationSeconds, quiz.timeLimitSeconds)) / quiz.timeLimitSeconds) * 25)) : 0;
    const normalizedBonusXp = Math.max(0, Number(bonusXp) || 0);
    const xpAwarded = Math.round((quiz.xpReward || 100) * (percentage / 100)) + timedBonus + normalizedBonusXp;
    const isPassed = percentage >= 70;

    const attempt = await persistAttemptAndReward({
      user,
      quiz,
      attemptData: {
        startedAt: startedAt || new Date(),
        completedAt: completedAt || new Date(),
        durationSeconds,
        totalQuestions,
        correctCount,
        wrongCount,
        unansweredCount,
        score,
        percentage,
        xpAwarded,
        isPassed,
        answers: answersBreakdown,
        metadata: {
          timedBonus,
          bonusXp: normalizedBonusXp,
          bonusLabel,
          timeLimitSeconds: quiz.timeLimitSeconds,
          level: quiz.level,
          category: quiz.category,
          aiGenerated: quiz.aiGenerated
        }
      },
      session
    });

    await session.commitTransaction();
    session.endSession();

    return {
      attempt: {
        id: attempt._id,
        quizId: quiz._id,
        title: quiz.title,
        category: quiz.category,
        level: quiz.level,
        score,
        percentage,
        correctCount,
        wrongCount,
        unansweredCount,
        xpAwarded,
        durationSeconds,
        isPassed,
        timedBonus,
        bonusXp: normalizedBonusXp,
        answers: answersBreakdown
      },
      progress: await getQuizProgress(userId, quiz._id)
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

export async function getQuizProgress(userId, quizId = null) {
  const query = { user: userId };
  if (quizId) query.quiz = quizId;

  const attempts = await QuizAttempt.find(query).sort({ createdAt: -1 }).lean().exec();
  const totalAttempts = attempts.length;
  const passedAttempts = attempts.filter((attempt) => attempt.isPassed).length;
  const averagePercentage = totalAttempts ? attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / totalAttempts : 0;
  const totalXp = attempts.reduce((sum, attempt) => sum + attempt.xpAwarded, 0);

  return {
    attempts,
    totalAttempts,
    passedAttempts,
    averagePercentage: Number(averagePercentage.toFixed(2)),
    totalXp,
    latestAttempt: attempts[0] || null
  };
}

export async function getQuizLeaderboard({ quizId, limit = QUIZ_LIMITS.leaderboard }) {
  const rows = await QuizAttempt.aggregate([
    { $match: quizId ? { quiz: new mongoose.Types.ObjectId(String(quizId)) } : {} },
    {
      $group: {
        _id: '$user',
        totalXp: { $sum: '$xpAwarded' },
        bestPercentage: { $max: '$percentage' },
        bestScore: { $max: '$score' },
        averagePercentage: { $avg: '$percentage' },
        attempts: { $sum: 1 },
        passedAttempts: { $sum: { $cond: ['$isPassed', 1, 0] } }
      }
    },
    { $sort: { totalXp: -1, bestPercentage: -1, attempts: -1 } },
    { $limit: Math.min(Math.max(Number(limit) || QUIZ_LIMITS.leaderboard, 1), 50) },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        _id: 0,
        userId: '$user._id',
        username: '$user.username',
        name: '$user.name',
        avatar: '$user.avatar',
        totalXp: 1,
        bestPercentage: 1,
        bestScore: 1,
        averagePercentage: { $round: ['$averagePercentage', 2] },
        attempts: 1,
        passedAttempts: 1
      }
    }
  ]);

  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function getQuizAnalytics({ quizId = null, userId = null } = {}) {
  const match = {};
  if (quizId) match.quiz = new mongoose.Types.ObjectId(String(quizId));
  if (userId) match.user = new mongoose.Types.ObjectId(String(userId));

  const attempts = await QuizAttempt.find(match)
    .sort({ createdAt: -1 })
    .limit(QUIZ_LIMITS.analyticsRecent)
    .populate('user', 'username name avatar')
    .populate('quiz', 'title category level difficulty')
    .lean()
    .exec();

  const aggregate = await QuizAttempt.aggregate([
    { $match: match },
    {
      $group: {
        _id: quizId ? '$quiz' : '$category',
        attempts: { $sum: 1 },
        passedAttempts: { $sum: { $cond: ['$isPassed', 1, 0] } },
        averagePercentage: { $avg: '$percentage' },
        averageXp: { $avg: '$xpAwarded' },
        bestScore: { $max: '$score' }
      }
    },
    { $sort: { attempts: -1 } }
  ]);

  return {
    recentAttempts: attempts.map((attempt) => ({
      ...sanitizeAttemptForClient(attempt),
      quiz: attempt.quiz
    })),
    aggregate,
    totals: {
      attempts: attempts.length,
      aggregateCount: aggregate.length
    }
  };
}

export function getQuizCatalogTags() {
  return {
    levels: LEVEL_ORDER,
    categories: QUIZ_CATALOG_CATEGORIES,
    timeLimits: {
      beginner: quizTimeLimit('beginner'),
      intermediate: quizTimeLimit('intermediate'),
      advanced: quizTimeLimit('advanced')
    }
  };
}
