import { useCallback, useEffect, useRef, useState } from 'react';
import { addWatchlistCoin, clearWatchlist, fetchWatchlist, removeWatchlistCoin } from '../../services/marketApi';
import { getSocket } from '../../services/socket';

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function applyLivePrices(watchlist, payload) {
  if (!watchlist || !Array.isArray(watchlist.items) || !Array.isArray(payload?.coins)) {
    return watchlist;
  }

  const coinMap = new Map(payload.coins.map((coin) => [coin.id, coin]));
  const items = watchlist.items.map((item) => {
    const liveCoin = coinMap.get(item.coinId);
    if (!liveCoin) return item;

    const currentPrice = Number(liveCoin.current_price || item.currentPrice || item.lastKnownPrice || 0);
    const performancePct = Number(item.addedPrice || 0) ? ((currentPrice - Number(item.addedPrice || 0)) / Number(item.addedPrice || 1)) * 100 : item.performancePct || 0;

    return {
      ...item,
      currentPrice,
      priceChange24h: liveCoin.price_change_percentage_24h ?? item.priceChange24h ?? 0,
      marketCap: liveCoin.market_cap ?? item.marketCap ?? 0,
      volume24h: liveCoin.total_volume ?? item.volume24h ?? 0,
      performancePct
    };
  });

  const totalValue = items.reduce((sum, item) => sum + Number(item.currentPrice || 0), 0);
  const totalBasis = items.reduce((sum, item) => sum + Number(item.addedPrice || 0), 0);

  return {
    ...watchlist,
    items,
    summary: {
      ...(watchlist.summary || {}),
      itemsCount: items.length,
      totalValue,
      totalBasis,
      performancePct: totalBasis ? ((totalValue - totalBasis) / totalBasis) * 100 : 0,
      gainers: items.filter((item) => Number(item.performancePct || 0) >= 0).length,
      losers: items.filter((item) => Number(item.performancePct || 0) < 0).length
    }
  };
}

export function useWatchlistModule() {
  const [watchlist, setWatchlist] = useState({ items: [], summary: { itemsCount: 0, totalValue: 0, totalBasis: 0, performancePct: 0, gainers: 0, losers: 0 } });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const lastSocketRefreshRef = useRef(0);

  const loadWatchlist = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const data = await fetchWatchlist();
      setWatchlist(data?.watchlist || { items: [], summary: { itemsCount: 0, totalValue: 0, totalBasis: 0, performancePct: 0, gainers: 0, losers: 0 } });
      setLastUpdated(new Date());
      setStatus('succeeded');
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, 'Unable to load watchlist'));
      setWatchlist({ items: [], summary: { itemsCount: 0, totalValue: 0, totalBasis: 0, performancePct: 0, gainers: 0, losers: 0 } });
      setStatus('failed');
    }
  }, []);

  useEffect(() => {
    void loadWatchlist();
  }, [loadWatchlist]);

  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    const handleMarketTick = (payload) => {
      const now = Date.now();
      if (now - lastSocketRefreshRef.current < 30000) return;
      lastSocketRefreshRef.current = now;
      setWatchlist((current) => applyLivePrices(current, payload));
      setLastUpdated(new Date());
    };

    socket.on('market:tick', handleMarketTick);

    return () => {
      socket.off('market:tick', handleMarketTick);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      void loadWatchlist();
    }, 300000);

    return () => clearInterval(interval);
  }, [loadWatchlist]);

  const addCoin = useCallback(async (coin) => {
    const payload = {
      coinId: String(coin?.id || '').toLowerCase(),
      coinName: coin?.name || coin?.coinName || '',
      symbol: coin?.symbol || '',
      image: coin?.image || ''
    };

    const data = await addWatchlistCoin(payload);
    setWatchlist(data?.watchlist || { items: [], summary: { itemsCount: 0, totalValue: 0, totalBasis: 0, performancePct: 0, gainers: 0, losers: 0 } });
    setLastUpdated(new Date());
    return data;
  }, []);

  const removeCoin = useCallback(async (coinId) => {
    const data = await removeWatchlistCoin(coinId);
    setWatchlist(data?.watchlist || { items: [], summary: { itemsCount: 0, totalValue: 0, totalBasis: 0, performancePct: 0, gainers: 0, losers: 0 } });
    setLastUpdated(new Date());
    return data;
  }, []);

  const clearAll = useCallback(async () => {
    const data = await clearWatchlist();
    setWatchlist(data?.watchlist || { items: [], summary: { itemsCount: 0, totalValue: 0, totalBasis: 0, performancePct: 0, gainers: 0, losers: 0 } });
    setLastUpdated(new Date());
    return data;
  }, []);

  return {
    watchlist,
    items: watchlist.items || [],
    summary: watchlist.summary || {},
    status,
    error,
    lastUpdated,
    reload: loadWatchlist,
    addCoin,
    removeCoin,
    clearAll
  };
}