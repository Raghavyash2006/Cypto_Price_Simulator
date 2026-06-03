import Conversation from '../../models/Conversation.js';
import User from '../../models/User.js';
import { getMarketSnapshot, getTopMovers } from '../../services/coingeckoService.js';
import { buildLearningPath, buildRecommendations, buildSuggestedPrompts } from './learningService.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MAX_CONVERSATION_MESSAGES = 24;
const MAX_STORED_MESSAGES = 40;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function trimText(value, length = 120) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, length);
}

function formatPrice(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'n/a';
  if (value >= 1000) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `$${value.toFixed(2)}`;
}

function buildMarketBrief(snapshot = [], movers = {}) {
  const topMarkets = snapshot.slice(0, 5).map((coin) => ({
    name: coin.name,
    symbol: coin.symbol?.toUpperCase(),
    price: coin.current_price,
    change24h: coin.price_change_percentage_24h,
    marketCap: coin.market_cap
  }));

  const topGainers = (movers.topGainers || []).slice(0, 3).map((coin) => ({
    name: coin.name,
    symbol: coin.symbol?.toUpperCase(),
    change24h: coin.price_change_percentage_24h
  }));

  const topLosers = (movers.topLosers || []).slice(0, 3).map((coin) => ({
    name: coin.name,
    symbol: coin.symbol?.toUpperCase(),
    change24h: coin.price_change_percentage_24h
  }));

  const summaryLines = [
    `Market snapshot highlights ${topMarkets[0]?.name || 'major crypto assets'} and adjacent momentum shifts.`,
    topGainers.length ? `Top gainers: ${topGainers.map((coin) => `${coin.name} (${coin.symbol})`).join(', ')}.` : 'No strong gainers detected right now.',
    topLosers.length ? `Top pullbacks: ${topLosers.map((coin) => `${coin.name} (${coin.symbol})`).join(', ')}.` : 'No notable pullbacks detected right now.'
  ];

  const marketTable = topMarkets
    .map((coin) => `${coin.name} (${coin.symbol}): ${formatPrice(coin.price)}, 24h ${Number(coin.change24h || 0).toFixed(2)}%`)
    .join('\n');

  return {
    summary: summaryLines.join(' '),
    table: marketTable,
    topMarkets,
    topGainers,
    topLosers
  };
}

function getConversationSnippet(conversation) {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  return messages.slice(-MAX_CONVERSATION_MESSAGES).map((message) => ({
    role: message.role,
    content: message.content
  }));
}

function buildSystemPrompt({ user, recommendations, learningPath, marketBrief, conversationSummary }) {
  const learningPathText = learningPath.map((step, index) => `${index + 1}. ${step.title}`).join('\n');
  return [
    'You are Crypto Coach AI, a premium finance mentor embedded inside a crypto learning product.',
    'Your goals are to explain crypto in beginner-friendly language, provide educational investment guidance, analyze risk, personalize learning paths, and recommend practical next steps.',
    'Keep answers concise, clear, and actionable. Use short paragraphs and simple language. Prefer markdown bullets when it helps readability.',
    'Do not claim guaranteed returns, do not encourage reckless leverage, and remind the user that the guidance is educational rather than financial advice when discussing investments.',
    'When a response involves market conditions, use the supplied market summary and explain uncertainty in plain language.',
    'If the user is a beginner, slow down and define terms. If the user is advanced, keep the answer more strategic and compact.',
    '',
    `User level: ${recommendations.level}`,
    `Learning focus: ${recommendations.focus}`,
    `Conversation summary: ${conversationSummary || 'No prior summary yet.'}`,
    'Personalized learning path:',
    learningPathText,
    '',
    'Current market snapshot:',
    marketBrief.summary,
    marketBrief.table,
    '',
    'Finish responses with a practical next step or a suggested prompt when appropriate.'
  ].join('\n');
}

function buildSuggestedMessage(userMessage, marketBrief, recommendations) {
  const message = trimText(userMessage, 180);
  const topCoin = marketBrief.topMarkets[0];
  return [
    `User asked: ${message}`,
    `Focus area: ${recommendations.focus}`,
    topCoin ? `Most visible market asset: ${topCoin.name} (${topCoin.symbol})` : 'No specific top asset available.',
    'Provide the best educational response and keep the tone encouraging but realistic.'
  ].join('\n');
}

