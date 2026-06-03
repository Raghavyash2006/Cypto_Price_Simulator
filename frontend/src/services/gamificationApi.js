import apiClient from './apiClient';
import { cachedGet, invalidateCache } from './requestCache';

export async function fetchGamificationOverview() {
  return cachedGet('gamification:overview', async () => {
    const { data } = await apiClient.get('/gamification/overview');
    return data;
  }, { ttl: 30000, staleTtl: 120000 });
}

export async function fetchGamificationLeaderboard(limit = 10, sortBy = 'xp') {
  return cachedGet(`gamification:leaderboard:${limit}:${sortBy}`, async () => {
    const { data } = await apiClient.get('/gamification/leaderboard', {
      params: { limit, sortBy }
    });
    return data;
  }, { ttl: 30000, staleTtl: 120000 });
}

export async function claimDailyStreak() {
  const { data } = await apiClient.post('/gamification/streak/claim');
  invalidateCache('gamification:');
  return data;
}

export async function claimGamificationReward(rewardType, rewardKey) {
  const { data } = await apiClient.post('/gamification/missions/claim', {
    rewardType,
    rewardKey
  });
  invalidateCache('gamification:');
  return data;
}
