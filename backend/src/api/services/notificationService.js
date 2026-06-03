import mongoose from 'mongoose';
import User from '../../models/User.js';
import Portfolio from '../../models/Portfolio.js';
import Transaction from '../../models/Transaction.js';
import TradingCompetition from '../../models/TradingCompetition.js';
import NotificationAlert from '../../models/NotificationAlert.js';
import MarketSnapshot from '../../models/MarketSnapshot.js';
import { getPrices } from '../../services/coingeckoService.js';
import { getIo, getUserRoom } from '../../config/socket.js';
import { recordMarketEvent } from './marketEventService.js';
import { sanitizeText, sanitizeUrl, toPositiveInt } from '../../utils/inputSanitizer.js';

const NOTIFICATION_LIMIT = 40;
const ALERT_LIMIT = 25;
const DEFAULT_COOLDOWN_MINUTES = 180;

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfWeek(date = new Date()) {
  const value = startOfDay(date);
  const day = value.getDay();
  const diff = value.getDate() - day + (day === 0 ? -6 : 1);
  value.setDate(diff);
  return value;
}

function endOfWeek(date = new Date()) {
  const value = startOfWeek(date);
  value.setDate(value.getDate() + 7);
  return value;
}

function normalizeNotification(notification) {
  const type = String(notification?.type || 'system').trim().toLowerCase();
  const title = sanitizeText(notification?.title || notification?.message || 'Notification', { maxLength: 120 });
  const message = sanitizeText(notification?.message || '', { maxLength: 240, allowNewlines: true });
  const source = sanitizeText(notification?.source || 'system', { maxLength: 40 });
  const actionUrl = sanitizeUrl(notification?.actionUrl || '');
  const priority = ['low', 'normal', 'high', 'urgent'].includes(String(notification?.priority))
    ? String(notification.priority)
    : 'normal';

  return {
    type,
    title,
    message,
    source,
    actionUrl,
    priority,
    metadata: notification?.metadata || {},
    read: Boolean(notification?.read),
    readAt: notification?.readAt || null
  };
}

function isSameDay(left, right = new Date()) {
  const leftDate = new Date(left);
  const rightDate = new Date(right);
  return leftDate.toDateString() === rightDate.toDateString();
}

function cooldownExpired(alert, now = new Date()) {
  if (!alert.lastTriggeredAt) return true;
  const elapsed = now.getTime() - new Date(alert.lastTriggeredAt).getTime();
  const cooldownMs = Math.max(1, Number(alert.cooldownMinutes || DEFAULT_COOLDOWN_MINUTES)) * 60 * 1000;
  return elapsed >= cooldownMs;
}

async function emitNotification(userId, notification) {
  const io = getIo();
  if (!io || !userId) return;
  io.to(getUserRoom(userId)).emit('notification:new', notification);
}

async function persistNotification(user, notification, session) {
  const normalized = normalizeNotification(notification);
  user.notifications = Array.isArray(user.notifications) ? user.notifications : [];
  user.notifications.unshift(normalized);
  user.notifications = user.notifications.slice(0, NOTIFICATION_LIMIT);
  await user.save({ session });
  await emitNotification(user._id, normalized);
  return normalized;
}

export async function saveUserNotification({ userId, user, notification, session }) {
  let targetUser = user;
  if (!targetUser) {
    const query = User.findById(userId);
    if (session) {
      query.session(session);
    }
    targetUser = await query;
  }
  if (!targetUser) return null;
  return persistNotification(targetUser, notification, session);
}

export async function getNotificationInbox({ userId, limit = 20 }) {
  const user = await User.findById(userId).select('notifications').lean().exec();
  const items = (user?.notifications || []).slice(0, Math.min(Math.max(Number(limit) || 20, 1), NOTIFICATION_LIMIT));
  const unreadCount = items.filter((item) => !item.read).length;

  return {
    notifications: items,
    unreadCount
  };
}

export async function getUnreadNotificationCount(userId) {
  const user = await User.findById(userId).select('notifications').lean().exec();
  return (user?.notifications || []).filter((item) => !item.read).length;
}

