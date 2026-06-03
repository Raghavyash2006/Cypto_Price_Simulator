import Course from '../../models/Course.js';
import Lesson from '../../models/Lesson.js';
import LearningAIConversation from '../../models/LearningAIConversation.js';
import { AppError } from '../../utils/AppError.js';
import { getEnv } from '../../config/env.js';
import { generateGeminiText } from './integrations/geminiService.js';
import { ensureLearningCatalogSeeded } from './learnService.js';
import { getMarketOverview } from './marketService.js';
import { sanitizeText } from '../../utils/inputSanitizer.js';

const RECENT_REQUEST_WINDOW_MS = 10_000;
const MAX_TURNS = 8;
const recentRequestCache = new Map();

function safeText(value, fallback = '') {
  return sanitizeText(value ?? fallback, { maxLength: 2000, allowNewlines: true });
}

function safeArray(value) {
  return Array.isArray(value) ? value.filter((item) => safeText(item).length > 0) : [];
}

function stripCodeFences(value) {
  return String(value || '')
    .trim()
    .replace(/^```(?:json|markdown)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function extractJsonCandidate(value) {
  const text = stripCodeFences(value);
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

function tryParseJson(value) {
  const candidate = extractJsonCandidate(value);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function getLessonSummary(lesson) {
  return safeText(lesson?.summary || lesson?.description || String(lesson?.content || '').split('\n\n')[0] || '');
}

function getLessonKeyConcepts(lesson) {
  const concepts = Array.isArray(lesson?.keyConcepts) && lesson.keyConcepts.length ? lesson.keyConcepts : lesson?.takeaways || [];
  return safeArray(concepts).slice(0, 6);
}

function buildLessonContext(lesson, course, marketOverview, action, question, history = []) {
  const topMarkets = Array.isArray(marketOverview?.coins) ? marketOverview.coins.slice(0, 5) : [];
  const marketLines = topMarkets
    .map((coin) => `${coin.name} (${String(coin.symbol || '').toUpperCase()}): $${Number(coin.current_price || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`)
    .join('\n');

  return [
    'You are an AI teaching assistant for a crypto learning platform.',
    `Action: ${action}`,
    'Write in beginner-friendly language. Include simplified analogies, real-world examples, key takeaways, and market relevance.',
    'Do not mention backend details or claim certainty about markets.',
    'Return JSON only with keys: title, markdown, keyTakeaways, examples, marketRelevance, followUpQuestion.',
    '',
    `Course: ${safeText(course?.title)}`,
    `Lesson: ${safeText(lesson?.title)}`,
    `Lesson summary: ${getLessonSummary(lesson)}`,
    `Key concepts: ${getLessonKeyConcepts(lesson).join(', ') || 'None provided'}`,
    `Question: ${safeText(question) || 'No specific question provided.'}`,
    `Recent turns: ${history.length ? JSON.stringify(history.slice(-4)) : 'No prior AI learning turns.'}`,
    `Market relevance context: ${marketLines || 'Market data temporarily unavailable.'}`
  ].join('\n');
}

function buildFallbackResponse({ action, lesson, course, question, marketOverview }) {
  const titleMap = {
    explain: 'Lesson explanation',
    summarize: 'Lesson summary',
    examples: 'Real-world examples'
  };

  const marketAsset = Array.isArray(marketOverview?.coins) && marketOverview.coins[0]
    ? `${marketOverview.coins[0].name} (${String(marketOverview.coins[0].symbol || '').toUpperCase()})`
    : 'the broader crypto market';

  const keyTakeaways = getLessonKeyConcepts(lesson);
  const fallbackTakeaways = keyTakeaways.length ? keyTakeaways : ['Focus on the main idea', 'Connect the concept to risk management', 'Practice with small decisions in the simulator'];

  return {
    title: titleMap[action] || 'AI teaching response',
    markdown: [
      `## ${titleMap[action] || 'AI teaching response'}`,
      '',
      `**Lesson:** ${safeText(course?.title)} - ${safeText(lesson?.title)}`,
      '',
      action === 'examples'
        ? `Here are practical examples tied to this lesson. ${safeText(question) ? `You asked: ${safeText(question)}` : ''}`
        : `Here is a beginner-friendly explanation of the concept. ${safeText(question) ? `You asked: ${safeText(question)}` : ''}`,
      '',
      `**Real-world connection:** ${marketAsset} can reflect how fast sentiment and risk appetite shift, which makes this concept useful when you are studying volatility.`,
      '',
      `**Key takeaways**`,
      ...fallbackTakeaways.map((item) => `- ${item}`),
      '',
      `**Next step:** Return to the simulator and apply the idea in a small, low-risk practice decision.`
    ].join('\n'),
    keyTakeaways: fallbackTakeaways,
    examples: action === 'examples' ? ['Compare the concept to a real trade setup.', 'Watch how the idea changes when volatility rises.'] : [],
    marketRelevance: `This concept matters when the market is moving around ${marketAsset} or other high-volatility assets because it helps you manage decisions, not just memorize definitions.`,
    followUpQuestion: 'Would you like a simpler explanation, another example, or a quick summary?'
  };
}

function normalizeAiPayload(payload, fallback) {
  const parsed = typeof payload === 'string' ? tryParseJson(payload) : payload;
  if (!parsed || typeof parsed !== 'object') return fallback;

  const markdown = safeText(parsed.markdown) || safeText(parsed.content) || fallback.markdown;
  const title = safeText(parsed.title) || fallback.title;
  const keyTakeaways = safeArray(parsed.keyTakeaways).slice(0, 6);
  const examples = safeArray(parsed.examples).slice(0, 6);

  return {
    title,
    markdown: markdown || fallback.markdown,
    keyTakeaways: keyTakeaways.length ? keyTakeaways : fallback.keyTakeaways,
    examples: examples.length ? examples : fallback.examples,
    marketRelevance: safeText(parsed.marketRelevance) || fallback.marketRelevance,
    followUpQuestion: safeText(parsed.followUpQuestion) || fallback.followUpQuestion
  };
}

function makeRequestKey({ userId, lessonId, action, question }) {
  return [String(userId), String(lessonId), action, safeText(question).toLowerCase()].join('::');
}

async function getLessonBundle(lessonId) {
  const lesson = await Lesson.findById(lessonId).lean();
  if (!lesson) {
    throw new AppError('Lesson not found', 404);
  }

  const course = await Course.findById(lesson.course).lean();
  if (!course) {
    throw new AppError('Course not found', 404);
  }

  return { lesson, course };
}

async function getRecentTurns(userId, lessonId) {
  const conversation = await LearningAIConversation.findOne({ userId, lessonId }).lean();
  return conversation?.turns || [];
}

async function saveConversationTurn({ userId, lesson, course, action, question, response, model, fallbackUsed, marketOverview }) {
  const turn = {
    action,
    question: safeText(question),
    responseTitle: safeText(response.title),
    responseMarkdown: safeText(response.markdown),
    model: safeText(model),
    fallbackUsed: Boolean(fallbackUsed),
    contextSnapshot: {
      course: { id: String(course._id), title: course.title, slug: course.slug },
      lesson: { id: String(lesson._id), title: lesson.title, slug: lesson.slug },
      market: {
        topCoin: marketOverview?.coins?.[0]?.name || null,
        trendingCount: Array.isArray(marketOverview?.trending) ? marketOverview.trending.length : 0
      }
    }
  };

  const conversation = await LearningAIConversation.findOneAndUpdate(
    { userId, lessonId: lesson._id },
    {
      $set: {
        courseId: course._id,
        lessonSlug: lesson.slug,
        title: lesson.title,
        lastAction: action,
        lastMessageAt: new Date()
      },
      $push: { turns: { $each: [turn], $slice: -MAX_TURNS } }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return conversation;
}

async function generateLessonAIResponse({ action, userId, lessonId, question }) {
  await ensureLearningCatalogSeeded();
  const { lesson, course } = await getLessonBundle(lessonId);
  const [marketOverview, history] = await Promise.all([
    getMarketOverview({ limit: 6, trendingLimit: 4, moversLimit: 4 }).catch(() => null),
    getRecentTurns(userId, lesson._id)
  ]);

  const requestKey = makeRequestKey({ userId, lessonId: lesson._id, action, question });
  const now = Date.now();
  const cached = recentRequestCache.get(requestKey);
  if (cached && cached.expiresAt > now) {
    return cached.payload;
  }

  const fallback = buildFallbackResponse({ action, lesson, course, question, marketOverview });
  const systemInstruction = [
    'You are an AI teacher for a crypto learning course.',
    'Always respond as valid JSON only. No markdown fences, no commentary outside the JSON object.',
    'Keep answers beginner-friendly, educational, and grounded in the current lesson.',
    'Include simplified analogies, real-world examples, key takeaways, and market relevance.',
    'If the lesson content is missing, still answer safely using the course title and general crypto knowledge.'
  ].join(' ');

  const prompt = buildLessonContext(lesson, course, marketOverview, action, question, history);

  let response;
  let model = getEnv().geminiModel;
  let fallbackUsed = false;

  try {
    const geminiResult = await generateGeminiText({
      prompt,
      systemInstruction,
      model: getEnv().geminiModel,
      temperature: action === 'examples' ? 0.55 : 0.4,
      maxOutputTokens: action === 'summarize' ? 900 : 1200
    });

    model = geminiResult.model || model;
    response = normalizeAiPayload(geminiResult.content, fallback);
    if (!response?.markdown) {
      response = fallback;
      fallbackUsed = true;
    }
  } catch {
    response = fallback;
    fallbackUsed = true;
  }

  const conversation = await saveConversationTurn({
    userId,
    lesson,
    course,
    action,
    question: safeText(question),
    response,
    model,
    fallbackUsed,
    marketOverview
  });

  const payload = {
    conversationId: String(conversation._id),
    course: { id: String(course._id), title: course.title, slug: course.slug },
    lesson: { id: String(lesson._id), title: lesson.title, slug: lesson.slug },
    response,
    fallbackUsed,
    model,
    action,
    timestamp: new Date().toISOString()
  };

  recentRequestCache.set(requestKey, { expiresAt: now + RECENT_REQUEST_WINDOW_MS, payload });
  return payload;
}

export async function explainLesson({ userId, lessonId, question }) {
  return generateLessonAIResponse({ action: 'explain', userId, lessonId, question });
}

export async function summarizeLesson({ userId, lessonId, question }) {
  return generateLessonAIResponse({ action: 'summarize', userId, lessonId, question });
}

export async function generateLessonExamples({ userId, lessonId, question }) {
  return generateLessonAIResponse({ action: 'examples', userId, lessonId, question });
}