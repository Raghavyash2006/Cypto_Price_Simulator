import mongoose from 'mongoose';
import Course from '../../models/Course.js';
import Lesson from '../../models/Lesson.js';
import LearningProgress from '../../models/LearningProgress.js';
import User from '../../models/User.js';
import { AppError } from '../../utils/AppError.js';
import { sanitizeText } from '../../utils/inputSanitizer.js';

const LEARNING_CATALOG = [
  {
    slug: 'bitcoin-basics',
    title: 'Bitcoin Basics',
    category: 'Bitcoin Basics',
    description: 'Learn how Bitcoin works, why scarcity matters, and how to read the core ideas behind the first crypto asset.',
    difficulty: 'Beginner',
    estimatedDurationMinutes: 45,
    xpReward: 220,
    order: 1,
    lessons: [
      {
        slug: 'bitcoin-what-it-is',
        title: 'What Bitcoin is solving',
        description: 'Understand the problem Bitcoin was designed to fix and the role of decentralized money.',
        difficulty: 'Beginner',
        estimatedDurationMinutes: 12,
        xpReward: 70,
        order: 1,
        content:
          'Bitcoin is a decentralized monetary network that removes the need for a central operator. It combines scarcity, transparency, and open participation so value can move across borders without permission.\n\nThe key idea is simple: anyone can verify the ledger, but nobody can rewrite it alone.',
        takeaways: ['Bitcoin is permissionless', 'Supply is capped', 'Verification is public']
      },
      {
        slug: 'bitcoin-scarcity-and-security',
        title: 'Scarcity and network security',
        description: 'Explore mining, fixed supply, and why proof of work matters to the network.',
        difficulty: 'Beginner',
        estimatedDurationMinutes: 15,
        xpReward: 80,
        order: 2,
        content:
          'Bitcoin mining secures the chain by making block creation expensive to fake. The fixed supply schedule is what creates digital scarcity and makes the asset different from traditional fiat money.\n\nSecurity and scarcity work together: the more valuable the network becomes, the more incentives exist to protect it.',
        takeaways: ['Mining secures the ledger', 'Supply is predictable', 'Incentives reinforce security']
      },
      {
        slug: 'bitcoin-market-first-step',
        title: 'Your first market steps',
        description: 'Connect the basics to simulated trading and safe position sizing.',
        difficulty: 'Beginner',
        estimatedDurationMinutes: 18,
        xpReward: 90,
        order: 3,
        content:
          'Before buying Bitcoin, define your time horizon, risk tolerance, and exit plan. In the simulator, start with a small allocation and watch how volatility impacts drawdown and conviction.\n\nThe goal is not to predict every move, but to practice disciplined decision-making.',
        takeaways: ['Start small', 'Write an exit plan', 'Watch volatility']
      }
    ]
  },
  {
    slug: 'blockchain-fundamentals',
    title: 'Blockchain Fundamentals',
    category: 'Blockchain Fundamentals',
    description: 'Build a mental model for blocks, validators, consensus, and how on-chain data moves through the network.',
    difficulty: 'Beginner',
    estimatedDurationMinutes: 50,
    xpReward: 240,
    order: 2,
    lessons: [
      {
        slug: 'blockchain-structure',
        title: 'Blocks, hashes, and chains',
        description: 'See how data is grouped, linked, and verified on a blockchain.',
        difficulty: 'Beginner',
        estimatedDurationMinutes: 14,
        xpReward: 75,
        order: 1,
        content:
          'A blockchain stores records in blocks that point to the block before them. Hashes make tampering obvious because a single changed record changes the fingerprint of the whole chain.\n\nThat linkage is what gives blockchain its auditability.',
        takeaways: ['Blocks are linked by hashes', 'Tampering is visible', 'The ledger is auditable']
      },
      {
        slug: 'consensus-models',
        title: 'Consensus and validation',
        description: 'Compare proof of work and proof of stake at a practical level.',
        difficulty: 'Beginner',
        estimatedDurationMinutes: 16,
        xpReward: 80,
        order: 2,
        content:
          'Consensus is the rule set that decides which version of history the network accepts. Proof of work uses computation, while proof of stake relies on economic staking and validator accountability.\n\nDifferent consensus systems trade off speed, cost, and decentralization.',
        takeaways: ['Consensus selects valid history', 'PoW and PoS solve it differently', 'Trade-offs matter']
      },
      {
        slug: 'on-chain-activity',
        title: 'Reading on-chain activity',
        description: 'Understand transaction flow, wallet behavior, and what analytics can reveal.',
        difficulty: 'Intermediate',
        estimatedDurationMinutes: 20,
        xpReward: 95,
        order: 3,
        content:
          'On-chain activity can reveal wallet behavior, fee pressure, and ecosystem usage. Use it as one signal in a broader decision framework instead of treating it as a standalone prediction engine.\n\nThe strongest learning habit is to connect on-chain metrics to market context.',
        takeaways: ['On-chain data is a signal', 'Context matters', 'Combine signals carefully']
      }
    ]
  },
  {
    slug: 'trading-psychology',
    title: 'Trading Psychology',
    category: 'Trading Psychology',
    description: 'Train around emotional discipline, impulse control, and the habits that separate process from noise.',
    difficulty: 'Intermediate',
    estimatedDurationMinutes: 40,
    xpReward: 210,
    order: 3,
    lessons: [
      {
        slug: 'bias-and-fomo',
        title: 'Bias, FOMO, and regret',
        description: 'Recognize the emotional traps that cause most bad entries.',
        difficulty: 'Intermediate',
        estimatedDurationMinutes: 12,
        xpReward: 70,
        order: 1,
        content:
          'FOMO pushes traders into crowded entries and regret keeps them from following through on a plan. The fix is not to feel nothing; it is to create a process that still works when emotions spike.\n\nA repeatable checklist is usually more valuable than a perfect forecast.',
        takeaways: ['Bias changes decisions', 'Process beats impulse', 'Checklists reduce mistakes']
      },
      {
        slug: 'discipline-routines',
        title: 'Build a trading routine',
        description: 'Create pre-trade and post-trade habits that support consistency.',
        difficulty: 'Intermediate',
        estimatedDurationMinutes: 14,
        xpReward: 75,
        order: 2,
        content:
          'A good routine covers setup review, risk limits, entry rationale, and a post-trade review. This keeps decisions grounded in a process rather than in the last chart movement.\n\nYour simulator results improve when you treat trading like a workflow, not a guess.',
        takeaways: ['Use a checklist', 'Review before entry', 'Journal every trade']
      },
      {
        slug: 'reset-after-losses',
        title: 'Reset after losses',
        description: 'Recover without revenge trading or over-sizing the next idea.',
        difficulty: 'Intermediate',
        estimatedDurationMinutes: 14,
        xpReward: 80,
        order: 3,
        content:
          'Losses are part of trading. What matters is how quickly you return to your plan and whether you can keep the next decision small and rational.\n\nThe simulator is the right place to practice recovery because it lets you build resilience without financial damage.',
        takeaways: ['Losses are normal', 'Do not revenge trade', 'Reset the process']
      }
    ]
  },
  {
    slug: 'risk-management',
    title: 'Risk Management',
    category: 'Risk Management',
    description: 'Learn position sizing, stop logic, and portfolio drawdown control before you scale any strategy.',
    difficulty: 'Intermediate',
    estimatedDurationMinutes: 55,
    xpReward: 260,
    order: 4,
    lessons: [
      {
        slug: 'position-sizing',
        title: 'Position sizing basics',
        description: 'Define how much capital to risk on each idea.',
        difficulty: 'Intermediate',
        estimatedDurationMinutes: 16,
        xpReward: 85,
        order: 1,
        content:
          'Position sizing is the engine of survival. If each trade risks too much, even a good strategy can fail before variance works in your favor.\n\nThe simulator helps you learn that smaller risk often produces better long-term decision quality.',
        takeaways: ['Risk is controlled per trade', 'Small sizing improves survival', 'Variance is real']
      },
      {
        slug: 'drawdown-control',
        title: 'Drawdown control',
        description: 'Limit the damage from a run of losses and protect your capital curve.',
        difficulty: 'Intermediate',
        estimatedDurationMinutes: 18,
        xpReward: 90,
        order: 2,
        content:
          'Drawdown management keeps a portfolio from spiraling after a bad streak. Define when to reduce size, pause trading, or switch to observation mode.\n\nThe goal is to stay in the game long enough to let edge compound.',
        takeaways: ['Define a max drawdown', 'Pause when necessary', 'Protect the capital curve']
      },
      {
        slug: 'risk-reward-planning',
        title: 'Risk/reward planning',
        description: 'Set realistic trade structures before entering the market.',
        difficulty: 'Advanced',
        estimatedDurationMinutes: 21,
        xpReward: 100,
        order: 3,
        content:
          'Good traders do not only ask whether an entry could work; they ask whether the structure is worth the downside. Risk/reward planning turns a vague idea into a measurable decision.\n\nThat habit becomes critical when volatility expands.',
        takeaways: ['Structure the trade first', 'Measure downside', 'Keep the upside worth it']
      }
    ]
  },
  {
    slug: 'technical-analysis',
    title: 'Technical Analysis',
    category: 'Technical Analysis',
    description: 'Learn candles, trends, support and resistance, and how to read chart structure without overfitting.',
    difficulty: 'Advanced',
    estimatedDurationMinutes: 60,
    xpReward: 280,
    order: 5,
    lessons: [
      {
        slug: 'candlestick-basics',
        title: 'Candlestick structure',
        description: 'Read price candles and what they imply about buying and selling pressure.',
        difficulty: 'Intermediate',
        estimatedDurationMinutes: 16,
        xpReward: 90,
        order: 1,
        content:
          'Candles compress market information into a readable structure. Wicks, bodies, and closes each tell you something different about conviction and rejection.\n\nThe best use is to combine candle context with trend structure and volume, not to rely on any single pattern.',
        takeaways: ['Candles show pressure', 'Context matters', 'Combine with trend and volume']
      },
      {
        slug: 'trend-structure',
        title: 'Trend and structure',
        description: 'Map higher highs, higher lows, and range behavior.',
        difficulty: 'Advanced',
        estimatedDurationMinutes: 20,
        xpReward: 95,
        order: 2,
        content:
          'Trend structure shows whether price is building continuation or transition. A disciplined trader learns to wait for structure confirmation instead of forcing a trade into the middle of uncertainty.\n\nSupport and resistance become more useful when you understand the surrounding trend.',
        takeaways: ['Trend can guide bias', 'Range behavior matters', 'Wait for confirmation']
      },
      {
        slug: 'indicator-discipline',
        title: 'Indicator discipline',
        description: 'Use indicators as confirmation tools rather than prediction machines.',
        difficulty: 'Advanced',
        estimatedDurationMinutes: 24,
        xpReward: 105,
        order: 3,
        content:
          'Indicators can help when they are used to frame probabilities. They are weakest when traders expect them to predict the future without context.\n\nThe simulator is ideal for testing one indicator at a time and measuring whether it actually improves your entries.',
        takeaways: ['Indicators confirm', 'Avoid overfitting', 'Test one rule at a time']
      }
    ]
  },
  {
    slug: 'defi-basics',
    title: 'DeFi Basics',
    category: 'DeFi Basics',
    description: 'Understand wallets, liquidity, yield, and the risks that come with decentralized finance.',
    difficulty: 'Advanced',
    estimatedDurationMinutes: 52,
    xpReward: 250,
    order: 6,
    lessons: [
      {
        slug: 'defi-overview',
        title: 'What DeFi is',
        description: 'Learn how decentralized applications replace traditional intermediaries.',
        difficulty: 'Intermediate',
        estimatedDurationMinutes: 14,
        xpReward: 80,
        order: 1,
        content:
          'DeFi is the use of smart contracts to provide financial services without a central operator. It opens access but also transfers responsibility to the user.\n\nThat trade-off is the core of every DeFi decision.',
        takeaways: ['DeFi removes intermediaries', 'Users carry more responsibility', 'Smart contracts matter']
      },
      {
        slug: 'liquidity-and-yield',
        title: 'Liquidity and yield',
        description: 'See how pools, incentives, and fees create return opportunities.',
        difficulty: 'Advanced',
        estimatedDurationMinutes: 18,
        xpReward: 90,
        order: 2,
        content:
          'Liquidity pools let users earn fees and incentives, but the return profile is not risk-free. Understand where the yield comes from before placing capital.\n\nA high APY is only meaningful if the underlying risks are clear.',
        takeaways: ['Yield has a source', 'Pool risk is real', 'Read the incentive structure']
      },
      {
        slug: 'smart-contract-risk',
        title: 'Smart contract risk',
        description: 'Learn why audits, permissions, and failure modes must be reviewed.',
        difficulty: 'Advanced',
        estimatedDurationMinutes: 20,
        xpReward: 100,
        order: 3,
        content:
          'Every DeFi interaction depends on code. Audit quality, protocol maturity, and permission settings all shape the risk profile of a strategy.\n\nGood DeFi learners balance curiosity with healthy skepticism.',
        takeaways: ['Code is the counterparty', 'Audits matter', 'Permission risk matters']
      }
    ]
  }
];

