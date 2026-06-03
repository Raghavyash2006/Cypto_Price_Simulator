import asyncHandler from '../../utils/asyncHandler.js';
import Conversation from '../../models/Conversation.js';
import { generateMentorReply, getMentorSession, saveConversationTurn } from '../services/mentorService.js';
import { mentorRateLimit } from '../middleware/mentorRateLimit.js';

export const getSession = asyncHandler(async (req, res) => {
  const session = await getMentorSession(req.user._id);
  res.json(session);
});

export const streamReply = [
  mentorRateLimit,
  asyncHandler(async (req, res) => {
    const { message, conversationId } = req.body;

    if (!message || !String(message).trim()) {
      res.status(400);
      throw new Error('message is required');
    }

    const conversation = conversationId
      ? await Conversation.findOne({ _id: conversationId, user: req.user._id })
      : await Conversation.findOne({ user: req.user._id }).sort({ updatedAt: -1 });

    const activeConversation = conversation || (await Conversation.create({ user: req.user._id, title: 'AI Mentor' }));
    const { stream } = await generateMentorReply({ user: req.user, conversation: activeConversation, userMessage: String(message) });

    res.status(200);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Conversation-Id', String(activeConversation._id));
    res.flushHeaders?.();

    let assistantResponse = '';
    try {
      for await (const chunk of stream) {
        assistantResponse += chunk;
        res.write(chunk);
      }

      await saveConversationTurn({
        conversation: activeConversation,
        userMessage: String(message),
        assistantMessage: assistantResponse.trim()
      });

      res.end();
    } catch (error) {
      const failureMessage = 'I hit a service issue while preparing that answer. Try again in a moment.';
      if (!assistantResponse) {
        res.write(failureMessage);
      }
      assistantResponse += assistantResponse ? '' : failureMessage;
      try {
        await saveConversationTurn({
          conversation: activeConversation,
          userMessage: String(message),
          assistantMessage: assistantResponse.trim()
        });
      } catch {
        // ignore persistence errors in the fallback path
      }
      res.end();
      console.error('Mentor stream failed:', error);
    }
  })
];