export async function markNotificationRead({ userId, notificationId }) {
  const user = await User.findById(userId);
  if (!user) return null;

  const entry = user.notifications.id(notificationId);
  if (!entry) return null;
  entry.read = true;
  entry.readAt = new Date();
  await user.save();
  return entry.toObject();
}

export async function markAllNotificationsRead(userId) {
  const user = await User.findById(userId);
  if (!user) return null;

  user.notifications.forEach((entry) => {
    entry.read = true;
    entry.readAt = new Date();
  });
  await user.save();
  return { updated: user.notifications.length };
}

export async function clearNotifications(userId) {
  const user = await User.findById(userId);
  if (!user) return null;
  user.notifications = [];
  await user.save();
  return { cleared: true };
}

function alertToClient(alert) {
  return {
    id: alert._id,
    type: alert.type,
    title: alert.title,
    coinId: alert.coinId,
    coinName: alert.coinName,
    symbol: alert.symbol,
    direction: alert.direction,
    targetPrice: alert.targetPrice,
    portfolioMetric: alert.portfolioMetric,
    threshold: alert.threshold,
    movementPercent: alert.movementPercent,
    movementWindowMinutes: alert.movementWindowMinutes,
    movementDirection: alert.movementDirection,
    cooldownMinutes: alert.cooldownMinutes,
    isActive: alert.isActive,
    lastMatched: alert.lastMatched,
    lastTriggeredAt: alert.lastTriggeredAt,
    lastTriggeredValue: alert.lastTriggeredValue,
    lastTriggeredSignature: alert.lastTriggeredSignature,
    actionUrl: alert.actionUrl,
    metadata: alert.metadata,
    createdAt: alert.createdAt,
    updatedAt: alert.updatedAt
  };
}

export async function createNotificationAlert({ userId, type, title, coinId, coinName, symbol, direction, targetPrice, portfolioMetric, threshold, cooldownMinutes, actionUrl, metadata, movementPercent, movementWindowMinutes, movementDirection }) {
  const normalizedPortfolioMetric = ['totalValue', 'profitLoss'].includes(String(portfolioMetric))
    ? String(portfolioMetric)
    : undefined;

  const alert = await NotificationAlert.create({
    user: userId,
    type: sanitizeText(type, { maxLength: 40 }),
    title: sanitizeText(title, { maxLength: 120 }),
    coinId: sanitizeText(coinId, { maxLength: 64 }).toLowerCase(),
    coinName: sanitizeText(coinName, { maxLength: 80 }),
    symbol: sanitizeText(symbol, { maxLength: 20 }).toUpperCase(),
    direction: ['above', 'below'].includes(String(direction)) ? String(direction) : 'above',
    targetPrice: Number(targetPrice) || 0,
    portfolioMetric: normalizedPortfolioMetric,
    threshold: Number(threshold) || 0,
    cooldownMinutes: toPositiveInt(cooldownMinutes, DEFAULT_COOLDOWN_MINUTES, { min: 1, max: 1440 }),
    actionUrl: sanitizeUrl(actionUrl),
    metadata,
    movementPercent: Number(movementPercent) || 0,
    movementWindowMinutes: toPositiveInt(movementWindowMinutes, 60, { min: 1, max: 1440 }),
    movementDirection: ['above', 'below'].includes(String(movementDirection)) ? String(movementDirection) : 'above'
  });

  return alertToClient(alert.toObject());
}

export async function createMovementAlert(userId, payload) {
  const title = sanitizeText(payload.title || `${String(payload.coinName || payload.symbol || payload.coinId || 'Coin').toUpperCase()} movement alert`, { maxLength: 120 });
  return createNotificationAlert({
    userId,
    type: 'movement',
    title,
    coinId: String(payload.coinId || '').toLowerCase(),
    coinName: payload.coinName || '',
    symbol: payload.symbol || payload.coinId || '',
    direction: payload.direction || 'above',
    targetPrice: Number(payload.targetPrice) || 0,
    cooldownMinutes: Number(payload.cooldownMinutes) || DEFAULT_COOLDOWN_MINUTES,
    actionUrl: payload.actionUrl || '/market',
    metadata: payload.metadata || {},
    movementPercent: Number(payload.movementPercent) || 0,
    movementWindowMinutes: Number(payload.movementWindowMinutes) || 60,
    movementDirection: payload.movementDirection || 'above'
  });
}

