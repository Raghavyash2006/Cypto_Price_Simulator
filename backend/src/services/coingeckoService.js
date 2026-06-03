import axios from 'axios';
import NodeCache from 'node-cache';
import { sanitizeText, toPositiveInt } from '../utils/inputSanitizer.js';

const cache = new NodeCache({ stdTTL: 0, useClones: false });
const inFlight = new Map();
const API = axios.create({ baseURL: 'https://api.coingecko.com/api/v3', timeout: 10000 });

function logCoinGeckoFailure(endpoint, error, fallbackUsed = false) {
  const status = error?.response?.status || 'network';
  const message = error?.response?.data?.error || error?.message || 'Unknown error';
  console.warn(`[CoinGecko] ${endpoint} failed (${status})${fallbackUsed ? ' using fallback' : ''}: ${message}`);
}

function buildMockMarketSnapshot(limit = 50) {
  const base = [
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc', current_price: 65000, market_cap: 1200000000000, total_volume: 35000000000, price_change_percentage_24h: 1.8, market_cap_rank: 1 },
    { id: 'ethereum', name: 'Ethereum', symbol: 'eth', current_price: 3500, market_cap: 420000000000, total_volume: 18000000000, price_change_percentage_24h: 2.4, market_cap_rank: 2 },
    { id: 'solana', name: 'Solana', symbol: 'sol', current_price: 145, market_cap: 65000000000, total_volume: 3200000000, price_change_percentage_24h: 4.1, market_cap_rank: 5 },
    { id: 'ripple', name: 'XRP', symbol: 'xrp', current_price: 0.68, market_cap: 36000000000, total_volume: 2200000000, price_change_percentage_24h: -1.1, market_cap_rank: 7 },
    { id: 'cardano', name: 'Cardano', symbol: 'ada', current_price: 0.54, market_cap: 19000000000, total_volume: 1200000000, price_change_percentage_24h: 0.8, market_cap_rank: 10 }
  ];

  return base.slice(0, Math.max(1, Math.min(limit, base.length)));
}

function buildMockPriceMap(ids = [], vs = 'usd') {
  const normalizedVs = normalizeVsCurrency(vs);
  const snapshot = buildMockMarketSnapshot(10);
  return Object.fromEntries(ids.map((id, index) => {
    const coin = snapshot.find((entry) => entry.id === id) || snapshot[index % snapshot.length] || { current_price: 1000 + (index * 25) };
    return [id, { [normalizedVs]: coin.current_price || (1000 + (index * 25)) }];
  }));
}

function buildMockCoinDetails(coinId) {
  const snapshot = buildMockMarketSnapshot(10);
  const coin = snapshot.find((entry) => entry.id === coinId) || snapshot[0];

  return {
    id: coinId,
    name: coin?.name || coinId,
    symbol: coin?.symbol || coinId,
    image: {
      thumb: '',
      small: ''
    },
    market_data: {
      current_price: {
        usd: coin?.current_price || 1000
      }
    }
  };
}

function buildMockTrendingCategories(limit = 8) {
  const categories = [
    { id: 'layer-1', name: 'Layer 1', market_cap: 820000000000, market_cap_change_24h: 2.4, volume_24h: 42000000000 },
    { id: 'defi', name: 'DeFi', market_cap: 210000000000, market_cap_change_24h: 1.8, volume_24h: 8400000000 },
    { id: 'gaming', name: 'Gaming', market_cap: 64000000000, market_cap_change_24h: 4.1, volume_24h: 2800000000 },
    { id: 'ai', name: 'AI', market_cap: 98000000000, market_cap_change_24h: 3.2, volume_24h: 3700000000 },
    { id: 'meme', name: 'Meme', market_cap: 51000000000, market_cap_change_24h: -0.9, volume_24h: 2100000000 },
    { id: 'payments', name: 'Payments', market_cap: 73000000000, market_cap_change_24h: 0.8, volume_24h: 2400000000 },
    { id: 'restaking', name: 'Restaking', market_cap: 28000000000, market_cap_change_24h: 5.6, volume_24h: 1100000000 },
    { id: 'real-world-assets', name: 'RWA', market_cap: 39000000000, market_cap_change_24h: 2.1, volume_24h: 1600000000 }
  ];

  return categories.slice(0, Math.max(1, Math.min(limit, categories.length)));
}

