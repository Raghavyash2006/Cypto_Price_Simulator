import mongoose from 'mongoose';
import User from '../../models/User.js';
import Portfolio from '../../models/Portfolio.js';
import Transaction from '../../models/Transaction.js';
import SocialPost from '../../models/SocialPost.js';
import SocialComment from '../../models/SocialComment.js';
import SocialLike from '../../models/SocialLike.js';
import SocialActivity from '../../models/SocialActivity.js';
import FriendRequest from '../../models/FriendRequest.js';
import TradingCompetition from '../../models/TradingCompetition.js';
import { getPrices } from '../../services/coingeckoService.js';
import { getIo, getUserRoom } from '../../config/socket.js';
import { sanitizeText, sanitizeUrl, toPositiveInt } from '../../utils/inputSanitizer.js';

const SOCIAL_LIMITS = {
  feed: 20,
  activity: 30,
  comments: 6,
  leaderboard: 20
};

function toObjectId(value) {
  return new mongoose.Types.ObjectId(String(value));
}

function sanitizeContent(value) {
  return sanitizeText(value, { maxLength: 1000, allowNewlines: true });
}

function sanitizeComment(value) {
  return sanitizeText(value, { maxLength: 500, allowNewlines: true });
}

function emitToUser(userId, event, payload) {
  const io = getIo();
  if (!io || !userId) return;
  io.to(getUserRoom(userId)).emit(event, payload);
}

async function notifyUser(userId, notification) {
  const user = await User.findById(userId);
  if (!user) return;

  user.notifications = Array.isArray(user.notifications) ? user.notifications : [];
  const entry = {
    type: notification.type,
    title: notification.title || notification.message,
    message: notification.message,
    source: notification.source || 'social',
    actionUrl: notification.actionUrl || '',
    priority: notification.priority || 'normal',
    metadata: notification.metadata || {}
  };
  user.notifications.unshift(entry);
  user.notifications = user.notifications.slice(0, 20);
  await user.save();

  emitToUser(userId, 'notification:new', entry);
}

async function logActivity(payload, session) {
  const activity = await SocialActivity.create([
    {
      actor: payload.actor,
      targetUser: payload.targetUser,
      type: payload.type,
      entityType: payload.entityType || '',
      entityId: payload.entityId,
      title: payload.title,
      summary: payload.summary || '',
      metadata: payload.metadata || {},
      visibility: payload.visibility || 'public'
    }
  ], { session });

  const [record] = activity;
  const io = getIo();
  if (io && payload.visibility !== 'friends') {
    io.emit('social:activity', {
      id: record._id,
      actor: payload.actor,
      type: payload.type,
      entityType: payload.entityType || '',
      entityId: payload.entityId,
      title: payload.title,
      summary: payload.summary || '',
      metadata: payload.metadata || {},
      createdAt: record.createdAt
    });
  }

  return record;
}

async function getPortfolioSnapshot(userId) {
  const holdings = await Portfolio.find({ user: userId }).lean().exec();
  const ids = holdings.map((holding) => holding.symbol.toLowerCase());
  const prices = ids.length ? await getPrices(ids, 'usd') : {};

  let totalValue = 0;
  let totalCost = 0;
  const topHoldings = holdings.map((holding) => {
    const currentPrice = prices[holding.symbol.toLowerCase()]?.usd || holding.currentPrice || 0;
    const marketValue = currentPrice * holding.quantity;
    const costBasis = holding.buyPrice * holding.quantity;
    totalValue += marketValue;
    totalCost += costBasis;
    return {
      coinName: holding.coinName,
      symbol: holding.symbol,
      quantity: holding.quantity,
      buyPrice: holding.buyPrice,
      currentPrice,
      marketValue,
      profitLoss: marketValue - costBasis
    };
  });

  topHoldings.sort((left, right) => right.marketValue - left.marketValue);

  return {
    holdings: topHoldings.slice(0, 8),
    totalValue,
    totalCost,
    profitLoss: totalValue - totalCost
  };
}

