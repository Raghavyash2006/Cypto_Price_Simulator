import User from '../../models/User.js';
import Portfolio from '../../models/Portfolio.js';
import TradeArenaMatch from '../../models/TradeArenaMatch.js';
import ArenaQueueEntry from '../../models/ArenaQueueEntry.js';
import { getPrices } from '../../services/coingeckoService.js';
import { getIo } from '../../config/socket.js';
import { awardXp } from '../services/gamificationService.js';

const DEFAULT_BATTLE_MINUTES = 15;
const DEFAULT_TOURNAMENT_MINUTES = 45;
const DEFAULT_TOURNAMENT_SIZE = 8;
const DEFAULT_TOURNAMENT_PRIZE = 2500;
const DEFAULT_BATTLE_PRIZE = 500;

function round(value, digits = 2) {
  return Number(Number(value || 0).toFixed(digits));
}

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

function normalizeLimit(value, fallback = 20, max = 50) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return clamp(parsed, 1, max);
}

function arenaMatchRoom(matchId) {
  return `arena:match:${matchId}`;
}

async function getPortfolioSnapshot(userId) {
  const [user, holdings] = await Promise.all([
    User.findById(userId).select('virtualBalance username name avatar').lean().exec(),
    Portfolio.find({ user: userId }).lean().exec()
  ]);

  if (!user) {
    throw new Error('User not found');
  }

  const ids = holdings.map((holding) => holding.symbol.toLowerCase());
  const prices = ids.length ? await getPrices(ids, 'usd') : {};

  let holdingsValue = 0;
  let costBasis = 0;
  const positions = holdings.map((holding) => {
    const price = prices[holding.symbol.toLowerCase()]?.usd || holding.currentPrice || 0;
    const marketValue = price * holding.quantity;
    const positionCost = holding.buyPrice * holding.quantity;
    holdingsValue += marketValue;
    costBasis += positionCost;
    return {
      symbol: holding.symbol,
      coinName: holding.coinName,
      quantity: holding.quantity,
      buyPrice: holding.buyPrice,
      currentPrice: price,
      marketValue: round(marketValue, 2),
      profitLoss: round(marketValue - positionCost, 2)
    };
  });

  const cashBalance = Number(user.virtualBalance || 0);
  const totalValue = holdingsValue + cashBalance;
  const profitLoss = holdingsValue - costBasis;

  return {
    user,
    cashBalance: round(cashBalance, 2),
    holdingsValue: round(holdingsValue, 2),
    costBasis: round(costBasis, 2),
    totalValue: round(totalValue, 2),
    profitLoss: round(profitLoss, 2),
    positions
  };
}

function participantScore(participant) {
  const base = participant.startingValue || 0;
  const currentValue = participant.currentValue || 0;
  const gain = currentValue - base;
  const roiPct = base > 0 ? (gain / base) * 100 : 0;
  const activityBonus = (participant.tradesCount || 0) * 1.5;
  const momentumBonus = gain >= 0 ? 2 : 0;
  return round(roiPct + activityBonus + momentumBonus, 2);
}

function sortStandings(match) {
  const standings = [...(match.participants || [])]
    .map((participant) => ({
      ...participant,
      score: participantScore(participant),
      roiPct: round(participant.startingValue ? ((participant.currentValue - participant.startingValue) / participant.startingValue) * 100 : 0, 2)
    }))
    .sort((left, right) => right.score - left.score)
    .map((participant, index) => ({
      ...participant,
      rank: index + 1
    }));

  return standings;
}

function toPublicMatch(match, viewerId = null) {
  const standings = sortStandings(match);
  const viewerEntry = viewerId ? standings.find((entry) => String(entry.user) === String(viewerId)) : null;
  return {
    id: match._id,
    title: match.title,
    mode: match.mode,
    status: match.status,
    description: match.description,
    creator: match.creator,
    durationMinutes: match.durationMinutes,
    startsAt: match.startsAt,
    endsAt: match.endsAt,
    entryFee: match.entryFee,
    prizePool: match.prizePool,
    maxParticipants: match.maxParticipants,
    participantsCount: match.participants?.length || 0,
    standings,
    winner: match.winner,
    rewardStatus: match.rewardStatus,
    leaderboardSnapshot: match.leaderboardSnapshot,
    metadata: match.metadata,
    isJoined: viewerEntry ? true : false,
    viewerEntry
  };
}

function emitMatchUpdate(match) {
  const io = getIo();
  if (!io) return;
  const payload = toPublicMatch(match);
  io.to(arenaMatchRoom(match._id)).emit('arena:match:update', payload);
  io.emit('arena:leaderboard:update', payload);
}

