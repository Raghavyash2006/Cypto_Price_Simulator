import cron from 'node-cron';
import {
  checkPortfolioAlerts,
  checkPriceAlerts,
  checkMovementAlerts,
  sendCompetitionReminders,
  sendDailyRewardReminders,
  sendWeeklyDigestNotifications
} from '../api/services/notificationService.js';

let started = false;
const scheduledJobs = [];

function schedule(expression, task, name) {
  const job = cron.schedule(
    expression,
    async () => {
      try {
        await task();
      } catch (error) {
        console.error(`[notification-scheduler] ${name} failed`, error.message || error);
      }
    },
    {
      scheduled: false,
      timezone: process.env.CRON_TIMEZONE || 'UTC'
    }
  );

  job.start();
  scheduledJobs.push(job);
}

export function startNotificationScheduler() {
  if (started) return scheduledJobs;
  started = true;

  schedule('*/1 * * * *', async () => {
    await Promise.all([checkPriceAlerts(), checkPortfolioAlerts(), checkMovementAlerts()]);
  }, 'market-alerts');

  schedule('*/15 * * * *', sendCompetitionReminders, 'competition-reminders');
  schedule('0 9 * * *', sendDailyRewardReminders, 'daily-reward-reminders');
  schedule('0 18 * * 0', sendWeeklyDigestNotifications, 'weekly-digest-reminders');

  return scheduledJobs;
}

export function stopNotificationScheduler() {
  while (scheduledJobs.length) {
    const job = scheduledJobs.pop();
    job?.stop?.();
  }
  started = false;
}