async function getCompetitionScore(competition, userId) {
  const participant = competition.participants.find((entry) => String(entry.user) === String(userId));
  if (!participant) {
    return null;
  }

  const [portfolio, tradeCount] = await Promise.all([
    getPortfolioSnapshot(userId),
    Transaction.countDocuments({
      user: userId,
      type: { $in: ['buy', 'sell'] },
      timestamp: { $gte: competition.startsAt, $lte: competition.endsAt }
    })
  ]);

  const score = portfolio.totalValue + (await User.findById(userId).select('virtualBalance').lean()).virtualBalance - participant.startingValue;

  return {
    user: participant.user,
    joinedAt: participant.joinedAt,
    startingValue: participant.startingValue,
    score,
    tradesCount: tradeCount,
    portfolioValue: portfolio.totalValue,
    profitLoss: portfolio.profitLoss
  };
}

function canSeePost(post, viewer) {
  if (post.visibility === 'public') return true;
  if (!viewer) return false;
  const viewerId = String(viewer._id || viewer);
  const authorId = String(post.author._id || post.author);
  if (viewerId === authorId) return true;
  if (post.visibility === 'followers') {
    return Array.isArray(post.author.followers) && post.author.followers.some((follower) => String(follower) === viewerId);
  }
  if (post.visibility === 'friends') {
    return Array.isArray(post.author.friends) && post.author.friends.some((friend) => String(friend) === viewerId);
  }
  return false;
}

export async function getCommunityFeed({ viewerId, limit = SOCIAL_LIMITS.feed, cursor }) {
  const viewer = viewerId ? await User.findById(viewerId).select('followers friends following').lean() : null;
  const query = {};
  if (cursor) {
    query.createdAt = { $lt: new Date(cursor) };
  }

  const posts = await SocialPost.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || SOCIAL_LIMITS.feed, 1), 50))
    .populate('author', 'username name avatar xp level followers friends')
    .lean()
    .exec();

  const visiblePosts = posts.filter((post) => canSeePost(post, viewer));
  const postIds = visiblePosts.map((post) => post._id);
  const [likes, comments] = await Promise.all([
    SocialLike.find({ post: { $in: postIds } }).select('post user').lean().exec(),
    SocialComment.find({ post: { $in: postIds } })
      .sort({ createdAt: -1 })
      .limit(visiblePosts.length * SOCIAL_LIMITS.comments)
      .populate('author', 'username name avatar')
      .lean()
      .exec()
  ]);

  const likeMap = new Map();
  likes.forEach((like) => {
    const key = String(like.post);
    likeMap.set(key, (likeMap.get(key) || 0) + 1);
  });

  const commentMap = new Map();
  comments.forEach((comment) => {
    const key = String(comment.post);
    if (!commentMap.has(key)) commentMap.set(key, []);
    commentMap.get(key).push(comment);
  });

  return visiblePosts.map((post) => ({
    ...post,
    likesCount: likeMap.get(String(post._id)) ?? post.likesCount ?? 0,
    commentsCount: commentMap.get(String(post._id))?.length ?? post.commentsCount ?? 0,
    comments: (commentMap.get(String(post._id)) || []).slice(0, SOCIAL_LIMITS.comments),
    likedByViewer: viewerId
      ? likes.some((like) => String(like.post) === String(post._id) && String(like.user) === String(viewerId))
      : false
  }));
}

export async function createPost({ userId, content, visibility = 'public', tags = [], mediaUrl = '' }) {
  const normalizedVisibility = ['public', 'followers', 'friends', 'private'].includes(String(visibility)) ? String(visibility) : 'public';
  const normalizedTags = Array.isArray(tags)
    ? tags.map((tag) => sanitizeText(tag, { maxLength: 32 })).filter(Boolean).slice(0, 6)
    : [];

  const post = await SocialPost.create({
    author: userId,
    content: sanitizeContent(content),
    visibility: normalizedVisibility,
    tags: normalizedTags,
    mediaUrl: sanitizeUrl(mediaUrl)
  });

  const populated = await SocialPost.findById(post._id).populate('author', 'username name avatar xp level').lean();
  await logActivity(
    {
      actor: userId,
      type: 'post',
      entityType: 'post',
      entityId: post._id,
      title: `${populated.author.name || populated.author.username} shared a market update`,
      summary: sanitizeContent(content).slice(0, 140),
      visibility
    }
  );

  emitToUser(userId, 'social:post', { post: populated });
  return populated;
}

