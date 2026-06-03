import asyncHandler from '../../utils/asyncHandler.js';
import {
  createAdminQuiz,
  deleteAdminQuiz,
  deleteAdminUser,
  deleteModeratedComment,
  deleteModeratedPost,
  getAdminAnalytics,
  getAdminLeaderboard,
  getAdminOverview,
  listAdminActivity as getAdminActivity,
  listAdminNotifications as getAdminNotifications,
  listAdminQuizzes,
  listAdminUsers,
  listModerationQueue,
  updateAdminQuiz,
  updateAdminUser
} from '../services/adminService.js';

export const getOverview = asyncHandler(async (req, res) => {
  const overview = await getAdminOverview();
  res.json(overview);
});

export const getUsers = asyncHandler(async (req, res) => {
  const users = await listAdminUsers({ search: req.query.search, limit: req.query.limit, page: req.query.page });
  res.json(users);
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await updateAdminUser(req.params.userId, req.body);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json({ user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await deleteAdminUser(req.params.userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json({ user });
});

export const getQuizzes = asyncHandler(async (req, res) => {
  const quizzes = await listAdminQuizzes({
    search: req.query.search,
    level: req.query.level,
    category: req.query.category,
    limit: req.query.limit,
    page: req.query.page
  });
  res.json(quizzes);
});

export const createQuiz = asyncHandler(async (req, res) => {
  const quiz = await createAdminQuiz(req.body);
  res.status(201).json({ quiz });
});

export const updateQuiz = asyncHandler(async (req, res) => {
  const quiz = await updateAdminQuiz(req.params.quizId, req.body);
  if (!quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }
  res.json({ quiz });
});

export const deleteQuiz = asyncHandler(async (req, res) => {
  const quiz = await deleteAdminQuiz(req.params.quizId);
  if (!quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }
  res.json({ quiz });
});

export const getLeaderboard = asyncHandler(async (req, res) => {
  const leaderboard = await getAdminLeaderboard(req.query.limit);
  res.json({ leaderboard });
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await getAdminAnalytics();
  res.json(analytics);
});

export const getActivity = asyncHandler(async (req, res) => {
  const activity = await getAdminActivity({ limit: req.query.limit });
  res.json(activity);
});

export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await getAdminNotifications({ limit: req.query.limit });
  res.json(notifications);
});

export const getModerationQueue = asyncHandler(async (req, res) => {
  const queue = await listModerationQueue({ limit: req.query.limit });
  res.json(queue);
});

export const removePost = asyncHandler(async (req, res) => {
  const post = await deleteModeratedPost(req.params.postId);
  if (!post) {
    res.status(404);
    throw new Error('Post not found');
  }
  res.json({ post });
});

export const removeComment = asyncHandler(async (req, res) => {
  const comment = await deleteModeratedComment(req.params.commentId);
  if (!comment) {
    res.status(404);
    throw new Error('Comment not found');
  }
  res.json({ comment });
});