export async function listNotificationAlerts({ userId, type = null }) {
  const query = { user: userId };
  if (type) query.type = type;

  const alerts = await NotificationAlert.find(query).sort({ createdAt: -1 }).limit(ALERT_LIMIT).lean().exec();
  return alerts.map(alertToClient);
}

export async function toggleNotificationAlert({ userId, alertId, isActive }) {
  const alert = await NotificationAlert.findOneAndUpdate(
    { _id: alertId, user: userId },
    { $set: { isActive: Boolean(isActive) } },
    { new: true }
  ).lean().exec();

  return alert ? alertToClient(alert) : null;
}

export async function deleteNotificationAlert({ userId, alertId }) {
  const alert = await NotificationAlert.findOneAndDelete({ _id: alertId, user: userId }).lean().exec();
  return alert ? alertToClient(alert) : null;
}

export async function getNotificationDashboard(userId) {
  const [inbox, alerts, unreadCount] = await Promise.all([
    getNotificationInbox({ userId, limit: 20 }),
    listNotificationAlerts({ userId }),
    getUnreadNotificationCount(userId)
  ]);

  return {
    ...inbox,
    unreadCount,
    alerts
  };
}

export async function createPriceAlert(userId, payload) {
  const title = sanitizeText(payload.title || `${String(payload.coinName || payload.symbol || payload.coinId || 'Coin').toUpperCase()} price alert`, { maxLength: 120 });
  return createNotificationAlert({
    userId,
    type: 'price',
    title,
    coinId: String(payload.coinId || '').toLowerCase(),
    coinName: payload.coinName || '',
    symbol: payload.symbol || payload.coinId || '',
    direction: payload.direction || 'above',
    targetPrice: Number(payload.targetPrice) || 0,
    cooldownMinutes: Number(payload.cooldownMinutes) || DEFAULT_COOLDOWN_MINUTES,
    actionUrl: payload.actionUrl || '/market',
    metadata: payload.metadata || {}
  });
}

export async function createPortfolioAlert(userId, payload) {
  const title = sanitizeText(payload.title || `${String(payload.portfolioMetric || 'portfolio').toUpperCase()} portfolio alert`, { maxLength: 120 });
  return createNotificationAlert({
    userId,
    type: 'portfolio',
    title,
    portfolioMetric: payload.portfolioMetric || 'totalValue',
    direction: payload.direction || 'above',
    threshold: Number(payload.threshold) || 0,
    cooldownMinutes: Number(payload.cooldownMinutes) || DEFAULT_COOLDOWN_MINUTES,
    actionUrl: payload.actionUrl || '/dashboard',
    metadata: payload.metadata || {}
  });
}

async function shouldSendAlert(alert, currentValue, comparisonValue) {
  const currentMatch = alert.type === 'price'
    ? (alert.direction === 'below' ? currentValue <= comparisonValue : currentValue >= comparisonValue)
    : (alert.direction === 'below' ? currentValue <= comparisonValue : currentValue >= comparisonValue);

  const ready = currentMatch && !alert.lastMatched;
  return { currentMatch, ready };
}

async function notifyFromAlert(alert, message, metadata) {
  await saveUserNotification({
    userId: alert.user,
    notification: {
      type: alert.type === 'price' ? 'price-alert' : 'portfolio-alert',
      title: alert.title,
      message,
      source: 'alerts',
      actionUrl: alert.actionUrl || '/dashboard',
      priority: 'high',
      metadata
    }
  });
}

async function notifyMovementAlert(alert, message, metadata) {
  await saveUserNotification({
    userId: alert.user,
    notification: {
      type: 'movement-alert',
      title: alert.title,
      message,
      source: 'alerts',
      actionUrl: alert.actionUrl || '/market',
      priority: 'high',
      metadata
    }
  });
}

