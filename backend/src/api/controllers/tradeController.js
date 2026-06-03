import mongoose from 'mongoose';
import User from '../../models/User.js';
import Portfolio from '../../models/Portfolio.js';
import Transaction from '../../models/Transaction.js';
import * as cg from '../../services/coingeckoService.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { getIo } from '../../config/socket.js';
import { awardXp } from '../services/gamificationService.js';
import { recordArenaTrade } from '../services/arenaService.js';
import { getPortfolioAnalytics } from '../services/portfolioAnalyticsService.js';
import { createActivityFromTrade } from '../services/socialService.js';
import { sanitizeText, toPositiveNumber } from '../../utils/inputSanitizer.js';

// Buy endpoint: POST /api/trade/buy { coinId, quantity }
export const buy = asyncHandler(async (req, res) => {
  const user = req.user;
  const coinId = sanitizeText(req.body.coinId, { maxLength: 80 }).toLowerCase();
  const quantity = toPositiveNumber(req.body.quantity, NaN, { min: 0.00000001 });
  if (!coinId || !Number.isFinite(quantity) || quantity <= 0) {
    res.status(400);
    throw new Error('coinId and positive quantity are required');
  }

  // fetch price from CoinGecko
  const prices = await cg.getPrices([coinId], 'usd');
  const price = prices[coinId]?.usd;
  if (!price) {
    res.status(400);
    throw new Error('Unable to resolve coin price');
  }

  const totalCost = price * quantity;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const freshUser = await User.findById(user.id).session(session).exec();
    if (!freshUser) {
      throw new Error('User not found');
    }
    if (freshUser.virtualBalance < totalCost) {
      res.status(400);
      throw new Error('Insufficient virtual balance');
    }

    // upsert portfolio entry
    const existing = await Portfolio.findOne({ user: freshUser._id, symbol: coinId.toUpperCase() }).session(session).exec();
    if (existing) {
      // weighted average buyPrice
      const newQty = existing.quantity + quantity;
      const newAvgPrice = (existing.buyPrice * existing.quantity + price * quantity) / newQty;
      existing.quantity = newQty;
      existing.buyPrice = newAvgPrice;
      existing.currentPrice = price;
      await existing.save({ session });
    } else {
      await Portfolio.create([
        { user: freshUser._id, coinName: coinId, symbol: coinId.toUpperCase(), quantity, buyPrice: price, currentPrice: price }
      ], { session });
    }

    // create transaction
    await Transaction.create([
      {
        user: freshUser._id,
        type: 'buy',
        coinName: coinId,
        symbol: coinId.toUpperCase(),
        quantity,
        amount: totalCost,
        metadata: {
          coinId,
          price,
          side: 'buy',
          unitPrice: price,
          costBasis: totalCost,
          realizedPnL: 0,
          averageCost: price
        }
      }
    ], { session });

    // deduct balance
    freshUser.virtualBalance = Math.max(0, freshUser.virtualBalance - totalCost);
    await freshUser.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Emit socket events
    const io = getIo();
    if (io) io.emit('portfolio:update', { userId: freshUser._id.toString() });
    if (io) io.emit('transaction:new', { userId: freshUser._id.toString(), type: 'buy', coinId, quantity, amount: totalCost });

    awardXp(freshUser._id, Math.max(10, Math.round(totalCost / 100)), 'trade execution', {
      tradeType: 'buy',
      coinId,
      quantity,
      amount: totalCost
    }).catch(() => null);

    createActivityFromTrade({ userId: freshUser._id, type: 'buy', coinId, quantity, amount: totalCost }).catch(() => null);
    recordArenaTrade({ userId: freshUser._id }).catch(() => null);

    res.json({ message: 'Buy executed', totalCost });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

// Sell endpoint: POST /api/trade/sell { coinId, quantity }
export const sell = asyncHandler(async (req, res) => {
  const user = req.user;
  const coinId = sanitizeText(req.body.coinId, { maxLength: 80 }).toLowerCase();
  const quantity = toPositiveNumber(req.body.quantity, NaN, { min: 0.00000001 });
  if (!coinId || !Number.isFinite(quantity) || quantity <= 0) {
    res.status(400);
    throw new Error('coinId and positive quantity are required');
  }

  const prices = await cg.getPrices([coinId], 'usd');
  const price = prices[coinId]?.usd;
  if (!price) {
    res.status(400);
    throw new Error('Unable to resolve coin price');
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const freshUser = await User.findById(user.id).session(session).exec();
    if (!freshUser) throw new Error('User not found');

    const existing = await Portfolio.findOne({ user: freshUser._id, symbol: coinId.toUpperCase() }).session(session).exec();
    if (!existing || existing.quantity < quantity) {
      res.status(400);
      throw new Error('Insufficient holdings to sell');
    }

    const proceeds = price * quantity;

    // update or remove portfolio
    existing.quantity = existing.quantity - quantity;
    existing.currentPrice = price;
    if (existing.quantity <= 0) {
      await existing.deleteOne({ session });
    } else {
      await existing.save({ session });
    }

    await Transaction.create([
      {
        user: freshUser._id,
        type: 'sell',
        coinName: coinId,
        symbol: coinId.toUpperCase(),
        quantity,
        amount: proceeds,
        metadata: {
          coinId,
          price,
          side: 'sell',
          unitPrice: price,
          proceeds,
          costBasis: quantity * (existing?.buyPrice || 0),
          realizedPnL: proceeds - quantity * (existing?.buyPrice || 0),
          averageCost: existing?.buyPrice || 0
        }
      }
    ], { session });

    freshUser.virtualBalance = Math.max(0, freshUser.virtualBalance + proceeds);
    await freshUser.save({ session });

    await session.commitTransaction();
    session.endSession();

    const io = getIo();
    if (io) io.emit('portfolio:update', { userId: freshUser._id.toString() });
    if (io) io.emit('transaction:new', { userId: freshUser._id.toString(), type: 'sell', coinId, quantity, amount: proceeds });

    awardXp(freshUser._id, Math.max(10, Math.round(proceeds / 100)), 'trade execution', {
      tradeType: 'sell',
      coinId,
      quantity,
      amount: proceeds
    }).catch(() => null);

    createActivityFromTrade({ userId: freshUser._id, type: 'sell', coinId, quantity, amount: proceeds }).catch(() => null);
    recordArenaTrade({ userId: freshUser._id }).catch(() => null);

    res.json({ message: 'Sell executed', proceeds });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

// Get portfolio for current user
export const getPortfolio = asyncHandler(async (req, res) => {
  const user = req.user;
  const list = await Portfolio.find({ user: user.id }).lean().exec();
  // enrich with live prices
  const ids = list.map((p) => p.symbol.toLowerCase());
  const prices = ids.length ? await cg.getPrices(ids, 'usd') : {};

  const enriched = list.map((p) => {
    const price = prices[p.symbol.toLowerCase()]?.usd || p.currentPrice || 0;
    const marketValue = price * p.quantity;
    const cost = p.buyPrice * p.quantity;
    const profitLoss = marketValue - cost;
    return { ...p, marketValue, currentPrice: price, profitLoss };
  });

  res.json({ portfolio: enriched });
});

// Get analytics: totals
export const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await getPortfolioAnalytics(req.user._id, { period: sanitizeText(req.query.period || '', { maxLength: 8 }) || '30d' });
  res.json(analytics);
});
