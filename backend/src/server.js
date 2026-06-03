import http from 'http';
import app from './app.js';
import { connectDb } from './config/db.js';
import { initSocket } from './config/socket.js';
import { startMarketPoller } from './services/marketPoller.js';
import { startNotificationScheduler } from './services/notificationScheduler.js';
import { startArenaScheduler } from './services/arenaScheduler.js';
import { ensureSeedQuizzes } from './api/services/quizService.js';
import { getEnv } from './config/env.js';

const env = getEnv();
const port = env.port;

async function start() {
  try {
    await connectDb();
    await ensureSeedQuizzes().catch((error) => {
      console.error('Quiz seed error', error.message || error);
    });

    const server = http.createServer(app);
    initSocket(server);
    // Start background jobs only after MongoDB is ready so they can safely use models.
    startMarketPoller(Number(process.env.MARKET_POLL_INTERVAL || 30000));
    startNotificationScheduler();
    startArenaScheduler();

    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('MongoDB Connection Failed', error.message || error);
    process.exit(1);
  }
}

start();