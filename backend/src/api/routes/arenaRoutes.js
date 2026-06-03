import { Router } from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { validateBody, validateObjectId } from '../../middleware/validate.js';
import {
  createArenaTournament,
  getActivity,
  getDashboard,
  getLeaderboard,
  getMatch,
  getMatchmaking,
  getMatches,
  joinArenaTournament,
  leaveArena,
  queueBattle,
  refreshTradeSignal,
  resolveMatches
} from '../controllers/arenaController.js';

const router = Router();
const arenaWriteRateLimit = createRateLimiter({
  keyPrefix: 'arena-write',
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: 'Too many arena actions, please slow down.'
});

router.get('/dashboard', protect, getDashboard);
router.get('/matches', protect, getMatches);
router.get('/matches/:matchId', protect, validateObjectId('matchId'), getMatch);
router.get('/matchmaking', protect, getMatchmaking);
router.post('/battle/queue', protect, arenaWriteRateLimit, queueBattle);
router.post('/tournaments', protect, arenaWriteRateLimit, validateBody(['title', 'durationMinutes', 'entryFee', 'prizePool']), createArenaTournament);
router.post('/tournaments/:matchId/join', protect, arenaWriteRateLimit, validateObjectId('matchId'), joinArenaTournament);
router.post('/matches/:matchId/leave', protect, arenaWriteRateLimit, validateObjectId('matchId'), leaveArena);
router.get('/leaderboard', protect, getLeaderboard);
router.get('/activity', protect, getActivity);
router.post('/sync', protect, refreshTradeSignal);
router.post('/resolve', protect, resolveMatches);

export default router;