async function settleMatch(match) {
  if (match.status === 'completed') return match;

  const standings = sortStandings(match);
  match.participants = standings.map((entry) => ({
    user: entry.user,
    joinedAt: entry.joinedAt,
    startingValue: entry.startingValue,
    currentValue: entry.currentValue,
    score: entry.score,
    roiPct: entry.roiPct,
    tradesCount: entry.tradesCount,
    lastUpdatedAt: entry.lastUpdatedAt,
    rank: entry.rank
  }));
  match.status = 'completed';
  match.winner = standings[0]?.user || null;
  match.rewardStatus = 'distributed';
  match.leaderboardSnapshot = standings;

  await match.save();

  const rewards = standings.slice(0, Math.min(standings.length, match.mode === 'battle' ? 2 : 3));
  for (const [index, entry] of rewards.entries()) {
    const xpReward = match.mode === 'battle'
      ? (index === 0 ? 300 : 120)
      : [500, 250, 150][index] || 100;
    // eslint-disable-next-line no-await-in-loop
    await awardXp(entry.user, xpReward, `${match.mode} arena reward`, {
      matchId: String(match._id),
      rank: entry.rank,
      mode: match.mode,
      title: match.title
    }).catch(() => null);
  }

  const io = getIo();
  if (io) {
    const payload = toPublicMatch(match);
    io.to(arenaMatchRoom(match._id)).emit('arena:match:update', payload);
    io.to(arenaMatchRoom(match._id)).emit('arena:match:ended', payload);
    io.emit('arena:leaderboard:update', payload);
  }
  return match;
}

async function refreshExpiredMatches() {
  const now = new Date();
  const activeMatches = await TradeArenaMatch.find({ status: 'active', endsAt: { $lte: now } }).exec();
  for (const match of activeMatches) {
    // eslint-disable-next-line no-await-in-loop
    await settleMatch(match);
  }
}

async function resolveQueueMatch(queueEntry, opponentEntry, preferences = {}) {
  const now = new Date();
  const durationMinutes = clamp(preferences.durationMinutes || queueEntry.durationMinutes || DEFAULT_BATTLE_MINUTES, 5, 60);
  const battle = await TradeArenaMatch.create({
    title: `${queueEntry.user.username || 'Trader'} vs ${opponentEntry.user.username || 'Opponent'}`,
    mode: 'battle',
    status: 'active',
    description: 'Live 1v1 trading battle',
    creator: queueEntry.user._id,
    durationMinutes,
    startsAt: now,
    endsAt: new Date(now.getTime() + durationMinutes * 60 * 1000),
    entryFee: queueEntry.entryFee || 0,
    prizePool: queueEntry.prizePool || DEFAULT_BATTLE_PRIZE,
    maxParticipants: 2,
    participants: [
      {
        user: queueEntry.user._id,
        joinedAt: now,
        ...await buildParticipantEntry(queueEntry.user._id)
      },
      {
        user: opponentEntry.user._id,
        joinedAt: now,
        ...await buildParticipantEntry(opponentEntry.user._id)
      }
    ],
    metadata: { matchup: 'battle' }
  });

  queueEntry.status = 'matched';
  queueEntry.matchedMatch = battle._id;
  await queueEntry.save();
  opponentEntry.status = 'matched';
  opponentEntry.matchedMatch = battle._id;
  await opponentEntry.save();

  emitMatchUpdate(battle);
  return battle;
}

async function buildParticipantEntry(userId) {
  const snapshot = await getPortfolioSnapshot(userId);
  return {
    startingValue: snapshot.totalValue,
    currentValue: snapshot.totalValue,
    score: 0,
    roiPct: 0,
    tradesCount: 0,
    lastUpdatedAt: new Date(),
    rank: 0
  };
}

export async function ensureArenaFixtures() {
  const count = await TradeArenaMatch.countDocuments({}).exec();
  if (count > 0) return;

  const now = new Date();
  await TradeArenaMatch.create({
    title: 'Weekend Sprint Cup',
    mode: 'tournament',
    status: 'active',
    description: 'Open tournament for fast-paced crypto traders.',
    durationMinutes: DEFAULT_TOURNAMENT_MINUTES,
    startsAt: now,
    endsAt: new Date(now.getTime() + DEFAULT_TOURNAMENT_MINUTES * 60 * 1000),
    prizePool: DEFAULT_TOURNAMENT_PRIZE,
    entryFee: 0,
    maxParticipants: DEFAULT_TOURNAMENT_SIZE,
    participants: [],
    metadata: { seed: true }
  });
}

