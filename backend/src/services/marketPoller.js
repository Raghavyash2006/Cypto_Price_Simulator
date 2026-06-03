import { getMarketOverview } from '../api/services/marketService.js';
import { recordMarketSnapshot } from '../api/services/marketIntelligenceService.js';
import { getIo } from '../config/socket.js';

let intervalId = null;

export function startMarketPoller(interval = 30000) {
  if (intervalId) return;
  intervalId = setInterval(async () => {
    try {
      const overview = await getMarketOverview({ limit: 50, trendingLimit: 7, moversLimit: 5 });
      await recordMarketSnapshot(overview).catch(() => null);
      const io = getIo();
      if (io) {
        io.emit('market:tick', {
          updatedAt: new Date().toISOString(),
          global: overview.global,
          coins: overview.coins.slice(0, 50),
          trending: overview.trending,
          movers: overview.movers
        });
      }
    } catch (err) {
      // swallow - poller should never crash app
      console.error('marketPoller error', err.message || err);
    }
  }, interval);
}

export function stopMarketPoller() {
  if (!intervalId) return;
  clearInterval(intervalId);
  intervalId = null;
}
