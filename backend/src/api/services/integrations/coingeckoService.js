import axios from 'axios';
import NodeCache from 'node-cache';
import { sanitizeText, toPositiveInt } from '../../../utils/inputSanitizer.js';

const cache = new NodeCache({ stdTTL: 60, useClones: false });
const API = axios.create({
  baseURL: 'https://api.coingecko.com/api/v3',
  timeout: 10000
});

function buildMockMarketSnapshot() {
  return [
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc', current_price: 65000, market_cap: 1200000000000, price_change_percentage_24h: 1.8 },
    { id: 'ethereum', name: 'Ethereum', symbol: 'eth', current_price: 3500, market_cap: 420000000000, price_change_percentage_24h: 2.4 },
    { id: 'solana', name: 'Solana', symbol: 'sol', current_price: 145, market_cap: 65000000000, price_change_percentage_24h: 4.1 }
  ];
}

function cacheGet(key) {
  return cache.get(key);
}

function cacheSet(key, value, ttlSeconds = 30) {
  cache.set(key, value, ttlSeconds);
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
    const mock = Object.fromEntries(normalizedIds.map((id, index) => [id, { [normalizedVs]: 1000 + index * 50 } ]));
    cacheSet(key, mock, 60);
    return mock;
  }

  const res = await API.get('/simple/price', {
    params: {
      ids: normalizedIds.join(','),
      vs_currencies: normalizedVs,
      include_24hr_change: true,
      include_market_cap: true,
      include_24hr_vol: true
    }
  });

  cacheSet(key, res.data, 60);
  return res.data;
}

export async function getTrending() {
  const key = 'trending';
  const cached = cacheGet(key);
  if (cached) return cached;

  if (isMockMode()) {
    const mock = { coins: buildMockMarketSnapshot().map((coin) => ({ item: coin })) };
    cacheSet(key, mock, 60);
    return mock;
  }

  const res = await API.get('/search/trending');
  cacheSet(key, res.data, 60);
  return res.data;
}

export async function searchCoins(query) {
  const normalizedQuery = sanitizeText(query, { maxLength: 120 });
  const key = `search:${normalizedQuery}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  if (isMockMode()) {
    const mock = { coins: buildMockMarketSnapshot().filter((coin) => coin.name.toLowerCase().includes(normalizedQuery.toLowerCase())) };
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
    const coin = buildMockMarketSnapshot().find((item) => item.id === coinId) || buildMockMarketSnapshot()[0];
    cacheSet(key, coin, 60);
    return coin;
  }

  const res = await API.get(`/coins/${coinId}`, {
    params: {
      localization: false,
      tickers: false,
      market_data: true,
      community_data: false,
      developer_data: false,
      sparkline: false
    }
  });

  cacheSet(key, res.data, 60);
  return res.data;
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

  const res = await API.get(`/coins/${coinId}/market_chart`, { params: { vs_currency: normalizedVs, days: normalizedDays, interval: 'hourly' } });
  cacheSet(key, res.data, 60);
  return res.data;
}

export async function getMarketSnapshot() {
  const key = 'market:snapshot';
  const cached = cacheGet(key);
  if (cached) return cached;

  if (isMockMode()) {
    const mock = buildMockMarketSnapshot();
    cacheSet(key, mock, 60);
    return mock;
  }

  const res = await API.get('/coins/markets', {
    params: {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: 50,
      page: 1,
      price_change_percentage: '24h'
    }
  });

  cacheSet(key, res.data, 60);
  return res.data;
}

export async function getTopMovers(limit = 10) {
  const data = await getMarketSnapshot();
  const sorted = data.slice().sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0));
  return {
    topGainers: sorted.slice(0, limit),
    topLosers: sorted.slice(-limit).reverse()
  };
}
