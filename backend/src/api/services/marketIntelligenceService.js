import axios from 'axios';
import NodeCache from 'node-cache';
import { getEnv } from '../../config/env.js';
import MarketSnapshot from '../../models/MarketSnapshot.js';
import { getGlobalMarketData, getMarketSnapshot, getTopMovers, getTrending, getTrendingCategories } from '../../services/coingeckoService.js';
import { generateGeminiText } from './integrations/geminiService.js';
import { getPortfolioSnapshot } from './portfolioService.js';
import { recordMarketEvent, listMarketEvents } from './marketEventService.js';

const cache = new NodeCache({ stdTTL: 60, useClones: false });

function minuteKey(date = new Date()) {
  const value = new Date(date);
  value.setSeconds(0, 0);
  return value.toISOString();
}

function clampPercentage(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric));
}

async function getFearGreedIndex() {
  const key = 'fear-greed';
  const cached = cache.get(key);
  if (cached) return cached;

  try {
    const response = await axios.get('https://api.alternative.me/fng/', { timeout: 8000, params: { limit: 1, format: 'json' } });
    const entry = response.data?.data?.[0];
    const value = {
      score: Number(entry?.value) || 50,
      classification: String(entry?.value_classification || 'Neutral'),
      timestamp: Number(entry?.timestamp || Date.now() / 1000)
    };
    cache.set(key, value, 300);
    return value;
  } catch {
    const fallback = { score: 50, classification: 'Neutral', timestamp: Math.floor(Date.now() / 1000) };
    cache.set(key, fallback, 120);
    return fallback;
  }
}

function buildVolatilityScore(snapshot = []) {
  if (!snapshot.length) return 0;
  const sample = snapshot.slice(0, 20);
  const averageMove = sample.reduce((sum, coin) => sum + Math.abs(Number(coin.price_change_percentage_24h || 0)), 0) / sample.length;
  return clampPercentage(averageMove * 1.5);
}

function buildBullishBias(gainers = [], losers = []) {
  const gains = gainers.filter((coin) => Number(coin.price_change_percentage_24h || 0) > 0).length;
  const losses = losers.filter((coin) => Number(coin.price_change_percentage_24h || 0) < 0).length;
  const total = gains + losses || 1;
  return clampPercentage((gains / total) * 100);
}

function buildFallbackSummary({ fearGreed, btcDominance, volatilityScore, bullishBias, topGainer, topLoser }) {
  const mood = fearGreed.score >= 60 ? 'risk-on' : fearGreed.score <= 40 ? 'defensive' : 'balanced';
  return [
    `Market mood is currently ${mood}, with the Fear & Greed index at ${fearGreed.score} (${fearGreed.classification}).`,
    `BTC dominance is ${Number(btcDominance || 0).toFixed(2)}%, which usually means capital is either concentrating in Bitcoin or rotating into altcoins.`,
    `Volatility is sitting near ${Math.round(volatilityScore)} out of 100, so position sizing matters more than usual.`,
    topGainer ? `${topGainer.name} is leading the tape, while ${topLoser?.name || 'recent losers'} show where momentum is fading.` : 'Momentum is mixed across the market, so avoid chasing every move.',
    `Bullish participation is about ${Math.round(bullishBias)}%, so upside is present but not broad enough to assume a straight trend.`
  ].join(' ');
}

function buildBeginnerExplanations() {
  return {
    fearGreed: 'Fear & Greed is a simple mood gauge. Lower values mean investors are cautious. Higher values mean they are chasing risk.',
    dominance: 'BTC dominance shows how much of the crypto market is concentrated in Bitcoin. Rising dominance can mean caution, while falling dominance often means altcoins are getting more attention.',
    volatility: 'Volatility measures how quickly prices are moving. Higher volatility means wider swings and more risk.',
    sentiment: 'Bullish sentiment means buyers are in control more often than sellers. Bearish sentiment means the opposite.'
  };
}

async function buildRiskWarnings(userId, volatilityScore) {
  if (!userId) return [];

  try {
    const snapshot = await getPortfolioSnapshot(userId);
    const holdings = Array.isArray(snapshot?.holdings) ? snapshot.holdings : [];
    const totalValue = Number(snapshot?.summary?.totalValue || 0);
    const warnings = [];

    if (!holdings.length || !totalValue) {
      return ['Your portfolio is still empty, so risk is mostly about starting small and diversifying early.'];
    }

    const topHolding = holdings[0];
    if (Number(topHolding?.allocationPct || 0) >= 40) {
      warnings.push(`${topHolding.coinName || topHolding.symbol} makes up ${Number(topHolding.allocationPct || 0).toFixed(1)}% of your portfolio, so concentration risk is high.`);
    }

    if (volatilityScore >= 70) {
      warnings.push('The broader market is volatile right now. Smaller position sizes can help protect your balance from sudden swings.');
    }

    const losingPositions = holdings.filter((holding) => Number(holding.profitLossPct || 0) < 0).length;
    if (losingPositions >= Math.ceil(holdings.length / 2)) {
      warnings.push('More than half your visible holdings are underwater, so review whether you are overexposed to the same market theme.');
    }

    return warnings.length ? warnings : ['Your portfolio looks relatively balanced right now. Keep position sizes aligned with your risk tolerance.'];
  } catch {
    return ['Portfolio risk warnings are temporarily unavailable. Review concentration and volatility manually before trading.'];
  }
}

