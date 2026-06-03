import Watchlist from '../../models/Watchlist.js';
import { getCoinDetails, getCoinMarketChart, getPrices } from '../../services/coingeckoService.js';
import { getLatestMarketSnapshot } from './marketIntelligenceService.js';
import { recordMarketEvent } from './marketEventService.js';

function normalizeCoinId(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeSymbol(value) {
  return String(value || '').trim().toUpperCase();
}

function toPlainItem(item) {
  return {
    id: item._id,
    coinId: item.coinId,
    coinName: item.coinName,
    symbol: item.symbol,
    image: item.image,
    addedPrice: item.addedPrice,
    lastKnownPrice: item.lastKnownPrice,
    addedAt: item.addedAt,
    note: item.note
  };
}

async function enrichItem(item, marketLookup, priceLookup) {
  const market = marketLookup.get(item.coinId) || {};
  const currentPrice = priceLookup[item.coinId]?.usd ?? market.current_price ?? item.lastKnownPrice ?? item.addedPrice ?? 0;
  const priceChange24h = priceLookup[item.coinId]?.usd_24h_change ?? market.price_change_percentage_24h ?? 0;
  const marketCap = market.market_cap ?? 0;
  const sparkline = await getCoinMarketChart(item.coinId, 'usd', 7)
    .then((chart) => (Array.isArray(chart?.prices) ? chart.prices.slice(-48) : []))
    .catch(() => []);

  const performancePct = item.addedPrice ? ((currentPrice - item.addedPrice) / item.addedPrice) * 100 : 0;

  return {
    ...toPlainItem(item),
    currentPrice,
    priceChange24h,
    marketCap,
    performancePct,
    sparkline,
    marketRank: market.market_cap_rank || null,
    volume24h: market.total_volume ?? 0,
    updatedAt: new Date()
  };
}

function summarizeWatchlist(items = []) {
  const totalValue = items.reduce((sum, item) => sum + Number(item.currentPrice || 0), 0);
  const totalBasis = items.reduce((sum, item) => sum + Number(item.addedPrice || 0), 0);
  const performancePct = totalBasis ? ((totalValue - totalBasis) / totalBasis) * 100 : 0;
  const gainers = items.filter((item) => Number(item.performancePct || 0) >= 0).length;
  const losers = items.length - gainers;

  return {
    itemsCount: items.length,
    totalValue,
    totalBasis,
    performancePct,
    gainers,
    losers
  };
}

async function getOrCreateWatchlist(userId) {
  const doc = await Watchlist.findOne({ user: userId }).exec();
  if (doc) return doc;
  return Watchlist.create({ user: userId, items: [] });
}

export async function getWatchlist(userId) {
  const doc = await Watchlist.findOne({ user: userId }).lean().exec();
  const items = Array.isArray(doc?.items) ? doc.items : [];
  const coinIds = [...new Set(items.map((item) => item.coinId).filter(Boolean))];
  const [prices, marketSnapshot] = await Promise.all([
    coinIds.length ? getPrices(coinIds, 'usd') : Promise.resolve({}),
    getLatestMarketSnapshot().then((snapshot) => snapshot?.coins || []).catch(() => [])
  ]);

  const marketLookup = new Map((marketSnapshot || []).map((coin) => [coin.id, coin]));
  const finalItems = await Promise.all(items.map((item) => enrichItem(item, marketLookup, prices)));

  return {
    watchlist: {
      id: doc?._id || null,
      updatedAt: doc?.updatedAt || null,
      items: finalItems,
      summary: summarizeWatchlist(finalItems)
    }
  };
}

export async function addToWatchlist(userId, payload = {}) {
  const coinId = normalizeCoinId(payload.coinId);
  if (!coinId) {
    throw new Error('coinId is required');
  }

  const details = await getCoinDetails(coinId).catch(() => null);
  const priceMap = await getPrices([coinId], 'usd');
  const currentPrice = priceMap[coinId]?.usd || details?.market_data?.current_price?.usd || 0;
  const item = {
    coinId,
    coinName: payload.coinName || details?.name || coinId,
    symbol: normalizeSymbol(payload.symbol || details?.symbol || coinId),
    image: payload.image || details?.image?.small || details?.image?.thumb || '',
    addedPrice: Number(currentPrice) || 0,
    lastKnownPrice: Number(currentPrice) || 0,
    note: String(payload.note || '').trim().slice(0, 240),
    addedAt: new Date()
  };

  const watchlist = await getOrCreateWatchlist(userId);
  const existingIndex = watchlist.items.findIndex((entry) => String(entry.coinId) === coinId);
  if (existingIndex >= 0) {
    const existingItem = watchlist.items[existingIndex];
    watchlist.items[existingIndex] = {
      ...existingItem.toObject?.() || existingItem,
      ...item,
      addedAt: existingItem.addedAt || item.addedAt
    };
  } else {
    watchlist.items.push(item);
  }

  await watchlist.save();
  await recordMarketEvent({
    user: userId,
    type: 'watchlist',
    title: 'Coin added to watchlist',
    message: `${item.coinName} is now on your watchlist.`,
    severity: 'normal',
    source: 'watchlist',
    metadata: { action: 'add', coinId, coinName: item.coinName, symbol: item.symbol }
  }).catch(() => null);

  return getWatchlist(userId);
}

export async function removeFromWatchlist(userId, coinId) {
  const normalizedCoinId = normalizeCoinId(coinId);
  const watchlist = await getOrCreateWatchlist(userId);
  watchlist.items = (watchlist.items || []).filter((item) => String(item.coinId) !== normalizedCoinId);
  await watchlist.save();

  await recordMarketEvent({
    user: userId,
    type: 'watchlist',
    title: 'Coin removed from watchlist',
    message: `Removed ${normalizedCoinId} from your watchlist.`,
    severity: 'low',
    source: 'watchlist',
    metadata: { action: 'remove', coinId: normalizedCoinId }
  }).catch(() => null);

  return getWatchlist(userId);
}

export async function clearWatchlist(userId) {
  const watchlist = await getOrCreateWatchlist(userId);
  watchlist.items = [];
  await watchlist.save();
  return getWatchlist(userId);
}

export async function getWatchlistSummary(userId) {
  const data = await getWatchlist(userId);
  return data.watchlist?.summary || summarizeWatchlist([]);
}