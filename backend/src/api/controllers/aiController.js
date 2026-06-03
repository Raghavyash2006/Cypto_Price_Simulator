import asyncHandler from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import {
  clearTradingMentorHistory,
  createTradingMentorReply,
  getTradingMentorSession
} from '../services/aiTradingMentorService.js';

function normalizeMessage(value) {
  return String(value || '').trim();
}

export const getHistory = asyncHandler(async (req, res) => {
  const session = await getTradingMentorSession(req.user._id);
  return sendSuccess(res, {
    message: 'AI mentor history loaded',
    data: session
  });
});

export const chat = asyncHandler(async (req, res) => {
  const message = normalizeMessage(req.body.message);

  if (!message) {
    res.status(400);
    throw new Error('message is required');
  }

  if (message.length > 2000) {
    res.status(400);
    throw new Error('message must be 2000 characters or fewer');
  }

  console.info('[ai] chat request', {
    requestId: req.requestId,
    userId: String(req.user._id),
    length: message.length
  });

  const result = await createTradingMentorReply({
    userId: req.user._id,
    message
  });

  const session = await getTradingMentorSession(req.user._id);

  return sendSuccess(res, {
    message: 'AI mentor response generated',
    data: {
      reply: result.reply,
      turn: result.turn,
      suggestedPrompts: result.suggestedPrompts,
      session
    }
  });
});

export const deleteHistory = asyncHandler(async (req, res) => {
  const result = await clearTradingMentorHistory(req.user._id);
  console.info('[ai] history cleared', {
    requestId: req.requestId,
    userId: String(req.user._id),
    deletedCount: result.deletedCount
  });

  return sendSuccess(res, {
    message: 'AI mentor history cleared',
    data: result
  });
});