export async function toggleLike({ userId, postId }) {
  const existing = await SocialLike.findOne({ user: userId, post: postId });
  const post = await SocialPost.findById(postId).populate('author', 'username name avatar').lean();
  if (!post) throw new Error('Post not found');

  if (existing) {
    await SocialLike.deleteOne({ _id: existing._id });
    await SocialPost.updateOne({ _id: postId }, { $inc: { likesCount: -1 } }).exec();
    return { liked: false, likesCount: Math.max(0, (post.likesCount || 0) - 1) };
  }

  await SocialLike.create({ user: userId, post: postId });
  await SocialPost.updateOne({ _id: postId }, { $inc: { likesCount: 1 } }).exec();

  await logActivity({
    actor: userId,
    targetUser: post.author._id,
    type: 'like',
    entityType: 'post',
    entityId: postId,
    title: `${post.author.name || post.author.username} received a like`,
    summary: 'Someone liked a post in the community feed.',
    visibility: 'public'
  });

  await notifyUser(post.author._id, {
    type: 'like',
    message: `${post.author.name || post.author.username}, your post received a like.`,
    metadata: { postId, actorId: userId }
  });

  return { liked: true, likesCount: (post.likesCount || 0) + 1 };
}

export async function addComment({ userId, postId, content }) {
  const trimmed = sanitizeComment(content);
  if (!trimmed) throw new Error('Comment is required');

  const post = await SocialPost.findById(postId).populate('author', 'username name avatar').lean();
  if (!post) throw new Error('Post not found');

  const [comment] = await SocialComment.create([{ post: postId, author: userId, content: trimmed }]);
  await SocialPost.updateOne({ _id: postId }, { $inc: { commentsCount: 1 } }).exec();

  const populatedComment = await SocialComment.findById(comment._id).populate('author', 'username name avatar').lean();

  await logActivity({
    actor: userId,
    targetUser: post.author._id,
    type: 'comment',
    entityType: 'post',
    entityId: postId,
    title: `${post.author.name || post.author.username} received a comment`,
    summary: trimmed.slice(0, 140),
    visibility: 'public'
  });

  await notifyUser(post.author._id, {
    type: 'comment',
    message: `${post.author.name || post.author.username}, someone commented on your post.`,
    metadata: { postId, actorId: userId, commentId: comment._id }
  });

  return populatedComment;
}

export async function toggleFollow({ userId, targetUsername }) {
  const target = await User.findOne({ username: sanitizeText(targetUsername, { maxLength: 30 }) }).select('username name avatar followers following friends').exec();
  if (!target) throw new Error('User not found');
  if (String(target._id) === String(userId)) throw new Error('You cannot follow yourself');

  const follower = await User.findById(userId).select('following followers friends name username avatar').exec();
  if (!follower) throw new Error('User not found');

  const alreadyFollowing = follower.following.some((entry) => String(entry) === String(target._id));

  if (alreadyFollowing) {
    follower.following = follower.following.filter((entry) => String(entry) !== String(target._id));
    target.followers = target.followers.filter((entry) => String(entry) !== String(userId));
    await Promise.all([follower.save(), target.save()]);
    return { following: false, followersCount: target.followers.length };
  }

  follower.following.push(target._id);
  target.followers.push(follower._id);
  await Promise.all([follower.save(), target.save()]);

  await logActivity({
    actor: userId,
    targetUser: target._id,
    type: 'follow',
    entityType: 'user',
    entityId: target._id,
    title: `${follower.name || follower.username} followed ${target.name || target.username}`,
    summary: 'A new connection was added to the community network.',
    visibility: 'public'
  });

  await notifyUser(target._id, {
    type: 'follow',
    message: `${follower.name || follower.username} started following you.`,
    metadata: { actorId: follower._id, targetId: target._id }
  });

  return { following: true, followersCount: target.followers.length };
}

