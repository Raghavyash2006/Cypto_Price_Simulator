import apiClient from './apiClient';

export async function getNotificationDashboard() {
  const { data } = await apiClient.get('/notifications');
  return data;
}

export async function getNotificationInbox(limit = 20) {
  const { data } = await apiClient.get('/notifications/inbox', { params: { limit } });
  return data;
}

export async function markNotificationRead(notificationId) {
  const { data } = await apiClient.patch(`/notifications/${notificationId}/read`);
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await apiClient.patch('/notifications/read-all');
  return data;
}

export async function getUnreadNotificationCount() {
  const { data } = await apiClient.get('/notifications/unread-count');
  return data;
}

export async function clearNotifications() {
  const { data } = await apiClient.delete('/notifications/clear');
  return data;
}

export async function listNotificationAlerts(params = {}) {
  const { data } = await apiClient.get('/notifications/alerts', { params });
  return data;
}

export async function createNotificationAlert(payload) {
  const { data } = await apiClient.post('/notifications/alerts', payload);
  return data;
}

export async function updateNotificationAlert(alertId, payload) {
  const { data } = await apiClient.patch(`/notifications/alerts/${alertId}`, payload);
  return data;
}

export async function deleteNotificationAlert(alertId) {
  const { data } = await apiClient.delete(`/notifications/alerts/${alertId}`);
  return data;
}
