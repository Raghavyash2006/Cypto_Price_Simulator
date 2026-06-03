import mongoose from 'mongoose';
import Portfolio from '../../models/Portfolio.js';
import Transaction from '../../models/Transaction.js';
import User from '../../models/User.js';
import { getPrices } from '../../services/coingeckoService.js';
import { getIo } from '../../config/socket.js';
import { awardXp } from '../services/gamificationService.js';
import { createActivityFromTrade } from '../services/socialService.js';
import { recordArenaTrade } from '../services/arenaService.js';
import { getPortfolioAnalytics, invalidatePortfolioAnalyticsCache } from './portfolioAnalyticsService.js';

function normalizeCoinId(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeQuantity(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : NaN;
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function safeMoney(value, fallback = 0) {
  return Number(safeNumber(value, fallback).toFixed(8));
}

function toDisplayName(payload, fallbackId) {
  return String(payload?.coinName || payload?.name || fallbackId || '').trim() || fallbackId;
}

function toDisplaySymbol(payload, fallbackId) {
  return String(payload?.symbol || payload?.ticker || fallbackId || '').trim().toUpperCase() || String(fallbackId || '').toUpperCase();
}

function buildHoldingLookup(userId, coinId) {
  return {
    user: userId,
    $or: [{ coinId }, { symbol: coinId.toUpperCase() }]
  };
}

function enrichHolding(holding, price, allocationPct = 0) {
  const quantity = safeNumber(holding.quantity);
  const buyPrice = safeNumber(holding.buyPrice);
  const currentPrice = safeNumber(price || holding.currentPrice);
  const investedValue = buyPrice * quantity;
  const marketValue = currentPrice * quantity;
  const profitLoss = marketValue - investedValue;

  return {
    id: holding._id,
    coinId: holding.coinId || normalizeCoinId(holding.symbol),
    coinName: holding.coinName || holding.coinId || holding.symbol,
    symbol: holding.symbol,
    quantity,
    buyPrice,
    currentPrice,
    investedValue,
    marketValue,
    profitLoss,
    profitLossPct: investedValue ? (profitLoss / investedValue) * 100 : 0,
    allocationPct
  };
}

async function buildSnapshot(userId) {
  const [analytics, user, holdingsRaw] = await Promise.all([
    getPortfolioAnalytics(userId, { skipAIInsights: true }),
    User.findById(userId).select('username name avatar virtualBalance').lean().exec(),
    Portfolio.find({ user: userId }).lean().exec()
  ]);

  const holdings = holdingsRaw || [];
  const coinIds = [...new Set(holdings.map((holding) => normalizeCoinId(holding.coinId || holding.symbol)).filter(Boolean))];
  const prices = coinIds.length ? await getPrices(coinIds, 'usd') : {};

  const enrichedHoldings = holdings
    .map((holding) => {
      const coinId = normalizeCoinId(holding.coinId || holding.symbol);
      const price = prices[coinId]?.usd || holding.currentPrice || 0;
      return enrichHolding(holding, price);
    })
    .sort((left, right) => right.marketValue - left.marketValue);

  const totalMarketValue = enrichedHoldings.reduce((sum, holding) => sum + holding.marketValue, 0);
  const totalInvestedValue = enrichedHoldings.reduce((sum, holding) => sum + holding.investedValue, 0);
  const totalProfitLoss = totalMarketValue - totalInvestedValue;
  const totalProfitLossPct = totalInvestedValue ? (totalProfitLoss / totalInvestedValue) * 100 : 0;

  const allocationMap = new Map(enrichedHoldings.map((holding) => [holding.symbol, totalMarketValue ? (holding.marketValue / totalMarketValue) * 100 : 0]));

  const holdingsWithAllocation = enrichedHoldings.map((holding) => ({
    ...holding,
    allocationPct: Number((allocationMap.get(holding.symbol) || 0).toFixed(2))
  }));

  return {
    user: user || null,
    summary: {
      investedCapital: safeMoney(totalInvestedValue),
      totalValue: safeMoney(totalMarketValue),
      profitLoss: safeMoney(totalProfitLoss),
      profitLossPct: safeMoney(totalProfitLossPct),
      virtualBalance: safeMoney(user?.virtualBalance),
      equityValue: safeMoney(totalMarketValue + safeNumber(user?.virtualBalance)),
      holdingsCount: holdingsWithAllocation.length,
      realizedPnL: safeMoney(analytics.summary.realizedPnL),
      bestPerformer: analytics.summary.bestPerformer,
      worstPerformer: analytics.summary.worstPerformer
    },
    holdings: holdingsWithAllocation,
    allocation: analytics.allocation,
    performance: analytics.performance,
    historical: analytics.historical,
    risk: analytics.risk,
    growth: analytics.growth,
    benchmark: analytics.benchmark,
    insights: analytics.insights,
    updatedAt: analytics.updatedAt
  };
}

async function persistTrade({ userId, coinId, coinName, symbol, quantity, side, price, totalValue }) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session).exec();
    if (!user) {
      throw new Error('User not found');
    }

    const lookup = buildHoldingLookup(user._id, coinId);
    const existing = await Portfolio.findOne(lookup).session(session).exec();
    const currentBalance = safeNumber(user.virtualBalance);
    const tradePrice = safeNumber(price);
    const tradeQuantity = safeNumber(quantity);
    const tradeValue = safeMoney(totalValue);

    if (side === 'buy') {
      if (!Number.isFinite(tradeQuantity) || tradeQuantity <= 0) {
        throw new Error('Invalid quantity');
      }

      if (currentBalance < tradeValue) {
        throw new Error('Insufficient virtual balance');
      }

      const nextAverageCost = existing
        ? (((safeNumber(existing.buyPrice) * safeNumber(existing.quantity)) + (tradePrice * tradeQuantity)) / (safeNumber(existing.quantity) + tradeQuantity))
        : tradePrice;

      if (existing) {
        existing.coinId = coinId;
        existing.coinName = coinName;
        existing.symbol = symbol;
        existing.quantity = safeNumber(existing.quantity) + tradeQuantity;
        existing.buyPrice = nextAverageCost;
        existing.currentPrice = tradePrice;
        await existing.save({ session });
      } else {
        await Portfolio.create([
          {
            user: user._id,
            coinId,
            coinName,
            symbol,
            quantity: tradeQuantity,
            buyPrice: tradePrice,
            currentPrice: tradePrice
          }
        ], { session });
      }

      console.debug('[portfolio] buy calc', {
        userId: user._id.toString(),
        coinId,
        quantity: tradeQuantity,
        price: tradePrice,
        totalValue: tradeValue,
        balanceBefore: currentBalance,
        balanceAfter: safeMoney(currentBalance - tradeValue),
        averageCost: nextAverageCost
      });

      await Transaction.create(
        [
          {
            user: user._id,
            type: 'buy',
            coinName,
            symbol,
            quantity: tradeQuantity,
            amount: tradeValue,
            metadata: {
              coinId,
              price: tradePrice,
              side: 'buy',
              unitPrice: tradePrice,
              costBasis: tradeValue,
              realizedPnL: 0,
              averageCost: nextAverageCost
            }
          }
        ],
        { session }
      );

      user.virtualBalance = safeMoney(currentBalance - tradeValue);
      await user.save({ session });
    } else {
      if (!Number.isFinite(tradeQuantity) || tradeQuantity <= 0) {
        throw new Error('Invalid quantity');
      }

      const holdingQuantity = safeNumber(existing?.quantity);
      if (!existing || holdingQuantity < tradeQuantity) {
        throw new Error('Insufficient holdings to sell');
      }

      const averageCost = safeNumber(existing.buyPrice);
      const proceeds = tradeValue;
      const costBasis = safeMoney(averageCost * tradeQuantity);
      const realizedPnL = safeMoney(proceeds - costBasis);
      const remainingQuantity = safeMoney(holdingQuantity - tradeQuantity);

      existing.coinId = coinId;
      existing.coinName = coinName;
      existing.symbol = symbol;
      existing.quantity = holdingQuantity - tradeQuantity;
      existing.currentPrice = tradePrice;

      console.debug('[portfolio] sell calc', {
        userId: user._id.toString(),
        coinId,
        quantity: tradeQuantity,
        price: tradePrice,
        proceeds,
        averageCost,
        costBasis,
        realizedPnL,
        remainingQuantity
      });

      if (existing.quantity <= 0) {
        await existing.deleteOne({ session });
      } else {
        await existing.save({ session });
      }

      await Transaction.create(
        [
          {
            user: user._id,
            type: 'sell',
            coinName,
            symbol,
            quantity: tradeQuantity,
            amount: proceeds,
            metadata: {
              coinId,
              price: tradePrice,
              side: 'sell',
              unitPrice: tradePrice,
              proceeds,
              costBasis,
              realizedPnL,
              averageCost
            }
          }
        ],
        { session }
      );

      user.virtualBalance = safeMoney(currentBalance + proceeds);
      await user.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    const io = getIo();
    if (io) {
      io.emit('portfolio:update', { userId: user._id.toString() });
      io.emit('transaction:new', { userId: user._id.toString(), type: side, coinId, quantity: tradeQuantity, amount: tradeValue });
    }

    invalidatePortfolioAnalyticsCache(user._id);

    awardXp(user._id, Math.max(10, Math.round(tradeValue / 100)), 'portfolio trade', {
      tradeType: side,
      coinId,
      quantity: tradeQuantity,
      amount: tradeValue
    }).catch(() => null);

    createActivityFromTrade({ userId: user._id, type: side, coinId, quantity: tradeQuantity, amount: tradeValue }).catch(() => null);
    recordArenaTrade({ userId: user._id }).catch(() => null);

    return buildSnapshot(user._id);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

export async function buyAsset(userId, payload) {
  const coinId = normalizeCoinId(payload.coinId);
  const quantity = normalizeQuantity(payload.quantity);

  if (!coinId || !Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('coinId and positive quantity are required');
  }

  const prices = await getPrices([coinId], 'usd');
  const price = prices[coinId]?.usd;
  if (!price) {
    throw new Error('Unable to resolve coin price');
  }

  const coinName = toDisplayName(payload, coinId);
  const symbol = toDisplaySymbol(payload, coinId);
  const totalValue = Number((price * quantity).toFixed(8));

  return persistTrade({
    userId,
    coinId,
    coinName,
    symbol,
    quantity,
    side: 'buy',
    price,
    totalValue
  });
}

export async function sellAsset(userId, payload) {
  const coinId = normalizeCoinId(payload.coinId);
  const quantity = normalizeQuantity(payload.quantity);

  if (!coinId || !Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('coinId and positive quantity are required');
  }

  const prices = await getPrices([coinId], 'usd');
  const price = prices[coinId]?.usd;
  if (!price) {
    throw new Error('Unable to resolve coin price');
  }

  const coinName = toDisplayName(payload, coinId);
  const symbol = toDisplaySymbol(payload, coinId);
  const totalValue = Number((price * quantity).toFixed(8));

  return persistTrade({
    userId,
    coinId,
    coinName,
    symbol,
    quantity,
    side: 'sell',
    price,
    totalValue
  });
}

export async function getPortfolioSnapshot(userId) {
  return buildSnapshot(userId);
}

export async function listTransactions(userId, limit = 100) {
  const rows = await Transaction.find({ user: userId })
    .sort({ timestamp: -1 })
    .limit(Math.min(Math.max(Number(limit) || 100, 1), 200))
    .lean()
    .exec();

  return rows.map((row) => ({
    id: row._id,
    type: row.type,
    coinId: normalizeCoinId(row.metadata?.coinId || row.symbol || row.coinName),
    coinName: row.coinName,
    symbol: row.symbol,
    quantity: safeNumber(row.quantity),
    amount: safeMoney(row.amount),
    unitPrice: safeMoney(row.metadata?.unitPrice ?? (safeNumber(row.quantity) ? safeNumber(row.amount) / safeNumber(row.quantity) : row.amount)),
    realizedPnL: safeMoney(row.metadata?.realizedPnL),
    costBasis: safeMoney(row.metadata?.costBasis),
    metadata: row.metadata || {},
    timestamp: row.timestamp
  }));
}