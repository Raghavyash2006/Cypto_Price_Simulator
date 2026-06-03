import apiClient from './apiClient';

export async function getAdminOverview() {
  const { data } = await apiClient.get('/admin/overview');
  return data;
}

export async function getAdminUsers(params = {}) {
  const { data } = await apiClient.get('/admin/users', { params });
  return data;
}

export async function updateAdminUser(userId, payload) {
  const { data } = await apiClient.patch(`/admin/users/${userId}`, payload);
  return data;
}

export async function deleteAdminUser(userId) {
  const { data } = await apiClient.delete(`/admin/users/${userId}`);
  return data;
}

export async function getAdminQuizzes(params = {}) {
  const { data } = await apiClient.get('/admin/quizzes', { params });
  return data;
}

export async function createAdminQuiz(payload) {
  const { data } = await apiClient.post('/admin/quizzes', payload);
  return data;
}

export async function updateAdminQuiz(quizId, payload) {
  const { data } = await apiClient.patch(`/admin/quizzes/${quizId}`, payload);
  return data;
}

export async function deleteAdminQuiz(quizId) {
  const { data } = await apiClient.delete(`/admin/quizzes/${quizId}`);
  return data;
}

export async function getAdminLeaderboard(params = {}) {
  const { data } = await apiClient.get('/admin/leaderboard', { params });
  return data;
}

export async function getAdminAnalytics() {
  const { data } = await apiClient.get('/admin/analytics');
  return data;
}

export async function getAdminActivity(params = {}) {
  const { data } = await apiClient.get('/admin/activity', { params });
  return data;
}

export async function getAdminNotifications(params = {}) {
  const { data } = await apiClient.get('/admin/notifications', { params });
  return data;
}

export async function getModerationQueue(params = {}) {
  const { data } = await apiClient.get('/admin/moderation', { params });
  return data;
}

export async function deleteModeratedPost(postId) {
  const { data } = await apiClient.delete(`/admin/moderation/posts/${postId}`);
  return data;
}

export async function deleteModeratedComment(commentId) {
  const { data } = await apiClient.delete(`/admin/moderation/comments/${commentId}`);
  return data;
}