export async function checkPriceAlerts() {
  const alerts = await NotificationAlert.find({ type: 'price', isActive: true }).lean().exec();
  if (!alerts.length) return { triggered: 0, checked: 0 };

  const ids = [...new Set(alerts.map((alert) => alert.coinId).filter(Boolean))];
  const prices = ids.length ? await getPrices(ids, 'usd') : {};
  let triggered = 0;

  for (const alert of alerts) {
    const currentValue = prices[alert.coinId]?.usd;
    if (typeof currentValue !== 'number') continue;

    const { currentMatch, ready } = await shouldSendAlert(alert, currentValue, Number(alert.targetPrice || 0));
    const signature = `${alert.coinId}:${alert.direction}:${Number(alert.targetPrice || 0)}:${Math.round(currentValue)}`;
    await NotificationAlert.updateOne(
      { _id: alert._id },
      {
        $set: {
          lastMatched: currentMatch,
          lastTriggeredValue: currentValue,
          lastTriggeredAt: currentMatch && ready ? new Date() : alert.lastTriggeredAt || null,
          lastTriggeredSignature: currentMatch && ready ? signature : alert.lastTriggeredSignature || ''
        }
      }
    );

    if (!ready) continue;

    await notifyFromAlert(alert, `Price alert: ${alert.coinName || alert.coinId} is ${alert.direction} $${Number(alert.targetPrice).toLocaleString()} at $${Number(currentValue).toLocaleString()}`, {
      alertId: alert._id,
      coinId: alert.coinId,
      coinName: alert.coinName,
      symbol: alert.symbol,
      currentPrice: currentValue,
      targetPrice: alert.targetPrice,
      direction: alert.direction
    });
    await recordMarketEvent({
      user: alert.user,
      type: 'price-alert',
      title: alert.title,
      message: `${alert.coinName || alert.coinId} crossed ${alert.direction} $${Number(alert.targetPrice).toLocaleString()}.`,
      severity: 'high',
      source: 'alerts',
      metadata: { alertId: alert._id, coinId: alert.coinId, currentValue, targetPrice: alert.targetPrice, direction: alert.direction }
    }).catch(() => null);
    triggered += 1;
  }

  return { triggered, checked: alerts.length };
}

export async function checkPortfolioAlerts() {
  const alerts = await NotificationAlert.find({ type: 'portfolio', isActive: true }).lean().exec();
  if (!alerts.length) return { triggered: 0, checked: 0 };

  const userIds = [...new Set(alerts.map((alert) => String(alert.user)))];
  const portfolios = await Portfolio.find({ user: { $in: userIds } }).lean().exec();

  const symbols = [...new Set(portfolios.map((portfolio) => portfolio.symbol.toLowerCase()))];
  const prices = symbols.length ? await getPrices(symbols, 'usd') : {};
  const portfoliosByUser = new Map();

  portfolios.forEach((portfolio) => {
    const userKey = String(portfolio.user);
    const list = portfoliosByUser.get(userKey) || [];
    list.push(portfolio);
    portfoliosByUser.set(userKey, list);
  });

  let triggered = 0;

  for (const alert of alerts) {
    const holdings = portfoliosByUser.get(String(alert.user)) || [];
    let totalValue = 0;
    let totalCost = 0;

    holdings.forEach((holding) => {
      const price = prices[holding.symbol.toLowerCase()]?.usd || holding.currentPrice || 0;
      totalValue += price * holding.quantity;
      totalCost += holding.buyPrice * holding.quantity;
    });

    const currentValue = alert.portfolioMetric === 'profitLoss' ? totalValue - totalCost : totalValue;
    const { currentMatch, ready } = await shouldSendAlert(alert, currentValue, Number(alert.threshold || 0));

    await NotificationAlert.updateOne(
      { _id: alert._id },
      {
        $set: {
          lastMatched: currentMatch,
          lastTriggeredValue: currentValue,
          lastTriggeredAt: currentMatch && ready ? new Date() : alert.lastTriggeredAt || null
        }
      }
    );

    if (!ready) continue;

    await notifyFromAlert(alert, `Portfolio alert: ${alert.portfolioMetric === 'profitLoss' ? 'P&L' : 'value'} ${alert.direction} ${Number(alert.threshold).toLocaleString()}. Current: ${Number(currentValue).toLocaleString()}`, {
      alertId: alert._id,
      portfolioMetric: alert.portfolioMetric,
      threshold: alert.threshold,
      currentValue,
      direction: alert.direction
    });
    await recordMarketEvent({
      user: alert.user,
      type: 'portfolio-alert',
      title: alert.title,
      message: `${alert.portfolioMetric === 'profitLoss' ? 'P&L' : 'Portfolio value'} is now ${alert.direction} ${Number(alert.threshold).toLocaleString()}.`,
      severity: 'high',
      source: 'alerts',
      metadata: { alertId: alert._id, portfolioMetric: alert.portfolioMetric, threshold: alert.threshold, currentValue, direction: alert.direction }
    }).catch(() => null);
    triggered += 1;
  }

  return { triggered, checked: alerts.length };
}

