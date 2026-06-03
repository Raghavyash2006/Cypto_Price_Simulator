import cron from 'node-cron';
import { ensureArenaFixtures, settleArenaMatches } from '../api/services/arenaService.js';

let started = false;
let job = null;

export async function startArenaScheduler() {
  if (started) return job;
  started = true;

  await ensureArenaFixtures().catch((error) => {
    console.error('[arena-scheduler] fixture seeding failed', error.message || error);
  });

  job = cron.schedule(
    '*/1 * * * *',
    async () => {
      try {
        await settleArenaMatches();
      } catch (error) {
        console.error('[arena-scheduler] settlement failed', error.message || error);
      }
    },
    {
      scheduled: true,
      timezone: process.env.CRON_TIMEZONE || 'UTC'
    }
  );

  return job;
}

export function stopArenaScheduler() {
  job?.stop?.();
  job = null;
  started = false;
}
