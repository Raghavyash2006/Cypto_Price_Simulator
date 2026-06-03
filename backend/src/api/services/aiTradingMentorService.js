import AIChatHistory from '../../models/AIChatHistory.js';
import User from '../../models/User.js';
import { getEnv } from '../../config/env.js';
import { generateGeminiText } from './integrations/geminiService.js';
import { awardXp } from './gamificationService.js';
import { getMarketOverview } from './marketService.js';
import { getPortfolioSnapshot, listTransactions } from './portfolioService.js';

const MAX_HISTORY_TURNS = 12;
const MAX_RECENT_TRADES = 10;
const MAX_MARKET_COINS = 8;

function safeText(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function formatMoney(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'n/a';
  return `$${numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'n/a';
  return `${numeric.toFixed(2)}%`;
}

function flattenHistoryTurns(turns = []) {
  return turns.flatMap((turn) => [
    { role: 'user', content: turn.message },
    { role: 'assistant', content: turn.response }
  ]);
}

function buildMarketSnapshot(marketOverview = {}) {
  const global = marketOverview.global || {};
  const coins = Array.isArray(marketOverview.coins) ? marketOverview.coins.slice(0, MAX_MARKET_COINS) : [];
  const trending = Array.isArray(marketOverview.trending) ? marketOverview.trending.slice(0, MAX_MARKET_COINS) : [];
  const movers = marketOverview.movers || { topGainers: [], topLosers: [] };

  return {
    global: {
      totalMarketCap: global.total_market_cap?.usd || null,
      totalVolume24h: global.total_volume?.usd || null,
      marketCapChange24h: global.market_cap_change_percentage_24h_usd || null,
      activeCryptocurrencies: global.active_cryptocurrencies || null
    },
    topCoins: coins.map((coin) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol?.toUpperCase(),
      price: coin.current_price,
      change24h: coin.price_change_percentage_24h,
      marketCap: coin.market_cap,
      volume24h: coin.total_volume
    })),
    trending: trending.map((coin) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol?.toUpperCase(),
      marketCapRank: coin.market_cap_rank
    })),
    gainers: (movers.topGainers || []).slice(0, 4).map((coin) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol?.toUpperCase(),
      change24h: coin.price_change_percentage_24h
    })),
    losers: (movers.topLosers || []).slice(0, 4).map((coin) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol?.toUpperCase(),
      change24h: coin.price_change_percentage_24h
    }))
  };
}

function buildPortfolioBrief(snapshot = {}) {
  const summary = snapshot.summary || {};
  const holdings = Array.isArray(snapshot.holdings) ? snapshot.holdings : [];
  const allocation = Array.isArray(snapshot.allocation) ? snapshot.allocation : [];
  const performance = Array.isArray(snapshot.performance) ? snapshot.performance : [];

  return {
    summary: {
      investedCapital: formatMoney(summary.investedCapital),
      totalValue: formatMoney(summary.totalValue),
      profitLoss: formatMoney(summary.profitLoss),
      profitLossPct: formatPercent(summary.profitLossPct),
      virtualBalance: formatMoney(summary.virtualBalance),
      holdingsCount: summary.holdingsCount || holdings.length,
      realizedPnL: formatMoney(summary.realizedPnL),
      bestPerformer: summary.bestPerformer?.symbol || null,
      worstPerformer: summary.worstPerformer?.symbol || null
    },
    holdings: holdings.slice(0, 6).map((holding) => ({
      symbol: holding.symbol,
      coinName: holding.coinName,
      quantity: holding.quantity,
      marketValue: holding.marketValue,
      profitLoss: holding.profitLoss,
      profitLossPct: holding.profitLossPct,
      allocationPct: holding.allocationPct
    })),
    allocation: allocation.slice(0, 6).map((item) => ({
      symbol: item.symbol,
      coinName: item.coinName,
      marketValue: item.marketValue,
      allocationPct: item.allocationPct,
      profitLoss: item.profitLoss
    })),
    performance: performance.slice(0, 6).map((item) => ({
      symbol: item.symbol,
      coinName: item.coinName,
      marketValue: item.marketValue,
      costBasis: item.costBasis,
      profitLoss: item.profitLoss,
      profitLossPct: item.profitLossPct
    })),
    risk: snapshot.risk || {},
    insights: snapshot.insights || {},
    growth: snapshot.growth || {},
    benchmark: snapshot.benchmark ?? null
  };
}

function buildSuggestedPrompts(context) {
  const topHolding = context.portfolio?.holdings?.[0];
  const topCoin = context.market?.topCoins?.[0];

  return [
    topCoin ? `Should I buy ${topCoin.name}?` : 'Should I buy Bitcoin?',
    topHolding ? `Why is my ${topHolding.coinName} position moving like this?` : 'Why is my portfolio losing money?',
    'Explain diversification for crypto portfolios.',
    'What is market cap and why does it matter?',
    'Which coin in my portfolio looks risky?'
  ];
}

async function loadTradingMentorContext(userId) {
  const [user, portfolioSnapshot, recentTrades, marketOverview] = await Promise.all([
    User.findById(userId).select('username name level xp streak virtualBalance referralCount avatar').lean().exec(),
    getPortfolioSnapshot(userId),
    listTransactions(userId, MAX_RECENT_TRADES),
    getMarketOverview({ limit: MAX_MARKET_COINS, trendingLimit: 5, moversLimit: 5 })
  ]);

  if (!user) {
    throw new Error('User not found');
  }

  return {
    user: {
      id: String(user._id),
      username: user.username,
      name: user.name,
      level: user.level,
      xp: user.xp,
      streak: user.streak,
      virtualBalance: user.virtualBalance,
      avatar: user.avatar,
      referralCount: user.referralCount
    },
    portfolio: buildPortfolioBrief(portfolioSnapshot),
    trades: recentTrades,
    market: buildMarketSnapshot(marketOverview)
  };
}

function buildSystemInstruction(context) {
  return [
    'You are a premium AI Trading Mentor inside a crypto simulator.',
    'Your job is to explain crypto clearly, analyze portfolio risk, suggest diversification ideas, and summarize market conditions using the supplied context only.',
    'Keep the tone calm, practical, beginner-friendly, and high trust.',
    'Use markdown with short sections, bullets, and bold labels when useful.',
    'If the user asks about investing, trading, or buying a coin, remind them this is educational guidance and not guaranteed returns.',
    'Never mention private keys, API keys, or anything about backend implementation.',
    'Always refer to the user portfolio, cash balance, holdings, recent trades, market overview, and risk exposure when relevant.',
    'End with one practical next step or a follow-up question when appropriate.',
    '',
    `User profile: ${JSON.stringify(context.user)}`,
    `Portfolio snapshot: ${JSON.stringify(context.portfolio)}`,
    `Market snapshot: ${JSON.stringify(context.market)}`,
    `Recent trades: ${JSON.stringify(context.trades)}`
  ].join('\n');
}

function buildUserPrompt({ message, history }) {
  const historyText = history
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => `User: ${safeText(turn.message)}\nAssistant: ${safeText(turn.response)}`)
    .join('\n\n');

  return [
    'Use the provided context to answer the user question in a premium fintech mentor tone.',
    'Question:',
    safeText(message),
    '',
    'Conversation memory:',
    historyText || 'No prior conversation history.',
    '',
    'Important response rules:',
    '- Explain simply for beginners.',
    '- Mention risks when concentration or volatility is elevated.',
    '- Tie advice to the user portfolio and market state when possible.',
    '- Avoid generic filler and avoid pretending certainty.',
    '- Prefer compact markdown headings like Quick Read, Risk Check, and Next Step.'
  ].join('\n');
}

function getFallbackReply({ message, context }) {
  const topHolding = context.portfolio.holdings[0];
  const topCoin = context.market.topCoins[0];

  return [
    `**Quick read:** ${safeText(message)} is best answered with the current portfolio and market context rather than a guess.`,
    topHolding
      ? `**Portfolio note:** Your largest visible position is ${topHolding.coinName || topHolding.symbol}, so diversification and position sizing matter.`
      : '**Portfolio note:** You currently have limited holdings, so focus on building a balanced starter portfolio.',
    topCoin
      ? `**Market note:** ${topCoin.name} is one of the most visible assets right now, so a move there can affect sentiment across the market.`
      : '**Market note:** Market data is limited, so keep your decisions conservative and education-first.',
    '**Risk note:** Crypto can move quickly, so never size a position based on hope alone.',
    '**Next step:** Compare your current allocation with your risk tolerance before making the next trade.'
  ].join('\n\n');
}

export async function getTradingMentorSession(userId) {
  const [context, historyRows] = await Promise.all([
    loadTradingMentorContext(userId),
    AIChatHistory.find({ userId }).sort({ createdAt: -1 }).limit(40).lean().exec()
  ]);

  const history = [...historyRows].reverse();

  return {
    user: context.user,
    portfolio: context.portfolio,
    market: context.market,
    trades: context.trades,
    history,
    messages: flattenHistoryTurns(history),
    suggestedPrompts: buildSuggestedPrompts(context),
    quickStats: {
      conversationTurns: history.length,
      holdingsTracked: context.portfolio.holdings.length,
      recentTrades: context.trades.length,
      marketCoinsTracked: context.market.topCoins.length
    }
  };
}

export async function clearTradingMentorHistory(userId) {
  const result = await AIChatHistory.deleteMany({ userId });
  return {
    deletedCount: result.deletedCount || 0
  };
}

export async function createTradingMentorReply({ userId, message }) {
  const context = await loadTradingMentorContext(userId);
  const historyRows = await AIChatHistory.find({ userId }).sort({ createdAt: -1 }).limit(MAX_HISTORY_TURNS).lean().exec();
  const history = [...historyRows].reverse();
  const systemInstruction = buildSystemInstruction(context);
  const prompt = buildUserPrompt({ message, history });
  const { content, model, mode } = await generateGeminiText({
    prompt,
    systemInstruction,
    history: history.flatMap((turn) => [
      { role: 'user', parts: [{ text: safeText(turn.message) }] },
      { role: 'model', parts: [{ text: safeText(turn.response) }] }
    ]),
    model: getEnv().geminiModel,
    temperature: 0.42,
    maxOutputTokens: 1200
  });

  const reply = safeText(content) || getFallbackReply({ message, context });

  const turn = await AIChatHistory.create({
    userId,
    role: 'user',
    message: safeText(message),
    response: reply,
    model: `${model || getEnv().geminiModel || 'gemini-1.5-flash'}:${mode || 'mock'}`,
    contextSnapshot: {
      user: context.user,
      suggestedPrompts: buildSuggestedPrompts(context),
      quickStats: {
        holdingsTracked: context.portfolio.holdings.length,
        recentTrades: context.trades.length,
        marketCoinsTracked: context.market.topCoins.length
      }
    },
    marketSnapshot: context.market,
    portfolioSnapshot: context.portfolio
  });

  awardXp(userId, 12, 'ai mentor session', {
    turnId: String(turn._id),
    messageLength: safeText(message).length
  }).catch(() => null);

  return {
    turn,
    context,
    reply,
    suggestedPrompts: buildSuggestedPrompts(context)
  };
}