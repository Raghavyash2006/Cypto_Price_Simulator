import {
  getCoinDetails,
  getCoinMarketChart,
  getGlobalMarketData,
  getMarketSnapshot,
  getPrices,
  getTopMovers,
  getTrending,
  searchCoins
} from '../../services/coingeckoService.js';

function normalizeTrendingCoin(entry) {
  return entry?.item || entry || null;
}

export async function getMarketOverview({ limit = 50, trendingLimit = 7, moversLimit = 5 } = {}) {
  const [globalData, snapshot, trendingData, movers] = await Promise.allSettled([
    getGlobalMarketData(),
    getMarketSnapshot(limit),
    getTrending(),
    getTopMovers(moversLimit)
  ]);

  const global = globalData.status === 'fulfilled' ? globalData.value?.data || globalData.value || null : null;
  const coins = snapshot.status === 'fulfilled' ? snapshot.value || [] : [];
  const trending = trendingData.status === 'fulfilled' ? trendingData.value?.coins || trendingData.value || [] : [];
  const moversData = movers.status === 'fulfilled' ? movers.value || { topGainers: [], topLosers: [] } : { topGainers: [], topLosers: [] };

  return {
    global,
    coins: Array.isArray(coins) ? coins : [],
    trending: (Array.isArray(trending) ? trending : []).map(normalizeTrendingCoin).filter(Boolean).slice(0, trendingLimit),
    movers: moversData
  };
}

export {
  getPrices,
  getTrending,
  searchCoins,
  getCoinDetails,
  getCoinMarketChart,
  getTopMovers,
  getMarketSnapshot,
  getGlobalMarketData
};