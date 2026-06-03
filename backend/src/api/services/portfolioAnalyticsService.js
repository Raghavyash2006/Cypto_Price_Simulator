import mongoose from 'mongoose';
import NodeCache from 'node-cache';
import Portfolio from '../../models/Portfolio.js';
import Transaction from '../../models/Transaction.js';
import { getCoinMarketChart, getPrices } from '../../services/coingeckoService.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_PORTFOLIO_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MAX_ASSETS = 8;
const PERIOD_MAP = {
  '7d': 7,
  '30d': 30,
  '90d': 90
};

const analyticsCache = new NodeCache({ stdTTL: 30, useClones: false });

function analyticsCacheKey(userId, options = {}) {
  return [
    'portfolio-analytics',
    String(userId),
    String(options.period || '30d').toLowerCase(),
    options.skipAIInsights ? 'skip-ai' : 'with-ai'
  ].join(':');
}

function readAnalyticsCache(userId, options) {
  return analyticsCache.get(analyticsCacheKey(userId, options));
}

function writeAnalyticsCache(userId, options, value) {
  analyticsCache.set(analyticsCacheKey(userId, options), value, 30);
}

export function invalidatePortfolioAnalyticsCache(userId) {
  const prefix = `portfolio-analytics:${String(userId)}:`;
  for (const key of analyticsCache.keys()) {
    if (key.startsWith(prefix)) {
      analyticsCache.del(key);
    }
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatDateLabel(date) {
  return new Date(date).toISOString().slice(5, 10);
}

function round(value, digits = 2) {
  const numeric = safeNumber(value);
  return Number(numeric.toFixed(digits));
}

function safeDivide(numerator, denominator) {
  if (!denominator) return 0;
  return numerator / denominator;
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = mean(values.map((value) => (value - avg) ** 2));
  return Math.sqrt(variance);
}

function maxDrawdown(series) {
  let peak = -Infinity;
  let worst = 0;
  series.forEach((value) => {
    if (value > peak) peak = value;
    if (peak > 0) {
      const drawdown = (value - peak) / peak;
      if (drawdown < worst) worst = drawdown;
    }
  });
  return Math.abs(worst);
}

async function fetchAIInsights(payload) {
  if (!process.env.OPENAI_API_KEY) return null;

  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.45,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are a sharp crypto portfolio analyst. Give concise actionable guidance.' },
          {
            role: 'user',
            content: [
              'Analyze this crypto portfolio and return JSON with summary, risks, opportunities, and nextActions arrays.',
              `Portfolio snapshot: ${JSON.stringify(payload)}`,
              'Focus on diversification, concentration, risk, and growth opportunities.'
            ].join('\n')
          }
        ]
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function createFallbackInsights(summary, risk) {
  const insights = [];

  if ((risk.concentrationScore || 0) > 45) {
    insights.push('Your portfolio is concentrated in a small number of assets. Reducing position size in the largest holding would improve diversification.');
  } else {
    insights.push('Your asset mix is reasonably diversified. Keep rebalancing to avoid drift into a single winner.');
  }

  if ((summary.profitLossPct || 0) > 0) {
    insights.push('You are currently profitable. Consider locking in part of the gain if volatility rises.');
  } else if ((summary.profitLossPct || 0) < -10) {
    insights.push('The portfolio is under pressure. Review stop-loss levels and avoid averaging down without a plan.');
  } else {
    insights.push('Performance is near break-even. Focus on conviction and position sizing rather than overtrading.');
  }

  if ((risk.volatilityScore || 0) > 60) {
    insights.push('Volatility is elevated. Lower correlated exposure or reduce leverage to smooth the equity curve.');
  }

  return {
    summary: 'Automated portfolio analysis generated from current holdings and market history.',
    risks: insights.slice(0, 3),
    opportunities: [
      'Rebalance toward assets with better risk-adjusted contribution.',
      'Use trailing exits to protect profits during strong trends.'
    ],
    nextActions: [
      'Review the largest allocation and decide if it fits your risk limit.',
      'Compare portfolio growth against your benchmark weekly.'
    ]
  };
}

async function buildHistoricalSeries(holdings, periodDays) {
  const assetCharts = await Promise.all(
    holdings.slice(0, MAX_ASSETS).map(async (holding) => {
      try {
        const coinKey = String(holding.coinId || holding.symbol || '').toLowerCase();
        const chart = await getCoinMarketChart(coinKey, 'usd', periodDays);
        const prices = chart.prices || [];
        return {
          symbol: holding.symbol,
          coinId: coinKey,
          coinName: holding.coinName,
          quantity: holding.quantity,
          prices: prices.map(([timestamp, price]) => ({ timestamp, price }))
        };
      } catch {
        return {
          symbol: holding.symbol,
          coinId: String(holding.coinId || holding.symbol || '').toLowerCase(),
          coinName: holding.coinName,
          quantity: holding.quantity,
          prices: []
        };
      }
    })
  );

  const timelineMap = new Map();
  assetCharts.forEach((asset) => {
    asset.prices.forEach((point) => {
      const key = formatDateLabel(point.timestamp);
      const entry = timelineMap.get(key) || { total: 0 };
      entry.total += point.price * asset.quantity;
      timelineMap.set(key, entry);
    });
  });

  const keys = [...timelineMap.keys()].sort();
  const series = keys.slice(-periodDays).map((key) => ({ label: key, value: round(timelineMap.get(key)?.total || 0, 2) }));

  return {
    assetCharts,
    series: series.length ? series : []
  };
}

function buildTradeTimeline(transactions) {
  return [...transactions]
    .slice(-12)
    .reverse()
    .map((transaction) => {
      const quantity = safeNumber(transaction.quantity, 0);
      const amount = safeNumber(transaction.amount, 0);
      const realizedPnL = safeNumber(transaction.metadata?.realizedPnL, 0);
      const unitPrice = safeNumber(transaction.metadata?.price, quantity > 0 ? amount / quantity : 0);

      return {
        id: transaction._id,
        type: transaction.type,
        symbol: transaction.symbol,
        coinName: transaction.coinName,
        quantity,
        amount: round(amount, 2),
        unitPrice: round(unitPrice, 2),
        realizedPnL: round(realizedPnL, 2),
        timestamp: transaction.timestamp,
        label: transaction.type === 'buy' ? 'Buy executed' : transaction.type === 'sell' ? 'Sell executed' : 'Reward'
      };
    });
}

function buildTradingStats(transactions, summary) {
  const tradeTransactions = transactions.filter((transaction) => ['buy', 'sell'].includes(transaction.type));
  const sellTransactions = tradeTransactions.filter((transaction) => transaction.type === 'sell');
  const winCount = sellTransactions.filter((transaction) => safeNumber(transaction.metadata?.realizedPnL, 0) > 0).length;
  const lossCount = sellTransactions.filter((transaction) => safeNumber(transaction.metadata?.realizedPnL, 0) < 0).length;
  const totalTrades = tradeTransactions.length;
  const realizedPnL = safeNumber(summary.realizedPnL, 0);
  const firstTrade = tradeTransactions[0]?.timestamp ? new Date(tradeTransactions[0].timestamp).getTime() : Date.now();
  const lastTrade = tradeTransactions[tradeTransactions.length - 1]?.timestamp ? new Date(tradeTransactions[tradeTransactions.length - 1].timestamp).getTime() : firstTrade;
  const activeDays = Math.max(1, Math.ceil((lastTrade - firstTrade) / (24 * 60 * 60 * 1000)) + 1);

  return {
    totalTrades,
    buyCount: tradeTransactions.filter((transaction) => transaction.type === 'buy').length,
    sellCount: sellTransactions.length,
    winCount,
    lossCount,
    winLossRatio: lossCount === 0 ? winCount : round(winCount / Math.max(1, lossCount), 2),
    averageProfitPerTrade: round(realizedPnL / Math.max(1, sellTransactions.length), 2),
    tradingFrequency: round((totalTrades / activeDays) * 7, 2),
    realizedPnL: round(realizedPnL, 2),
    closedTradeWinRate: tradeTransactions.length ? round((winCount / Math.max(1, sellTransactions.length)) * 100, 2) : 0,
    activeDays
  };
}

function buildAllocation(holdings, valuesBySymbol) {
  const totalValue = holdings.reduce((sum, item) => sum + (valuesBySymbol[item.symbol] || 0), 0);
  return holdings
    .map((holding) => {
      const value = valuesBySymbol[holding.symbol] || 0;
      return {
        symbol: holding.symbol,
        coinName: holding.coinName,
        quantity: holding.quantity,
        marketValue: round(value, 2),
        allocationPct: round(safeDivide(value, totalValue) * 100, 2),
        profitLoss: round((holding.currentPrice - holding.buyPrice) * holding.quantity, 2)
      };
    })
    .sort((left, right) => right.marketValue - left.marketValue);
}

function buildPerformanceSeries(holdings, prices) {
  return holdings.map((holding) => {
    const coinKey = String(holding.coinId || holding.symbol || '').toLowerCase();
    const price = prices[coinKey]?.usd || holding.currentPrice || 0;
    const marketValue = price * holding.quantity;
    const costBasis = holding.buyPrice * holding.quantity;
    const changePct = safeDivide(marketValue - costBasis, costBasis) * 100;
    return {
      symbol: holding.symbol,
      coinId: coinKey,
      coinName: holding.coinName,
      marketValue: round(marketValue, 2),
      costBasis: round(costBasis, 2),
      profitLoss: round(marketValue - costBasis, 2),
      profitLossPct: round(changePct, 2)
    };
  });
}

function getTradePrice(transaction) {
  const metadataPrice = safeNumber(transaction.metadata?.price, NaN);
  if (Number.isFinite(metadataPrice) && metadataPrice > 0) {
    return metadataPrice;
  }

  const quantity = safeNumber(transaction.quantity, 0);
  const amount = safeNumber(transaction.amount, 0);
  return quantity > 0 ? amount / quantity : 0;
}

function calculateRealizedPnl(transactions) {
  const positions = new Map();
  let realizedPnL = 0;

  transactions.forEach((transaction) => {
    if (transaction.type !== 'buy' && transaction.type !== 'sell') {
      return;
    }

    const coinId = String(transaction.metadata?.coinId || transaction.symbol || transaction.coinName || '').toLowerCase();
    const quantity = safeNumber(transaction.quantity, 0);
    const price = getTradePrice(transaction);

    if (!coinId || quantity <= 0 || price <= 0) {
      return;
    }

    const state = positions.get(coinId) || { quantity: 0, averageCost: 0 };

    if (transaction.type === 'buy') {
      const totalCost = (state.averageCost * state.quantity) + (price * quantity);
      const nextQuantity = state.quantity + quantity;
      positions.set(coinId, {
        quantity: nextQuantity,
        averageCost: nextQuantity > 0 ? totalCost / nextQuantity : 0
      });
      return;
    }

    const sellQuantity = Math.min(quantity, state.quantity);
    if (sellQuantity <= 0) {
      return;
    }

    const tradeRealizedPnL = (price - state.averageCost) * sellQuantity;
    realizedPnL += tradeRealizedPnL;

    const remainingQuantity = state.quantity - sellQuantity;
    if (remainingQuantity > 0) {
      positions.set(coinId, {
        quantity: remainingQuantity,
        averageCost: state.averageCost
      });
    } else {
      positions.delete(coinId);
    }
  });

  return realizedPnL;
}

function safeSummaryValue(value) {
  return Number.isFinite(Number(value)) ? round(value, 2) : 0;
}

function buildRiskProfile(allocation, series, holdings) {
  const weights = allocation.map((item) => safeDivide(item.marketValue, allocation.reduce((sum, entry) => sum + entry.marketValue, 0)));
  const concentrationScore = round(weights.reduce((sum, weight) => sum + (weight * 100) ** 2, 0) / 100, 2);
  const seriesValues = series.map((point) => point.value);
  const volatilityScore = round(clamp(standardDeviation(seriesValues) / Math.max(1, mean(seriesValues)) * 100, 0, 100), 2);
  const drawdownScore = round(clamp(maxDrawdown(seriesValues) * 100, 0, 100), 2);
  const diversificationScore = round(clamp(100 - concentrationScore * 0.6, 0, 100), 2);
  const riskScore = round(clamp((concentrationScore * 0.35) + (volatilityScore * 0.35) + (drawdownScore * 0.3), 0, 100), 2);

  return {
    concentrationScore,
    volatilityScore,
    drawdownScore,
    diversificationScore,
    riskScore,
    allocationSpread: allocation.length,
    largePositionCount: allocation.filter((item) => item.allocationPct >= 25).length,
    holdingCount: holdings.length
  };
}

function buildGrowthSummary(series, summary) {
  const latest = series[series.length - 1]?.value || summary.totalValue;
  const earliest = series[0]?.value || summary.totalValue;
  const growth = earliest ? ((latest - earliest) / earliest) * 100 : 0;
  const gains = series.filter((point, index) => index > 0 && point.value > series[index - 1].value).length;
  const losses = Math.max(0, series.length - 1 - gains);

  return {
    startValue: round(earliest, 2),
    endValue: round(latest, 2),
    growthPct: round(growth, 2),
    winningDays: gains,
    losingDays: losses
  };
}

export async function getPortfolioAnalytics(userId, options = {}) {
  const cached = readAnalyticsCache(userId, options);
  if (cached) {
    return cached;
  }

  const periodDays = PERIOD_MAP[String(options.period || '30d').toLowerCase()] || 30;
  const [holdingsRaw, transactionsRaw] = await Promise.all([
    Portfolio.find({ user: userId }).lean().exec(),
    Transaction.find({ user: userId }).sort({ timestamp: 1 }).lean().exec()
  ]);

  const holdings = holdingsRaw || [];
  const symbols = holdings.map((holding) => String(holding.coinId || holding.symbol || '').toLowerCase()).filter(Boolean);
  const prices = symbols.length ? await getPrices(symbols, 'usd') : {};

  const valuesBySymbol = {};
  let totalValue = 0;
  let totalCost = 0;

  holdings.forEach((holding) => {
    const coinKey = String(holding.coinId || holding.symbol || '').toLowerCase();
    const price = prices[coinKey]?.usd || holding.currentPrice || 0;
    const marketValue = price * holding.quantity;
    const costBasis = holding.buyPrice * holding.quantity;
    valuesBySymbol[holding.symbol] = marketValue;
    totalValue += marketValue;
    totalCost += costBasis;
  });

  const realizedPnL = calculateRealizedPnl(transactionsRaw || []);

  const allocation = buildAllocation(holdings, valuesBySymbol);
  const performance = buildPerformanceSeries(holdings, prices);
  const historical = await buildHistoricalSeries(holdings, periodDays);
  const summary = {
    investedCapital: round(totalCost, 2),
    totalValue: round(totalValue, 2),
    profitLoss: round(totalValue - totalCost, 2),
    profitLossPct: round(safeDivide(totalValue - totalCost, totalCost) * 100, 2),
    unrealizedPnL: round(totalValue - totalCost, 2),
    realizedPnL: round(realizedPnL, 2),
    holdingsCount: holdings.length,
    bestPerformer: performance.reduce((best, item) => (item.profitLossPct > (best?.profitLossPct || -Infinity) ? item : best), performance[0] || null),
    worstPerformer: performance.reduce((worst, item) => (item.profitLossPct < (worst?.profitLossPct || Infinity) ? item : worst), performance[0] || null)
  };

  const growth = buildGrowthSummary(historical.series, summary);
  const risk = buildRiskProfile(allocation, historical.series, holdings);
  const benchmark = round(safeDivide(performance.reduce((sum, item) => sum + item.profitLossPct, 0), Math.max(1, performance.length)), 2);
  const trading = buildTradingStats(transactionsRaw || [], summary);
  const tradeTimeline = buildTradeTimeline(transactionsRaw || []);

  const insightsPayload = {
    summary,
    growth,
    risk,
    trading,
    allocation: allocation.slice(0, 5),
    benchmark,
    holdings: performance.slice(0, 8)
  };

  const aiInsights = options.skipAIInsights ? createFallbackInsights(summary, risk) : ((await fetchAIInsights(insightsPayload)) || createFallbackInsights(summary, risk));

  const result = {
    summary,
    allocation,
    performance,
    historical: historical.series,
    tradeTimeline,
    trading,
    risk,
    growth,
    benchmark,
    period: String(options.period || '30d').toLowerCase(),
    insights: {
      summary: aiInsights.summary || 'Portfolio insight summary unavailable.',
      risks: aiInsights.risks || [],
      opportunities: aiInsights.opportunities || [],
      nextActions: aiInsights.nextActions || []
    },
    updatedAt: new Date().toISOString()
  };

  writeAnalyticsCache(userId, options, result);
  return result;
}