function buildMockGlobalData() {
  return {
    data: {
      active_cryptocurrencies: 12000,
      markets: 700,
      total_market_cap: { usd: 2200000000000 },
      total_volume: { usd: 75000000000 },
      market_cap_change_percentage_24h_usd: 1.8,
      market_cap_percentage: { btc: 54.2, eth: 17.8 }
    }
  };
}

function cacheGet(key) {
  return cache.get(key);
}

function cacheSet(key, value, ttl = 30) {
  cache.set(key, value, ttl);
}

function normalizeCoinId(value) {
  const coinId = sanitizeText(value, { maxLength: 80 }).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(coinId)) {
    throw new Error('Invalid coin id');
  }

  return coinId;
}

function normalizeVsCurrency(value) {
  const vs = sanitizeText(value, { maxLength: 10 }).toLowerCase();
  return /^[a-z0-9]+$/.test(vs) ? vs : 'usd';
}

function normalizeQuery(value) {
  return sanitizeText(value, { maxLength: 120 });
}

function readCache(key) {
  const cached = cacheGet(key);
  if (!cached) return null;

  if (cached.expiresAt && cached.expiresAt <= Date.now()) {
    cache.del(key);
    return null;
  }

  return cached;
}

function writeCache(key, value, ttlSeconds = 30, staleSeconds = ttlSeconds * 4) {
  cacheSet(key, {
    value,
    staleAt: Date.now() + ttlSeconds * 1000,
    expiresAt: Date.now() + staleSeconds * 1000
  }, staleSeconds);
}

