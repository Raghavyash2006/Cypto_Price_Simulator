import asyncHandler from '../../utils/asyncHandler.js';
import {
  clearNotifications,
  createMovementAlert,
  createPortfolioAlert,
  createPriceAlert,
  deleteNotificationAlert,
  getNotificationDashboard,
  getNotificationInbox,
  getUnreadNotificationCount,
  listNotificationAlerts,
  markAllNotificationsRead,
  markNotificationRead,
  toggleNotificationAlert
} from '../services/notificationService.js';

export const getNotifications = asyncHandler(async (req, res) => {
  const dashboard = await getNotificationDashboard(req.user._id);
  res.json(dashboard);
});

export const getInbox = asyncHandler(async (req, res) => {
  const inbox = await getNotificationInbox({ userId: req.user._id, limit: req.query.limit });
  res.json(inbox);
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await getUnreadNotificationCount(req.user._id);
  res.json({ unreadCount });
});

export const readNotification = asyncHandler(async (req, res) => {
  const notification = await markNotificationRead({ userId: req.user._id, notificationId: req.params.notificationId });
  res.json({ notification });
});

export const readAllNotifications = asyncHandler(async (req, res) => {
  const result = await markAllNotificationsRead(req.user._id);
  res.json(result);
});

export const clearUserNotifications = asyncHandler(async (req, res) => {
  const result = await clearNotifications(req.user._id);
  res.json(result);
});

export const getAlerts = asyncHandler(async (req, res) => {
  const alerts = await listNotificationAlerts({ userId: req.user._id, type: req.query.type });
  res.json({ alerts });
});

export const createAlert = asyncHandler(async (req, res) => {
  const { type } = req.body;
  if (!type) {
    res.status(400);
    throw new Error('type is required');
  }

  const alert = type === 'portfolio'
    ? await createPortfolioAlert(req.user._id, req.body)
    : type === 'movement'
      ? await createMovementAlert(req.user._id, req.body)
      : await createPriceAlert(req.user._id, req.body);

  res.status(201).json({ alert });
});

export const updateAlert = asyncHandler(async (req, res) => {
  const alert = await toggleNotificationAlert({ userId: req.user._id, alertId: req.params.alertId, isActive: req.body.isActive });
  res.json({ alert });
});

export const deleteAlert = asyncHandler(async (req, res) => {
  const alert = await deleteNotificationAlert({ userId: req.user._id, alertId: req.params.alertId });
  res.json({ alert });
});