const LEARNING_CATEGORIES = LEARNING_CATALOG.map((course) => course.category);

function normalizePercent(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function getReadingMinutes(content = '', fallbackMinutes = 5) {
  const words = String(content).trim().split(/\s+/).filter(Boolean).length;
  if (!words) return fallbackMinutes;
  return Math.max(3, Math.round(words / 180));
}

function getLessonSummary(lesson) {
  return lesson.summary || lesson.description || String(lesson.content || '').split('\n\n')[0] || '';
}

function getLessonKeyConcepts(lesson) {
  const concepts = Array.isArray(lesson.keyConcepts) && lesson.keyConcepts.length ? lesson.keyConcepts : lesson.takeaways || [];
  return concepts.slice(0, 6);
}

function getLookupIds(identifier) {
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    return { byId: identifier, bySlug: identifier };
  }

  return { byId: null, bySlug: identifier };
}

function getLessonProgressMap(progressDocs = []) {
  return progressDocs.reduce((map, doc) => {
    map.set(String(doc.lesson), doc);
    return map;
  }, new Map());
}

function summarizeCourse(course, lessons, progressMap) {
  const lessonSummaries = lessons.map((lesson) => {
    const progress = progressMap.get(String(lesson._id));
    const completionPercentage = normalizePercent(progress?.completionPercentage || 0);
    const xpEarned = progress?.xpEarned || 0;

    return {
      id: String(lesson._id),
      title: lesson.title,
      slug: lesson.slug,
      description: lesson.description,
      summary: getLessonSummary(lesson),
      keyConcepts: getLessonKeyConcepts(lesson),
      difficulty: lesson.difficulty,
      estimatedDurationMinutes: lesson.estimatedDurationMinutes,
      estimatedReadingMinutes: lesson.estimatedReadingMinutes || getReadingMinutes(lesson.content, lesson.estimatedDurationMinutes),
      xpReward: lesson.xpReward,
      order: lesson.order,
      completionPercentage,
      completed: Boolean(progress?.completed),
      lastAccessedAt: progress?.lastAccessedAt || null,
      xpEarned
    };
  });

  const averageCompletion = lessonSummaries.length
    ? Math.round(lessonSummaries.reduce((sum, lesson) => sum + lesson.completionPercentage, 0) / lessonSummaries.length)
    : 0;

  const completedLessons = lessonSummaries.filter((lesson) => lesson.completed).length;
  const earnedXp = lessonSummaries.reduce((sum, lesson) => sum + (lesson.xpEarned || 0), 0);

  return {
    id: String(course._id),
    title: course.title,
    slug: course.slug,
    category: course.category,
    description: course.description,
    difficulty: course.difficulty,
    estimatedDurationMinutes: course.estimatedDurationMinutes,
    xpReward: course.xpReward,
    order: course.order,
    lessonCount: lessons.length,
    completionPercentage: averageCompletion,
    completedLessons,
    earnedXp,
    status: averageCompletion >= 100 ? 'Completed' : averageCompletion > 0 ? 'In progress' : 'Not started',
    lessons: lessonSummaries
  };
}