export async function getArenaDashboard(userId) {
  await refreshExpiredMatches();

  const [matches, queueEntries, leaderboard] = await Promise.all([
    TradeArenaMatch.find({ status: { $in: ['waiting', 'active'] } })
      .sort({ endsAt: 1, createdAt: -1 })
      .limit(12)
      .lean()
      .exec(),
    ArenaQueueEntry.find({ user: userId, status: 'waiting' }).sort({ createdAt: -1 }).limit(5).lean().exec(),
    getArenaLeaderboard(10)
  ]);

  const activeMatches = matches.filter((match) => match.status === 'active');
  const tournaments = matches.filter((match) => match.mode === 'tournament');
  const battles = matches.filter((match) => match.mode === 'battle');

  return {
    matches: matches.map((match) => toPublicMatch(match, userId)),
    battles: battles.map((match) => toPublicMatch(match, userId)),
    tournaments: tournaments.map((match) => toPublicMatch(match, userId)),
    activeMatches: activeMatches.length,
    queue: queueEntries,
    leaderboard
  };
}

export async function listArenaMatches({ userId, status = null, mode = null, limit = 20 } = {}) {
  await refreshExpiredMatches();
  const query = {};
  if (status) query.status = status;
  if (mode) query.mode = mode;

  const matches = await TradeArenaMatch.find(query).sort({ endsAt: 1, createdAt: -1 }).limit(normalizeLimit(limit, 20)).lean().exec();
  return matches.map((match) => toPublicMatch(match, userId));
}

export async function getArenaMatch(matchId, userId = null) {
  await refreshExpiredMatches();
  const match = await TradeArenaMatch.findById(matchId).lean().exec();
  if (!match) throw new Error('Match not found');
  return toPublicMatch(match, userId);
}