async function cachedFetch(key, fetcher, { ttlSeconds = 30, staleSeconds = ttlSeconds * 4 } = {}) {
  const cached = readCache(key);
  if (cached && cached.staleAt > Date.now()) {
    return cached.value;
  }

  if (cached && cached.staleAt <= Date.now() && cached.expiresAt > Date.now()) {
    if (!inFlight.has(key)) {
      const refresh = Promise.resolve()
        .then(fetcher)
        .then((value) => {
          writeCache(key, value, ttlSeconds, staleSeconds);
          return value;
        })
        .catch(() => cached.value)
        .finally(() => {
          inFlight.delete(key);
        });

      inFlight.set(key, refresh);
    }

    return cached.value;
  }

  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = Promise.resolve()
    .then(fetcher)
    .then((value) => {
      writeCache(key, value, ttlSeconds, staleSeconds);
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

async function safeFetch(endpoint, fetcher, fallback, options = {}) {
  try {
    return await cachedFetch(endpoint, fetcher, options);
  } catch (error) {
    logCoinGeckoFailure(endpoint, error, true);
    return fallback;
  }
}

function isMockMode() {
  return process.env.COINGECKO_MOCK === 'true';
}

export async function getPrices(ids = [], vs = 'usd') {
  const normalizedIds = ids.map((id) => normalizeCoinId(id));
  const normalizedVs = normalizeVsCurrency(vs);
  const key = `prices:${normalizedIds.join(',')}:${normalizedVs}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  if (isMockMode()) {
    const mock = buildMockPriceMap(normalizedIds, normalizedVs);
    cacheSet(key, mock, 60);
    return mock;
  }

  try {
    const res = await API.get('/simple/price', { params: { ids: normalizedIds.join(','), vs_currencies: normalizedVs, include_24hr_change: true, include_market_cap: true, include_24hr_vol: true } });
    cacheSet(key, res.data, 60);
    return res.data;
  } catch (error) {
    logCoinGeckoFailure('simple/price', error, true);
    const fallback = buildMockPriceMap(normalizedIds, normalizedVs);
    cacheSet(key, fallback, 60);
    return fallback;
  }
}

export async function getTrending() {
  const key = 'trending';
  const cached = cacheGet(key);
  if (cached) return cached;

  if (isMockMode()) {
    const mock = { coins: buildMockMarketSnapshot(5).map((coin) => ({ item: coin })) };
    cacheSet(key, mock, 60);
    return mock;
  }

  const res = await API.get('/search/trending');
  cacheSet(key, res.data, 60);
  return res.data;
}

export async function getGlobalMarketData() {
  const key = 'global:market';
  return safeFetch(key, async () => {
    const res = await API.get('/global');
    return res.data;
  }, buildMockGlobalData(), { ttlSeconds: 60, staleSeconds: 300 });
}

export async function searchCoins(query) {
  const normalizedQuery = normalizeQuery(query);
  const key = `search:${normalizedQuery}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  if (isMockMode()) {
    const mock = { coins: buildMockMarketSnapshot(5).filter((coin) => coin.name.toLowerCase().includes(normalizedQuery.toLowerCase())) };
    cacheSet(key, mock, 60);
    return mock;
  }

  const res = await API.get('/search', { params: { query: normalizedQuery } });
  cacheSet(key, res.data, 60);
  return res.data;
}

export async function getCoinDetails(id) {
  const coinId = normalizeCoinId(id);
  const key = `coin:${coinId}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  if (isMockMode()) {
    const coin = buildMockMarketSnapshot(1).find((item) => item.id === coinId) || buildMockMarketSnapshot(1)[0];
    cacheSet(key, coin, 60);
    return coin;
  }

  try {
    const res = await API.get(`/coins/${coinId}`, { params: { localization: false, tickers: false, market_data: true, community_data: false, developer_data: false, sparkline: false } });
    cacheSet(key, res.data, 60);
    return res.data;
  } catch (error) {
    logCoinGeckoFailure(`coins/${coinId}`, error, true);
    const fallback = buildMockCoinDetails(coinId);
    cacheSet(key, fallback, 60);
    return fallback;
  }
}

export async function getCoinMarketChart(id, vs = 'usd', days = 7) {
  const coinId = normalizeCoinId(id);
  const normalizedVs = normalizeVsCurrency(vs);
  const normalizedDays = toPositiveInt(days, 7, { min: 1, max: 365 });
  const key = `chart:${coinId}:${normalizedVs}:${normalizedDays}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  if (isMockMode()) {
    const now = Date.now();
    const prices = Array.from({ length: normalizedDays * 4 }, (_value, index) => [now - (index * 3600 * 1000), 100 + index * 2]);
    const mock = { prices };
    cacheSet(key, mock, 60);
    return mock;
  }

  try {
    const res = await API.get(`/coins/${coinId}/market_chart`, { params: { vs_currency: normalizedVs, days: normalizedDays, interval: 'hourly' } });
    cacheSet(key, res.data, 60);
    return res.data;
  } catch (error) {
    logCoinGeckoFailure(`coins/${coinId}/market_chart`, error, true);
    const now = Date.now();
    const snapshot = buildMockMarketSnapshot(10);
    const fallbackCoin = snapshot.find((entry) => entry.id === coinId) || snapshot[0];
    const startPrice = fallbackCoin?.current_price || 100;
    const step = Math.max(1, Math.round(startPrice * 0.01));
    const prices = Array.from({ length: normalizedDays * 4 }, (_value, index) => [now - (index * 3600 * 1000), Math.max(1, startPrice + (index * step))]);
    const fallback = { prices };
    cacheSet(key, fallback, 60);
    return fallback;
  }
}

export async function getMarketSnapshot(limit = 50) {
  const normalizedLimit = toPositiveInt(limit, 50, { min: 1, max: 250 });
  const key = `market:snapshot:${normalizedLimit}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  if (isMockMode()) {
    const mock = buildMockMarketSnapshot(normalizedLimit);
    cacheSet(key, mock, 60);
    return mock;
  }

  const res = await API.get('/coins/markets', { params: { vs_currency: 'usd', order: 'market_cap_desc', per_page: normalizedLimit, page: 1, price_change_percentage: '24h' } });
  cacheSet(key, res.data, 60);
  return res.data;
}

export async function getTrendingCategories(limit = 8) {
  const normalizedLimit = toPositiveInt(limit, 8, { min: 1, max: 20 });
  const key = `categories:${normalizedLimit}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  if (isMockMode()) {
    const mock = buildMockTrendingCategories(normalizedLimit);
    cacheSet(key, mock, 60);
    return mock;
  }

  const res = await API.get('/coins/categories', { params: { order: 'market_cap_desc', per_page: normalizedLimit, page: 1, sparkline: false } });
  cacheSet(key, res.data, 60);
  return res.data;
}

export async function getTopMovers(limit = 10) {
  const normalizedLimit = toPositiveInt(limit, 10, { min: 1, max: 25 });
  const data = await getMarketSnapshot(Math.max(normalizedLimit, 10));
  const sorted = data.slice().sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0));
  return {
    topGainers: sorted.slice(0, normalizedLimit),
    topLosers: sorted.slice(-normalizedLimit).reverse()
  };
}