async function getMarketBrief() {
  try {
    const [snapshot, movers] = await Promise.all([getMarketSnapshot(), getTopMovers(10)]);
    return buildMarketBrief(snapshot, movers);
  } catch {
    return {
      summary: 'Market data is temporarily unavailable. Base the response on general crypto concepts and risk management.',
      table: 'No live market snapshot available.',
      topMarkets: [],
      topGainers: [],
      topLosers: []
    };
  }
}

export async function getOrCreateConversation(userId) {
  const conversation = (await Conversation.findOne({ user: userId }).sort({ updatedAt: -1 })) || (await Conversation.create({ user: userId, title: 'AI Mentor' }));

  return conversation;
}

export async function getMentorSession(userId) {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new Error('User not found');
  }

  const [conversation, marketBrief] = await Promise.all([getOrCreateConversation(userId), getMarketBrief()]);
  const recommendations = buildRecommendations(user);
  const learningPath = buildLearningPath(user);
  const suggestedPrompts = buildSuggestedPrompts(user, { topMovers: marketBrief.topMarkets });

  return {
    user: {
      id: user._id,
      username: user.username,
      name: user.name,
      level: user.level,
      xp: user.xp,
      streak: user.streak,
      avatar: user.avatar,
      referralCode: user.referralCode
    },
    conversation: {
      id: conversation._id,
      title: conversation.title,
      summary: conversation.summary,
      messages: getConversationSnippet(conversation)
    },
    learningPath,
    suggestedPrompts,
    recommendations,
    marketSummary: marketBrief,
    quickStats: {
      conversationLength: conversation.messages?.length || 0,
      marketAssetsTracked: marketBrief.topMarkets.length
    }
  };
}

async function* streamOpenAICompletion(messages) {
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      stream: true,
      temperature: 0.45,
      messages
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('OpenAI stream is unavailable');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (!payload || payload === '[DONE]') continue;

      let parsed;
      try {
        parsed = JSON.parse(payload);
      } catch {
        continue;
      }

      const delta = parsed.choices?.[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }
}

async function* streamFallbackCompletion({ user, userMessage, marketBrief, learningPath, recommendations }) {
  const intro = recommendations.level === 'beginner'
    ? `Let's keep this simple. ${trimText(userMessage, 140)} is best answered by building from the basics.`
    : `Here is a concise mentor view on ${trimText(userMessage, 140)}.`;

  const riskNote = 'Educational note: crypto moves fast, so position sizing and downside planning matter more than predicting a single price target.';
  const learningStep = `Suggested next step: ${learningPath[0]?.title || 'review your current strategy and practice with the simulator.'}`;
  const marketLine = marketBrief.topMarkets[0]
    ? `Market context: ${marketBrief.topMarkets[0].name} is one of the most visible assets right now, so it is worth watching for volatility and confirmation rather than chasing movement.`
    : 'Market context is currently limited, so use general risk management and watch for volatility.';

  const text = [intro, marketLine, riskNote, learningStep].join('\n\n');
  for (const chunk of text.match(/.{1,120}(\s|$)/g) || [text]) {
    yield chunk;
    await sleep(18);
  }
}

function limitMessages(messages) {
  return messages.slice(-MAX_CONVERSATION_MESSAGES);
}

export async function generateMentorReply({ user, conversation, userMessage }) {
  const marketBrief = await getMarketBrief();
  const recommendations = buildRecommendations(user);
  const learningPath = buildLearningPath(user);
  const priorSummary = conversation.summary || '';
  const systemPrompt = buildSystemPrompt({
    user,
    recommendations,
    learningPath,
    marketBrief,
    conversationSummary: priorSummary
  });

  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...getConversationSnippet(conversation),
    { role: 'user', content: buildSuggestedMessage(userMessage, marketBrief, recommendations) }
  ];

  if (!process.env.OPENAI_API_KEY) {
    return { stream: streamFallbackCompletion({ user, userMessage, marketBrief, learningPath, recommendations }), marketBrief };
  }

  return {
    stream: streamOpenAICompletion(chatMessages),
    marketBrief
  };
}

export async function saveConversationTurn({ conversation, userMessage, assistantMessage }) {
  conversation.messages = Array.isArray(conversation.messages) ? conversation.messages : [];
  conversation.messages.push({ role: 'user', content: userMessage, metadata: { source: 'mentor' } });
  conversation.messages.push({ role: 'assistant', content: assistantMessage, metadata: { source: 'mentor-ai' } });
  conversation.messages = limitMessages(conversation.messages);
  conversation.lastMessageAt = new Date();

  if (!conversation.title || conversation.title === 'AI Mentor') {
    conversation.title = trimText(userMessage, 36) || 'AI Mentor';
  }

  await conversation.save();
  return conversation;
}