export async function queueForBattle({ userId, durationMinutes = DEFAULT_BATTLE_MINUTES, entryFee = 0, prizePool = DEFAULT_BATTLE_PRIZE, preferences = {} }) {
  await refreshExpiredMatches();
  const user = await User.findById(userId).select('username name virtualBalance').lean().exec();
  if (!user) throw new Error('User not found');

  const existingQueue = await ArenaQueueEntry.findOne({ user: userId, mode: 'battle', status: 'waiting' }).lean().exec();
  if (existingQueue) {
    return {
      queue: existingQueue,
      state: 'waiting'
    };
  }

  const opponentQueue = await ArenaQueueEntry.findOne({ mode: 'battle', status: 'waiting', user: { $ne: userId } })
    .populate('user', 'username name virtualBalance')
    .sort({ createdAt: 1 })
    .exec();

  if (opponentQueue) {
    const ownQueue = await ArenaQueueEntry.create({
      user: userId,
      mode: 'battle',
      status: 'matched',
      durationMinutes,
      entryFee,
      prizePool,
      preferences,
      matchedMatch: opponentQueue.matchedMatch || null,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    const queueUser = await User.findById(userId).select('username name virtualBalance').lean().exec();
    const battle = await resolveQueueMatch(
      { user: queueUser, durationMinutes, entryFee, prizePool },
      opponentQueue,
      { durationMinutes, entryFee, prizePool, preferences }
    );

    ownQueue.matchedMatch = battle._id;
    await ownQueue.save();

    return {
      state: 'matched',
      match: toPublicMatch(battle, userId)
    };
  }

  const queue = await ArenaQueueEntry.create({
    user: userId,
    mode: 'battle',
    status: 'waiting',
    durationMinutes,
    entryFee,
    prizePool,
    preferences,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });

  return {
    queue,
    state: 'waiting'
  };
}

export async function createTournament({ creatorId, title, description = '', durationMinutes = DEFAULT_TOURNAMENT_MINUTES, maxParticipants = DEFAULT_TOURNAMENT_SIZE, prizePool = DEFAULT_TOURNAMENT_PRIZE, entryFee = 0 }) {
  await refreshExpiredMatches();
  const creator = await User.findById(creatorId).select('username name virtualBalance').lean().exec();
  if (!creator) throw new Error('User not found');

  const now = new Date();
  const match = await TradeArenaMatch.create({
    title: title || 'Community Tournament',
    mode: 'tournament',
    status: 'active',
    description: description || 'Open trading tournament',
    creator: creatorId,
    durationMinutes,
    startsAt: now,
    endsAt: new Date(now.getTime() + durationMinutes * 60 * 1000),
    entryFee,
    prizePool,
    maxParticipants: clamp(maxParticipants, 4, 32),
    participants: [
      {
        user: creatorId,
        joinedAt: now,
        ...await buildParticipantEntry(creatorId)
      }
    ],
    metadata: { createdBy: creatorId, type: 'tournament' }
  });

  emitMatchUpdate(match);
  return toPublicMatch(match, creatorId);
}

export async function joinTournament({ userId, matchId }) {
  await refreshExpiredMatches();
  const match = await TradeArenaMatch.findById(matchId).exec();
  if (!match) throw new Error('Match not found');
  if (match.mode !== 'tournament') throw new Error('Not a tournament');
  if (match.status === 'completed') throw new Error('Tournament already finished');
  if ((match.participants || []).some((participant) => String(participant.user) === String(userId))) {
    return toPublicMatch(match, userId);
  }
  if ((match.participants || []).length >= match.maxParticipants) {
    throw new Error('Tournament is full');
  }

  match.participants.push({
    user: userId,
    joinedAt: new Date(),
    ...await buildParticipantEntry(userId)
  });
  await match.save();
  emitMatchUpdate(match);
  return toPublicMatch(match, userId);
}

export async function leaveArenaMatch({ userId, matchId }) {
  const match = await TradeArenaMatch.findById(matchId).exec();
  if (!match) throw new Error('Match not found');
  match.participants = (match.participants || []).filter((participant) => String(participant.user) !== String(userId));
  await match.save();
  emitMatchUpdate(match);
  return toPublicMatch(match, userId);
}

export async function getArenaLeaderboard(limit = 20) {
  await refreshExpiredMatches();
  const rows = await TradeArenaMatch.aggregate([
    { $match: { status: 'completed' } },
    { $unwind: '$participants' },
    {
      $group: {
        _id: '$participants.user',
        totalScore: { $sum: '$participants.score' },
        matchesPlayed: { $sum: 1 },
        matchesWon: {
          $sum: {
            $cond: [{ $eq: ['$winner', '$participants.user'] }, 1, 0]
          }
        },
        averageRoi: { $avg: '$participants.roiPct' },
        bestRoi: { $max: '$participants.roiPct' },
        totalTrades: { $sum: '$participants.tradesCount' }
      }
    },
    { $sort: { totalScore: -1, matchesWon: -1, averageRoi: -1 } },
    { $limit: normalizeLimit(limit, 20) },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        _id: 0,
        userId: '$user._id',
        username: '$user.username',
        name: '$user.name',
        avatar: '$user.avatar',
        totalScore: 1,
        matchesPlayed: 1,
        matchesWon: 1,
        averageRoi: { $round: ['$averageRoi', 2] },
        bestRoi: { $round: ['$bestRoi', 2] },
        totalTrades: 1
      }
    }
  ]);

  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function getArenaActivity(limit = 20) {
  await refreshExpiredMatches();
  const matches = await TradeArenaMatch.find({}).sort({ updatedAt: -1 }).limit(clamp(limit, 30)).populate('participants.user', 'username name avatar').lean().exec();
  return matches.map((match) => toPublicMatch(match));
}

export async function recordArenaTrade({ userId }) {
  await refreshExpiredMatches();
  const matches = await TradeArenaMatch.find({ status: 'active', 'participants.user': userId }).exec();
  if (!matches.length) return { updated: 0 };

  const snapshot = await getPortfolioSnapshot(userId);
  let updated = 0;

  for (const match of matches) {
    const participant = match.participants.find((entry) => String(entry.user) === String(userId));
    if (!participant) continue;

    participant.currentValue = snapshot.totalValue;
    participant.tradesCount = (participant.tradesCount || 0) + 1;
    participant.roiPct = participant.startingValue ? ((participant.currentValue - participant.startingValue) / participant.startingValue) * 100 : 0;
    participant.score = participantScore(participant);
    participant.lastUpdatedAt = new Date();
    updated += 1;

    match.participants = sortStandings(match).map((entry) => ({
      user: entry.user,
      joinedAt: entry.joinedAt,
      startingValue: entry.startingValue,
      currentValue: entry.currentValue,
      score: entry.score,
      roiPct: entry.roiPct,
      tradesCount: entry.tradesCount,
      lastUpdatedAt: entry.lastUpdatedAt,
      rank: entry.rank
    }));
    match.leaderboardSnapshot = match.participants;
    await match.save();
    emitMatchUpdate(match);
  }

  return { updated };
}

export async function settleArenaMatches() {
  await refreshExpiredMatches();
  const matches = await TradeArenaMatch.find({ status: 'active', endsAt: { $lte: new Date() } }).exec();
  for (const match of matches) {
    // eslint-disable-next-line no-await-in-loop
    await settleMatch(match);
  }
  return { settled: matches.length };
}

export async function getArenaMatchmakingStatus(userId) {
  const queue = await ArenaQueueEntry.findOne({ user: userId, status: 'waiting' }).lean().exec();
  const activeMatch = await TradeArenaMatch.findOne({ status: 'active', 'participants.user': userId }).sort({ endsAt: -1 }).lean().exec();
  return {
    queue,
    activeMatch: activeMatch ? toPublicMatch(activeMatch, userId) : null
  };
}