export async function recordMarketSnapshot(overview = {}) {
  const coins = Array.isArray(overview.coins) ? overview.coins : [];
  const trending = Array.isArray(overview.trending) ? overview.trending : [];
  const movers = overview.movers || {};
  const prices = Object.fromEntries(coins.map((coin) => [coin.id, {
    usd: coin.current_price,
    usd_24h_change: coin.price_change_percentage_24h,
    usd_market_cap: coin.market_cap,
    usd_24h_vol: coin.total_volume
  }]));

  const bucketKey = minuteKey();
  const sentiment = overview.sentiment || {};

  await MarketSnapshot.findOneAndUpdate(
    { bucketKey },
    {
      $set: {
        bucketKey,
        capturedAt: new Date(),
        global: overview.global || {},
        coins,
        trending,
        movers,
        prices,
        sentiment
      }
    },
    { upsert: true, new: true }
  ).exec();

  return { bucketKey, capturedAt: new Date(), prices };
}

export async function getMarketIntelligence(userId = null) {
  const cacheKey = `intelligence:${userId || 'public'}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const [globalData, snapshot, trendingData, movers, trendingCategories, fearGreed] = await Promise.all([
    getGlobalMarketData(),
    getMarketSnapshot(50),
    getTrending(),
    getTopMovers(6),
    getTrendingCategories(8),
    getFearGreedIndex()
  ]);

  const coins = Array.isArray(snapshot) ? snapshot : [];
  const btcDominance = Number(globalData?.data?.market_cap_percentage?.btc || 0);
  const volatilityScore = buildVolatilityScore(coins);
  const bullishBias = buildBullishBias(movers.topGainers || [], movers.topLosers || []);
  const topGainer = movers.topGainers?.[0] || null;
  const topLoser = movers.topLosers?.[0] || null;

  let aiSummary = '';
  try {
    const generated = await generateGeminiText({
      prompt: [
        'Write a short beginner-friendly crypto market summary.',
        `Fear & Greed: ${fearGreed.score} (${fearGreed.classification})`,
        `BTC dominance: ${btcDominance.toFixed(2)}%`,
        `Volatility score: ${Math.round(volatilityScore)}/100`,
        `Bullish bias: ${Math.round(bullishBias)}%`,
        `Top gainer: ${topGainer ? `${topGainer.name} (${topGainer.symbol})` : 'n/a'}`,
        `Top loser: ${topLoser ? `${topLoser.name} (${topLoser.symbol})` : 'n/a'}`
      ].join('\n'),
      systemInstruction: 'You are a concise crypto market analyst for beginners. Use plain language, avoid hype, and keep the summary under 90 words.',
      model: getEnv().geminiModel,
      temperature: 0.35,
      maxOutputTokens: 220
    });
    aiSummary = String(generated?.content || '').trim();
  } catch {
    aiSummary = '';
  }

  const summary = aiSummary || buildFallbackSummary({
    fearGreed,
    btcDominance,
    volatilityScore,
    bullishBias,
    topGainer,
    topLoser
  });

  const sentiment = {
    fearGreed,
    btcDominance,
    volatilityScore,
    bullishBias,
    summary,
    explanations: buildBeginnerExplanations(),
    categories: Array.isArray(trendingCategories) ? trendingCategories.slice(0, 6).map((category) => ({
      id: category.id,
      name: category.name,
      marketCap: category.market_cap,
      marketCapChange24h: category.market_cap_change_24h,
      volume24h: category.volume_24h
    })) : [],
    trendingCoins: (trendingData?.coins || []).slice(0, 7).map((entry) => entry?.item || entry).filter(Boolean),
    gainers: (movers.topGainers || []).slice(0, 5),
    losers: (movers.topLosers || []).slice(0, 5)
  };

  const riskWarnings = await buildRiskWarnings(userId, volatilityScore);
  const recentEvents = await listMarketEvents({ userId, limit: 12 });

  const payload = {
    sentiment,
    riskWarnings,
    recentEvents,
    updatedAt: new Date().toISOString(),
    global: globalData?.data || null,
    market: {
      coins,
      trending: (trendingData?.coins || []).slice(0, 7).map((entry) => entry?.item || entry).filter(Boolean),
      movers
    }
  };

  cache.set(cacheKey, payload, 45);
  await recordMarketSnapshot({ global: payload.global, coins, trending: payload.market.trending, movers, sentiment }).catch(() => null);
  await recordMarketEvent({
    user: userId,
    type: 'sentiment',
    title: 'Market intelligence refreshed',
    message: typeof summary === 'string' ? summary.slice(0, 220) : 'Market intelligence refreshed.',
    severity: fearGreed.score <= 30 || fearGreed.score >= 70 ? 'high' : 'normal',
    source: 'sentiment',
    metadata: { fearGreed, btcDominance, volatilityScore, bullishBias }
  }).catch(() => null);

  return payload;
}

export async function listRecentMarketSnapshots(limit = 12) {
  const snapshots = await MarketSnapshot.find({})
    .sort({ capturedAt: -1 })
    .limit(Math.max(1, Math.min(24, Number(limit) || 12)))
    .lean()
    .exec();

  return snapshots.map((snapshot) => ({
    id: snapshot._id,
    bucketKey: snapshot.bucketKey,
    capturedAt: snapshot.capturedAt,
    global: snapshot.global,
    sentiment: snapshot.sentiment,
    coins: snapshot.coins,
    trending: snapshot.trending,
    movers: snapshot.movers
  }));
}

export async function getLatestMarketSnapshot() {
  const snapshot = await MarketSnapshot.findOne({}).sort({ capturedAt: -1 }).lean().exec();
  if (!snapshot) return null;
  return {
    id: snapshot._id,
    bucketKey: snapshot.bucketKey,
    capturedAt: snapshot.capturedAt,
    global: snapshot.global,
    sentiment: snapshot.sentiment,
    coins: snapshot.coins,
    trending: snapshot.trending,
    movers: snapshot.movers,
    prices: snapshot.prices
  };
}