export async function sendFriendRequest({ userId, targetUsername }) {
  const target = await User.findOne({ username: sanitizeText(targetUsername, { maxLength: 30 }) }).select('_id username name avatar friends').exec();
  if (!target) throw new Error('User not found');
  if (String(target._id) === String(userId)) throw new Error('You cannot friend yourself');

  const user = await User.findById(userId).select('_id username name avatar friends').exec();
  if (!user) throw new Error('User not found');

  if ((user.friends || []).some((friendId) => String(friendId) === String(target._id))) {
    return { status: 'friends' };
  }

  const existing = await FriendRequest.findOne({
    $or: [
      { requester: user._id, recipient: target._id },
      { requester: target._id, recipient: user._id }
    ],
    status: 'pending'
  }).lean();

  if (existing) {
    return { status: 'pending' };
  }

  const request = await FriendRequest.create({ requester: user._id, recipient: target._id });

  await logActivity({
    actor: userId,
    targetUser: target._id,
    type: 'friend_request',
    entityType: 'friendRequest',
    entityId: request._id,
    title: `${user.name || user.username} sent a friend request`,
    summary: 'A friendship request is awaiting a response.',
    visibility: 'public'
  });

  await notifyUser(target._id, {
    type: 'friend_request',
    message: `${user.name || user.username} sent you a friend request.`,
    metadata: { requestId: request._id, actorId: user._id }
  });

  return { status: 'pending', requestId: request._id };
}

export async function respondFriendRequest({ userId, requestId, decision }) {
  const normalizedDecision = String(decision || '').trim().toLowerCase();
  const request = await FriendRequest.findOne({ _id: requestId, recipient: userId }).exec();
  if (!request) throw new Error('Friend request not found');
  if (request.status !== 'pending') {
    return { status: request.status };
  }

  if (normalizedDecision === 'accept') {
    request.status = 'accepted';
    const [requester, recipient] = await Promise.all([
      User.findById(request.requester),
      User.findById(request.recipient)
    ]);

    if (!requester || !recipient) throw new Error('User not found');

    requester.friends = Array.isArray(requester.friends) ? requester.friends : [];
    recipient.friends = Array.isArray(recipient.friends) ? recipient.friends : [];
    if (!requester.friends.some((friendId) => String(friendId) === String(recipient._id))) requester.friends.push(recipient._id);
    if (!recipient.friends.some((friendId) => String(friendId) === String(requester._id))) recipient.friends.push(requester._id);
    await Promise.all([requester.save(), recipient.save(), request.save()]);

    await logActivity({
      actor: userId,
      targetUser: requester._id,
      type: 'friend_accept',
      entityType: 'friendRequest',
      entityId: request._id,
      title: `${recipient.name || recipient.username} accepted a friend request`,
      summary: 'A new friendship was added to the community network.',
      visibility: 'public'
    });

    await notifyUser(requester._id, {
      type: 'friend_accept',
      message: `${recipient.name || recipient.username} accepted your friend request.`,
      metadata: { requestId: request._id }
    });

    return { status: 'accepted' };
  }

  request.status = 'declined';
  await request.save();
  return { status: 'declined' };
}