async function seedCourse(courseSeed) {
  const course = await Course.findOneAndUpdate(
    { slug: courseSeed.slug },
    {
      title: courseSeed.title,
      slug: courseSeed.slug,
      category: courseSeed.category,
      description: courseSeed.description,
      difficulty: courseSeed.difficulty,
      estimatedDurationMinutes: courseSeed.estimatedDurationMinutes,
      xpReward: courseSeed.xpReward,
      order: courseSeed.order,
      lessonCount: courseSeed.lessons.length,
      isPublished: true
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const lessonIds = [];

  for (const lessonSeed of courseSeed.lessons) {
    const lesson = await Lesson.findOneAndUpdate(
      { slug: lessonSeed.slug },
      {
        course: course._id,
        courseSlug: course.slug,
        title: lessonSeed.title,
        slug: lessonSeed.slug,
        category: course.category,
        description: lessonSeed.description,
        summary: lessonSeed.summary || lessonSeed.description,
        keyConcepts: lessonSeed.keyConcepts || lessonSeed.takeaways || [],
        difficulty: lessonSeed.difficulty,
        estimatedDurationMinutes: lessonSeed.estimatedDurationMinutes,
        estimatedReadingMinutes: lessonSeed.estimatedReadingMinutes || getReadingMinutes(lessonSeed.content, lessonSeed.estimatedDurationMinutes),
        xpReward: lessonSeed.xpReward,
        order: lessonSeed.order,
        content: lessonSeed.content,
        takeaways: lessonSeed.takeaways,
        quiz: lessonSeed.quiz || []
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    lessonIds.push(lesson._id);
  }

  course.lessons = lessonIds;
  course.lessonCount = lessonIds.length;
  await course.save();

  return course;
}

export async function ensureLearningCatalogSeeded() {
  for (const courseSeed of LEARNING_CATALOG) {
    await seedCourse(courseSeed);
  }
}

export async function listLearningCourses(userId) {
  await ensureLearningCatalogSeeded();

  const [courses, lessons, progressDocs] = await Promise.all([
    Course.find({ isPublished: true }).sort({ order: 1, title: 1 }).lean(),
    Lesson.find().sort({ course: 1, order: 1, title: 1 }).lean(),
    LearningProgress.find({ user: userId }).lean()
  ]);

  const progressMap = getLessonProgressMap(progressDocs);
  const lessonsByCourse = lessons.reduce((map, lesson) => {
    const key = String(lesson.course);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(lesson);
    return map;
  }, new Map());

  const courseCards = courses.map((course) => {
    const courseLessons = lessonsByCourse.get(String(course._id)) || [];
    return summarizeCourse(course, courseLessons, progressMap);
  });

  const totalLessons = courseCards.reduce((sum, course) => sum + course.lessonCount, 0);
  const completedLessons = courseCards.reduce((sum, course) => sum + course.completedLessons, 0);
  const totalXpEarned = courseCards.reduce((sum, course) => sum + (course.earnedXp || 0), 0);
  const averageCompletion = courseCards.length
    ? Math.round(courseCards.reduce((sum, course) => sum + course.completionPercentage, 0) / courseCards.length)
    : 0;

  return {
    courses: courseCards,
    categories: LEARNING_CATEGORIES,
    stats: {
      totalCourses: courseCards.length,
      totalLessons,
      completedLessons,
      totalXpEarned,
      averageCompletion,
      completedCourses: courseCards.filter((course) => course.completionPercentage >= 100).length
    }
  };
}

export async function getLearningCourse(identifier, userId) {
  await ensureLearningCatalogSeeded();

  const lookup = getLookupIds(identifier);
  const course = lookup.byId ? await Course.findById(lookup.byId) : await Course.findOne({ slug: lookup.bySlug });

  if (!course) {
    throw new AppError('Course not found', 404);
  }

  const [lessons, progressDocs] = await Promise.all([
    Lesson.find({ course: course._id }).sort({ order: 1, title: 1 }).lean(),
    LearningProgress.find({ user: userId, course: course._id }).lean()
  ]);

  const progressMap = getLessonProgressMap(progressDocs);
  const courseDetails = summarizeCourse(course, lessons, progressMap);

  return {
    course: courseDetails,
    lessons: courseDetails.lessons,
    stats: {
      totalLessons: courseDetails.lessonCount,
      completedLessons: courseDetails.completedLessons,
      completionPercentage: courseDetails.completionPercentage,
      totalXpEarned: courseDetails.earnedXp
    }
  };
}

export async function getLearningLesson(identifier, userId) {
  await ensureLearningCatalogSeeded();

  const lookup = getLookupIds(identifier);
  const lesson = lookup.byId ? await Lesson.findById(lookup.byId) : await Lesson.findOne({ slug: lookup.bySlug });

  if (!lesson) {
    throw new AppError('Lesson not found', 404);
  }

  const [course, progress, siblings] = await Promise.all([
    Course.findById(lesson.course).lean(),
    LearningProgress.findOne({ user: userId, lesson: lesson._id }).lean(),
    Lesson.find({ course: lesson.course }).sort({ order: 1, title: 1 }).lean()
  ]);

  if (!course) {
    throw new AppError('Course not found', 404);
  }

  const progressMap = getLessonProgressMap(progress ? [progress] : []);
  const courseSummary = summarizeCourse(course, siblings, progressMap);
  const lessonIndex = siblings.findIndex((item) => String(item._id) === String(lesson._id));
  const progressRecord = progress || null;

  return {
    course: courseSummary,
    lesson: {
      id: String(lesson._id),
      title: lesson.title,
      slug: lesson.slug,
      description: lesson.description,
      summary: getLessonSummary(lesson),
      keyConcepts: getLessonKeyConcepts(lesson),
      difficulty: lesson.difficulty,
      estimatedDurationMinutes: lesson.estimatedDurationMinutes,
      estimatedReadingMinutes: lesson.estimatedReadingMinutes || getReadingMinutes(lesson.content, lesson.estimatedDurationMinutes),
      xpReward: lesson.xpReward,
      content: lesson.content,
      takeaways: lesson.takeaways || [],
      order: lesson.order,
      completed: Boolean(progressRecord?.completed),
      completionPercentage: normalizePercent(progressRecord?.completionPercentage || 0),
      xpEarned: progressRecord?.xpEarned || 0,
      lastAccessedAt: progressRecord?.lastAccessedAt || null
    },
    progress: progressRecord,
    previousLesson: lessonIndex > 0 ? { id: String(siblings[lessonIndex - 1]._id), title: siblings[lessonIndex - 1].title } : null,
    nextLesson: lessonIndex >= 0 && lessonIndex < siblings.length - 1 ? { id: String(siblings[lessonIndex + 1]._id), title: siblings[lessonIndex + 1].title } : null
  };
}

export async function updateLearningProgress(userId, payload = {}) {
  await ensureLearningCatalogSeeded();

  const { lessonId, completionPercentage = 0, completed = false, notes = '' } = payload;
  if (!lessonId) {
    throw new AppError('lessonId is required', 400);
  }

  const lesson = mongoose.Types.ObjectId.isValid(lessonId) ? await Lesson.findById(lessonId) : await Lesson.findOne({ slug: lessonId });
  if (!lesson) {
    throw new AppError('Lesson not found', 404);
  }

  const course = await Course.findById(lesson.course);
  if (!course) {
    throw new AppError('Course not found', 404);
  }

  const normalizedCompletion = normalizePercent(completionPercentage);
  const resolvedCompleted = completed || normalizedCompletion >= 100;
  const safeNotes = sanitizeText(notes, { maxLength: 1000, allowNewlines: true });

  const existingProgress = await LearningProgress.findOne({ user: userId, lesson: lesson._id });
  const previousXp = existingProgress?.xpEarned || 0;
  const targetXp = Math.round((lesson.xpReward * normalizedCompletion) / 100);
  const xpDelta = Math.max(0, targetXp - previousXp);

  const nextProgress = await LearningProgress.findOneAndUpdate(
    { user: userId, lesson: lesson._id },
    {
      user: userId,
      course: course._id,
      lesson: lesson._id,
      completionPercentage: normalizedCompletion,
      completed: resolvedCompleted,
      xpEarned: targetXp,
      notes: safeNotes,
      lastAccessedAt: new Date(),
      completedAt: resolvedCompleted ? existingProgress?.completedAt || new Date() : existingProgress?.completedAt || null
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (xpDelta > 0) {
    await User.findByIdAndUpdate(userId, { $inc: { xp: xpDelta } });
  }

  try {
    const { invalidateLearningAnalyticsCache } = await import('./learnIntelligenceService.js');
    invalidateLearningAnalyticsCache(userId);
  } catch {
    // Cache invalidation is best-effort.
  }

  const [lessons, progressDocs] = await Promise.all([
    Lesson.find({ course: course._id }).sort({ order: 1, title: 1 }).lean(),
    LearningProgress.find({ user: userId, course: course._id }).lean()
  ]);

  const progressMap = getLessonProgressMap(progressDocs);
  const courseSummary = summarizeCourse(course, lessons, progressMap);

  return {
    progress: nextProgress,
    lesson: {
      id: String(lesson._id),
      title: lesson.title,
      completionPercentage: normalizedCompletion,
      completed: resolvedCompleted,
      xpEarned: targetXp
    },
    course: courseSummary,
    xpDelta
  };
}

export function getLegacyLearningModules(courses = []) {
  return courses.map((course) => ({
    id: course.id,
    title: course.title,
    xp: course.xpReward,
    description: course.description
  }));
}