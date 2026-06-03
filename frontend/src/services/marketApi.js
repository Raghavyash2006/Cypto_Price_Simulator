import apiClient from './apiClient';
import { cachedGet } from './requestCache';

export async function fetchMarketOverview(options = {}) {
  const cacheKey = `market-overview:${options.limit ?? 50}:${options.trendingLimit ?? 7}:${options.moversLimit ?? 5}`;
  return cachedGet(cacheKey, async () => {
    const res = await apiClient.get('/market/overview', {
      params: {
        limit: options.limit ?? 50,
        trendingLimit: options.trendingLimit ?? 7,
        moversLimit: options.moversLimit ?? 5
      }
    });
    return res.data;
  }, { ttl: 30000, staleTtl: 120000 });
}

export async function fetchPrices(ids = []) {
  return cachedGet(`market-prices:${ids.join(',')}`, async () => {
    const res = await apiClient.get('/market/prices', { params: { ids: ids.join(',') } });
    return res.data;
  }, { ttl: 10000, staleTtl: 60000 });
}

export async function fetchTrending() {
  return cachedGet('market-trending', async () => {
    const res = await apiClient.get('/market/trending');
    return res.data;
  }, { ttl: 60000, staleTtl: 180000 });
}

export async function searchCoins(q) {
  const normalized = String(q || '').trim().toLowerCase();
  return cachedGet(`market-search:${normalized}`, async () => {
    const res = await apiClient.get('/market/search', { params: { q } });
    return res.data;
  }, { ttl: 30000, staleTtl: 120000 });
}

export async function fetchCoinDetails(id) {
  return cachedGet(`market-coin:${id}`, async () => {
    const res = await apiClient.get(`/market/coin/${id}`);
    return res.data;
  }, { ttl: 300000, staleTtl: 900000 });
}

export async function fetchCoinChart(id, days = 7) {
  return cachedGet(`market-chart:${id}:${days}`, async () => {
    const res = await apiClient.get(`/market/coin/${id}/chart`, { params: { days } });
    return res.data;
  }, { ttl: 60000, staleTtl: 300000 });
}

export async function fetchTopMovers(limit = 10) {
  return cachedGet(`market-movers:${limit}`, async () => {
    const res = await apiClient.get('/market/movers', { params: { limit } });
    return res.data;
  }, { ttl: 60000, staleTtl: 180000 });
}

export async function fetchMarketSentiment() {
  return cachedGet('market-sentiment', async () => {
    const res = await apiClient.get('/market/sentiment');
    return res.data;
  }, { ttl: 60000, staleTtl: 180000 });
}

export async function fetchMarketEvents(limit = 20) {
  return cachedGet(`market-events:${limit}`, async () => {
    const res = await apiClient.get('/market/events', { params: { limit } });
    return res.data;
  }, { ttl: 30000, staleTtl: 120000 });
}

export async function fetchMarketSnapshots(limit = 12) {
  return cachedGet(`market-snapshots:${limit}`, async () => {
    const res = await apiClient.get('/market/snapshots', { params: { limit } });
    return res.data;
  }, { ttl: 60000, staleTtl: 180000 });
}

export async function fetchLatestMarketSnapshot() {
  return cachedGet('market-snapshot-latest', async () => {
    const res = await apiClient.get('/market/snapshot/latest');
    return res.data;
  }, { ttl: 30000, staleTtl: 120000 });
}

export async function fetchWatchlist() {
  const res = await apiClient.get('/market/watchlist');
  return res.data;
}

export async function addWatchlistCoin(payload) {
  const res = await apiClient.post('/market/watchlist', payload);
  return res.data;
}

export async function removeWatchlistCoin(coinId) {
  const res = await apiClient.delete(`/market/watchlist/${coinId}`);
  return res.data;
}

export async function clearWatchlist() {
  const res = await apiClient.delete('/market/watchlist');
  return res.data;
}