export async function getPublicProfile({ username, viewerId }) {
  const user = await User.findOne({ username: sanitizeText(username, { maxLength: 30 }) })
    .select('username name bio avatar xp level streak referralCode referralCount followers following friends createdAt virtualBalance badges portfolioVisibility')
    .populate('badges', 'title description badgeImage xpReward key')
    .lean()
    .exec();

  if (!user) throw new Error('User not found');

  const [recentPosts, recentActivity, portfolio] = await Promise.all([
    SocialPost.find({ author: user._id, visibility: 'public' }).sort({ createdAt: -1 }).limit(6).lean().exec(),
    SocialActivity.find({ $or: [{ actor: user._id }, { targetUser: user._id }] }).sort({ createdAt: -1 }).limit(8).lean().exec(),
    getPortfolioSnapshot(user._id)
  ]);

  const viewer = viewerId ? await User.findById(viewerId).select('following friends').lean().exec() : null;
  const isFollowing = viewer ? (viewer.following || []).some((id) => String(id) === String(user._id)) : false;
  const isFriend = viewer ? (viewer.friends || []).some((id) => String(id) === String(user._id)) : false;
  const isOwner = viewerId ? String(viewerId) === String(user._id) : false;
  const canViewPortfolio = user.portfolioVisibility === 'public'
    || isOwner
    || (user.portfolioVisibility === 'followers' && isFollowing)
    || (user.portfolioVisibility === 'friends' && isFriend);

  const portfolioPayload = canViewPortfolio
    ? portfolio
    : {
        hidden: true,
        portfolioVisibility: user.portfolioVisibility,
        totalValue: null,
        profitLoss: null,
        holdings: []
      };

  return {
    user: {
      id: user._id,
      username: user.username,
      name: user.name,
      bio: user.bio || '',
      avatar: user.avatar,
      xp: user.xp || 0,
      level: user.level,
      streak: user.streak || 0,
      referralCount: user.referralCount || 0,
      followersCount: (user.followers || []).length,
      followingCount: (user.following || []).length,
      friendsCount: (user.friends || []).length,
      portfolioVisibility: user.portfolioVisibility || 'public',
      badges: user.badges || [],
      createdAt: user.createdAt,
      virtualBalance: user.virtualBalance || 0
    },
    relation: {
      isFollowing,
      isFriend,
      canMessage: isFriend || isFollowing
    },
    portfolio: portfolioPayload,
    recentPosts,
    recentActivity
  };
}

export async function updateProfileSettings({ userId, bio, avatar, portfolioVisibility }) {
  const updates = {};

  if (bio !== undefined) {
    updates.bio = sanitizeText(bio, { maxLength: 240, allowNewlines: true });
  }

  if (avatar !== undefined) {
    updates.avatar = sanitizeUrl(avatar);
  }

  if (portfolioVisibility !== undefined) {
    const normalized = String(portfolioVisibility || '').toLowerCase();
    updates.portfolioVisibility = ['public', 'followers', 'friends', 'private'].includes(normalized) ? normalized : 'public';
  }

  const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true }).select('username name bio avatar xp level streak portfolioVisibility').lean().exec();
  if (!user) throw new Error('User not found');

  await logActivity({
    actor: userId,
    type: 'profile_update',
    entityType: 'user',
    entityId: userId,
    title: `${user.name || user.username} updated their profile`,
    summary: 'Profile bio or portfolio visibility changed.',
    visibility: 'public'
  });

  return user;
}

export async function getActivityFeed({ viewerId, limit = SOCIAL_LIMITS.activity }) {
  const activities = await SocialActivity.find({
    $or: [
      { visibility: 'public' },
      ...(viewerId ? [{ targetUser: viewerId }] : [])
    ]
  })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || SOCIAL_LIMITS.activity, 1), 50))
    .populate('actor', 'username name avatar xp level')
    .populate('targetUser', 'username name avatar')
    .lean()
    .exec();

  return activities;
}