export async function checkMovementAlerts() {
  const alerts = await NotificationAlert.find({ type: 'movement', isActive: true }).lean().exec();
  if (!alerts.length) return { triggered: 0, checked: 0 };

  const ids = [...new Set(alerts.map((alert) => alert.coinId).filter(Boolean))];
  const currentPrices = ids.length ? await getPrices(ids, 'usd') : {};
  const windowMinutes = Math.max(5, Math.min(1440, Math.max(...alerts.map((alert) => Number(alert.movementWindowMinutes || 60)))));
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
  const baselineSnapshot = await MarketSnapshot.findOne({ capturedAt: { $lte: windowStart } }).sort({ capturedAt: -1 }).lean().exec();
  const baselinePrices = baselineSnapshot?.prices || {};
  let triggered = 0;

  for (const alert of alerts) {
    const currentValue = currentPrices[alert.coinId]?.usd;
    const baselineValue = baselinePrices[alert.coinId]?.usd;
    if (typeof currentValue !== 'number' || typeof baselineValue !== 'number' || baselineValue <= 0) continue;

    const percentChange = ((currentValue - baselineValue) / baselineValue) * 100;
    const threshold = Number(alert.movementPercent || 0);
    const matched = alert.movementDirection === 'below' ? percentChange <= -Math.abs(threshold) : percentChange >= Math.abs(threshold);
    const signature = `${alert.coinId}:${windowMinutes}:${Math.round(baselineValue)}:${Math.round(currentValue)}:${Math.round(percentChange)}`;
    const ready = matched && alert.lastTriggeredSignature !== signature && cooldownExpired(alert);

    await NotificationAlert.updateOne(
      { _id: alert._id },
      {
        $set: {
          lastMatched: matched,
          lastTriggeredValue: currentValue,
          lastTriggeredAt: ready ? new Date() : alert.lastTriggeredAt || null,
          lastTriggeredSignature: ready ? signature : alert.lastTriggeredSignature || ''
        }
      }
    );

    if (!ready) continue;

    await notifyMovementAlert(alert, `Movement alert: ${alert.coinName || alert.coinId} moved ${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}% over the last ${windowMinutes} minutes.`, {
      alertId: alert._id,
      coinId: alert.coinId,
      coinName: alert.coinName,
      symbol: alert.symbol,
      currentPrice: currentValue,
      baselinePrice: baselineValue,
      percentChange,
      windowMinutes
    });
    await recordMarketEvent({
      user: alert.user,
      type: 'movement-alert',
      title: alert.title,
      message: `${alert.coinName || alert.coinId} moved ${percentChange.toFixed(2)}% over ${windowMinutes} minutes.`,
      severity: 'high',
      source: 'alerts',
      metadata: { alertId: alert._id, coinId: alert.coinId, currentValue, baselineValue, percentChange, windowMinutes }
    }).catch(() => null);
    triggered += 1;
  }

  return { triggered, checked: alerts.length };
}

function buildDigestLine(label, value) {
  return `${label}: ${value}`;
}

async function shouldSendPeriodicNotification(user, type, windowStart) {
  const notifications = Array.isArray(user.notifications) ? user.notifications : [];
  return !notifications.some((notification) => notification.type === type && notification.createdAt && new Date(notification.createdAt) >= windowStart);
}

