import asyncHandler from '../../utils/asyncHandler.js';
import { buyAsset, getPortfolioSnapshot, listTransactions, sellAsset } from '../services/portfolioService.js';

export const buy = asyncHandler(async (req, res) => {
  const snapshot = await buyAsset(req.user._id, req.body);
  res.status(201).json({ message: 'Buy executed', portfolio: snapshot });
});

export const sell = asyncHandler(async (req, res) => {
  const snapshot = await sellAsset(req.user._id, req.body);
  res.json({ message: 'Sell executed', portfolio: snapshot });
});

export const getPortfolio = asyncHandler(async (req, res) => {
  const snapshot = await getPortfolioSnapshot(req.user._id);
  res.json(snapshot);
});

export const getTransactions = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit || '100', 10);
  const transactions = await listTransactions(req.user._id, limit);
  res.json({ transactions });
});