export async function getCommunityLeaderboard(limit = SOCIAL_LIMITS.leaderboard) {
  const rows = await User.aggregate([
    {
      $project: {
        username: 1,
        name: 1,
        avatar: 1,
        xp: 1,
        level: 1,
        streak: 1,
        referralCount: 1,
        followersCount: { $size: { $ifNull: ['$followers', []] } },
        friendsCount: { $size: { $ifNull: ['$friends', []] } }
      }
    },
    { $sort: { xp: -1, followersCount: -1, friendsCount: -1 } },
    { $limit: Math.min(Math.max(Number(limit) || SOCIAL_LIMITS.leaderboard, 1), 100) }
  ]);

  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function comparePortfolios({ usernameA, usernameB }) {
  const [userA, userB] = await Promise.all([
    User.findOne({ username: sanitizeText(usernameA, { maxLength: 30 }) }).select('_id username name avatar xp level').lean().exec(),
    User.findOne({ username: sanitizeText(usernameB, { maxLength: 30 }) }).select('_id username name avatar xp level').lean().exec()
  ]);

  if (!userA || !userB) throw new Error('One or both users were not found');

  const [portfolioA, portfolioB] = await Promise.all([getPortfolioSnapshot(userA._id), getPortfolioSnapshot(userB._id)]);

  return {
    users: [
      { ...userA, ...portfolioA },
      { ...userB, ...portfolioB }
    ],
    delta: {
      valueDifference: portfolioA.totalValue - portfolioB.totalValue,
      profitDifference: portfolioA.profitLoss - portfolioB.profitLoss
    }
  };
}

export async function getCompetitions({ viewerId }) {
  const competitions = await TradingCompetition.find({ isActive: true }).sort({ startsAt: -1 }).limit(10).lean().exec();
  const competitionIds = competitions.map((competition) => competition._id);
  const joinedIds = viewerId
    ? new Set(
        competitions.filter((competition) =>
          (competition.participants || []).some((participant) => String(participant.user) === String(viewerId))
        ).map((competition) => String(competition._id))
      )
    : new Set();

  return competitions.map((competition) => ({
    ...competition,
    isJoined: joinedIds.has(String(competition._id)),
    participantCount: competition.participants?.length || 0
  }));
}

export async function joinCompetition({ userId, competitionId }) {
  const competition = await TradingCompetition.findById(competitionId).exec();
  if (!competition) throw new Error('Competition not found');

  const user = await User.findById(userId).select('virtualBalance').lean().exec();
  if (!user) throw new Error('User not found');

  const alreadyJoined = competition.participants.some((participant) => String(participant.user) === String(userId));
  if (alreadyJoined) return { joined: true, alreadyJoined: true };

  const snapshot = await getPortfolioSnapshot(userId);
  competition.participants.push({ user: userId, startingValue: snapshot.totalValue + (user.virtualBalance || 0) });
  await competition.save();

  await logActivity({
    actor: userId,
    type: 'competition',
    entityType: 'competition',
    entityId: competition._id,
    title: `Joined competition: ${competition.title}`,
    summary: competition.description,
    visibility: 'public'
  });

  return { joined: true };
}

export async function getCompetitionStandings(competitionId) {
  const competition = await TradingCompetition.findById(competitionId).lean().exec();
  if (!competition) throw new Error('Competition not found');

  const standings = await Promise.all((competition.participants || []).map((participant) => getCompetitionScore(competition, participant.user)));
  standings.sort((left, right) => (right?.score || 0) - (left?.score || 0));

  return {
    competition,
    standings: standings.filter(Boolean).map((entry, index) => ({
      ...entry,
      rank: index + 1
    }))
  };
}

export async function getSocialNotifications({ userId, limit = 15 }) {
  const user = await User.findById(userId).select('notifications').lean().exec();
  return (user?.notifications || []).slice(0, toPositiveInt(limit, 15, { min: 1, max: 50 }));
}

export async function createActivityFromTrade({ userId, type, coinId, quantity, amount }) {
  const user = await User.findById(userId).select('username name avatar').lean().exec();
  if (!user) return null;

  return logActivity({
    actor: userId,
    type: 'trade',
    entityType: 'trade',
    title: `${user.name || user.username} executed a ${type} trade`,
    summary: `${quantity} ${String(coinId).toUpperCase()} for $${Number(amount || 0).toLocaleString()}`,
    metadata: { type, coinId, quantity, amount },
    visibility: 'public'
  });
}