export async function sendDailyRewardReminders() {
  const users = await User.find({}).select('notifications username name lastStreakAt streak').lean().exec();
  const today = startOfDay();
  let sent = 0;

  for (const user of users) {
    const claimedToday = user.lastStreakAt ? isSameDay(user.lastStreakAt, new Date()) : false;
    if (claimedToday) continue;
    if (!(await shouldSendPeriodicNotification(user, 'daily_reward_reminder', today))) continue;

    await saveUserNotification({
      userId: user._id,
      notification: {
        type: 'daily_reward_reminder',
        title: 'Daily reward ready',
        message: 'Your daily reward is ready to claim. Keep your streak alive and earn bonus XP.',
        source: 'cron',
        actionUrl: '/dashboard',
        priority: 'high',
        metadata: { streak: user.streak || 0 }
      }
    });
    sent += 1;
  }

  return { sent, checked: users.length };
}

export async function sendWeeklyDigestNotifications() {
  const users = await User.find({}).select('notifications username name xp streak').lean().exec();
  const weekStart = startOfWeek();
  let sent = 0;

  for (const user of users) {
    if (!(await shouldSendPeriodicNotification(user, 'weekly_digest', weekStart))) continue;

    const [trades, rewards] = await Promise.all([
      Transaction.countDocuments({ user: user._id, timestamp: { $gte: weekStart }, type: { $in: ['buy', 'sell'] } }),
      Transaction.countDocuments({ user: user._id, timestamp: { $gte: weekStart }, type: 'reward' })
    ]);
    const achievements = (user.notifications || []).filter(
      (notification) => notification.type === 'achievement' && notification.createdAt && new Date(notification.createdAt) >= weekStart
    ).length;

    await saveUserNotification({
      userId: user._id,
      notification: {
        type: 'weekly_digest',
        title: 'Weekly digest',
        message: `This week you logged ${trades} trades, ${rewards} rewards, and ${achievements} achievement unlocks.`,
        source: 'cron',
        actionUrl: '/dashboard',
        priority: 'normal',
        metadata: { trades, rewards, achievements }
      }
    });
    sent += 1;
  }

  return { sent, checked: users.length };
}

export async function sendCompetitionReminders() {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const competitions = await TradingCompetition.find({
    isActive: true,
    $or: [
      { startsAt: { $gte: now, $lte: in24Hours } },
      { endsAt: { $gte: now, $lte: in24Hours } }
    ]
  }).lean().exec();

  let sent = 0;

  for (const competition of competitions) {
    for (const participant of competition.participants || []) {
      const user = await User.findById(participant.user).select('notifications username name').lean().exec();
      if (!user) continue;

      const reminderType = competition.startsAt > now ? 'competition_reminder' : 'competition_closing';
      const targetWindow = startOfDay(now);
      if (!(await shouldSendPeriodicNotification(user, reminderType, targetWindow))) continue;

      await saveUserNotification({
        userId: user._id,
        notification: {
          type: reminderType,
          title: competition.startsAt > now ? 'Competition starts soon' : 'Competition ending soon',
          message: competition.startsAt > now
            ? `${competition.title} starts within 24 hours. Get ready to compete.`
            : `${competition.title} ends within 24 hours. Review your position and stay active.`,
          source: 'cron',
          actionUrl: '/community',
          priority: 'high',
          metadata: {
            competitionId: competition._id,
            competitionTitle: competition.title,
            startsAt: competition.startsAt,
            endsAt: competition.endsAt
          }
        }
      });
      sent += 1;
    }
  }

  return { sent, checked: competitions.length };
}

export async function buildWeeklyDigest(userId) {
  const weekStart = startOfWeek();
  const [transactions, rewards, alerts] = await Promise.all([
    Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(String(userId)), timestamp: { $gte: weekStart } } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      }
    ]),
    Transaction.countDocuments({ user: userId, type: 'reward', timestamp: { $gte: weekStart } }),
    NotificationAlert.countDocuments({ user: userId, isActive: true })
  ]);

  return {
    summary: [
      buildDigestLine('Transactions', transactions.reduce((sum, item) => sum + item.count, 0)),
      buildDigestLine('Rewards', rewards),
      buildDigestLine('Active alerts', alerts)
    ],
    transactions
  };
}
