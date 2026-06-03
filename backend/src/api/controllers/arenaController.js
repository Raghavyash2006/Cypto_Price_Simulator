import asyncHandler from '../../utils/asyncHandler.js';
import {
  createTournament,
  getArenaActivity,
  getArenaDashboard,
  getArenaLeaderboard,
  getArenaMatch,
  getArenaMatchmakingStatus,
  joinTournament,
  leaveArenaMatch,
  listArenaMatches,
  queueForBattle,
  recordArenaTrade,
  settleArenaMatches
} from '../services/arenaService.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await getArenaDashboard(req.user._id);
  res.json(dashboard);
});

export const getMatches = asyncHandler(async (req, res) => {
  const matches = await listArenaMatches({ userId: req.user._id, status: req.query.status, mode: req.query.mode, limit: req.query.limit });
  res.json({ matches });
});

export const getMatch = asyncHandler(async (req, res) => {
  const match = await getArenaMatch(req.params.matchId, req.user._id);
  res.json({ match });
});

export const queueBattle = asyncHandler(async (req, res) => {
  const result = await queueForBattle({
    userId: req.user._id,
    durationMinutes: req.body.durationMinutes,
    entryFee: req.body.entryFee,
    prizePool: req.body.prizePool,
    preferences: req.body.preferences || {}
  });
  res.status(201).json(result);
});

export const createArenaTournament = asyncHandler(async (req, res) => {
  const match = await createTournament({
    creatorId: req.user._id,
    title: req.body.title,
    description: req.body.description,
    durationMinutes: req.body.durationMinutes,
    maxParticipants: req.body.maxParticipants,
    prizePool: req.body.prizePool,
    entryFee: req.body.entryFee
  });
  res.status(201).json({ match });
});

export const joinArenaTournament = asyncHandler(async (req, res) => {
  const match = await joinTournament({ userId: req.user._id, matchId: req.params.matchId });
  res.json({ match });
});

export const leaveArena = asyncHandler(async (req, res) => {
  const match = await leaveArenaMatch({ userId: req.user._id, matchId: req.params.matchId });
  res.json({ match });
});

export const getLeaderboard = asyncHandler(async (req, res) => {
  const leaderboard = await getArenaLeaderboard(req.query.limit);
  res.json({ leaderboard });
});

export const getActivity = asyncHandler(async (req, res) => {
  const activity = await getArenaActivity(req.query.limit);
  res.json({ activity });
});

export const getMatchmaking = asyncHandler(async (req, res) => {
  const status = await getArenaMatchmakingStatus(req.user._id);
  res.json(status);
});

export const resolveMatches = asyncHandler(async (_req, res) => {
  const result = await settleArenaMatches();
  res.json(result);
});

export const refreshTradeSignal = asyncHandler(async (req, res) => {
  const result = await recordArenaTrade({ userId: req.user._id });
  res.json(result);
});
