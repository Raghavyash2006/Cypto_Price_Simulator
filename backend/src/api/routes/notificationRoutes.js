import { Router } from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { validateBody, validateObjectId } from '../../middleware/validate.js';
import {
  clearUserNotifications,
  createAlert,
  deleteAlert,
  getAlerts,
  getInbox,
  getNotifications,
  getUnreadCount,
  readAllNotifications,
  readNotification,
  updateAlert
} from '../controllers/notificationController.js';

const router = Router();
const notificationWriteRateLimit = createRateLimiter({
  keyPrefix: 'notifications-write',
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: 'Too many notification actions, please wait a bit.'
});

router.get('/', protect, getNotifications);
router.get('/inbox', protect, getInbox);
router.get('/unread-count', protect, getUnreadCount);
router.patch('/read-all', protect, readAllNotifications);
router.patch('/:notificationId/read', protect, validateObjectId('notificationId'), readNotification);
router.delete('/clear', protect, clearUserNotifications);
router.get('/alerts', protect, getAlerts);
router.post('/alerts', protect, notificationWriteRateLimit, validateBody(['type']), createAlert);
router.patch('/alerts/:alertId', protect, notificationWriteRateLimit, validateObjectId('alertId'), updateAlert);
router.delete('/alerts/:alertId', protect, notificationWriteRateLimit, validateObjectId('alertId'), deleteAlert);

export default router;
