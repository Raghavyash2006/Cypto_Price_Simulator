import asyncHandler from '../../utils/asyncHandler.js';
import {
  addComment,
  comparePortfolios,
  createPost,
  createActivityFromTrade,
  getActivityFeed,
  getCommunityFeed,
  getCommunityLeaderboard,
  getCompetitions,
  getCompetitionStandings,
  getPublicProfile,
  getSocialNotifications,
  joinCompetition,
  respondFriendRequest,
  sendFriendRequest,
  updateProfileSettings,
   toggleFollow,
  toggleLike
} from '../services/socialService.js';

export const getFeed = asyncHandler(async (req, res) => {
  const feed = await getCommunityFeed({ viewerId: req.user._id, limit: req.query.limit, cursor: req.query.cursor });
  res.json({ feed });
});

export const createFeedPost = asyncHandler(async (req, res) => {
  const { content, visibility, tags, mediaUrl } = req.body;
  if (!content || !String(content).trim()) {
    res.status(400);
    throw new Error('content is required');
  }

  const post = await createPost({ userId: req.user._id, content, visibility, tags, mediaUrl });
  res.status(201).json({ post });
});

export const likePost = asyncHandler(async (req, res) => {
  const result = await toggleLike({ userId: req.user._id, postId: req.params.postId });
  res.json(result);
});

export const commentPost = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content || !String(content).trim()) {
    res.status(400);
    throw new Error('content is required');
  }

  const comment = await addComment({ userId: req.user._id, postId: req.params.postId, content });
  res.status(201).json({ comment });
});

export const followUser = asyncHandler(async (req, res) => {
  const { username } = req.body;
  if (!username) {
    res.status(400);
    throw new Error('username is required');
  }

  const result = await toggleFollow({ userId: req.user._id, targetUsername: username });
  res.json(result);
});

export const requestFriend = asyncHandler(async (req, res) => {
  const { username } = req.body;
  if (!username) {
    res.status(400);
    throw new Error('username is required');
  }

  const result = await sendFriendRequest({ userId: req.user._id, targetUsername: username });
  res.json(result);
});

export const respondToFriendRequest = asyncHandler(async (req, res) => {
  const { requestId, decision } = req.body;
  if (!requestId || !decision) {
    res.status(400);
    throw new Error('requestId and decision are required');
  }

  const result = await respondFriendRequest({ userId: req.user._id, requestId, decision });
  res.json(result);
});

export const getProfile = asyncHandler(async (req, res) => {
  const profile = await getPublicProfile({ username: req.params.username, viewerId: req.user?._id });
  res.json(profile);
});

export const updateSettings = asyncHandler(async (req, res) => {
  const result = await updateProfileSettings({
    userId: req.user._id,
    bio: req.body.bio,
    avatar: req.body.avatar,
    portfolioVisibility: req.body.portfolioVisibility
  });

  res.json({ profile: result });
});

export const getLeaderboard = asyncHandler(async (req, res) => {
  const leaderboard = await getCommunityLeaderboard(req.query.limit);
  res.json({ leaderboard });
});

export const getActivity = asyncHandler(async (req, res) => {
  const activity = await getActivityFeed({ viewerId: req.user._id, limit: req.query.limit });
  res.json({ activity });
});

export const compareProfiles = asyncHandler(async (req, res) => {
  const { usernameA, usernameB } = req.body;
  if (!usernameA || !usernameB) {
    res.status(400);
    throw new Error('usernameA and usernameB are required');
  }

  const comparison = await comparePortfolios({ usernameA, usernameB });
  res.json(comparison);
});

export const getCompetitionsList = asyncHandler(async (req, res) => {
  const competitions = await getCompetitions({ viewerId: req.user._id });
  res.json({ competitions });
});

export const joinTradingCompetition = asyncHandler(async (req, res) => {
  const { competitionId } = req.body;
  if (!competitionId) {
    res.status(400);
    throw new Error('competitionId is required');
  }

  const result = await joinCompetition({ userId: req.user._id, competitionId });
  res.json(result);
});

export const getCompetitionBoard = asyncHandler(async (req, res) => {
  const standings = await getCompetitionStandings(req.params.competitionId);
  res.json(standings);
});

export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await getSocialNotifications({ userId: req.user._id, limit: req.query.limit });
  res.json({ notifications });
});
