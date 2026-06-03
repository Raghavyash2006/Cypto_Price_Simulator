import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchCoinChart, fetchMarketEvents, fetchMarketOverview, fetchMarketSentiment } from '../../services/marketApi';
import { getSocket } from '../../services/socket';

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

export function useMarketModule() {
  const [overview, setOverview] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedCoinId, setSelectedCoinId] = useState('bitcoin');
  const [chartSeries, setChartSeries] = useState([]);
  const [chartStatus, setChartStatus] = useState('idle');
  const [chartError, setChartError] = useState(null);
  const [flashById, setFlashById] = useState({});
  const flashTimerRef = useRef(null);
  const lastSocketRefreshRef = useRef(0);

  const mergeMarketPayload = useCallback((nextPayload) => {
    if (!nextPayload) return;

    setOverview((current) => {
      const currentCoins = new Map((current?.coins || []).map((coin) => [coin.id, coin]));
      const nextCoins = Array.isArray(nextPayload.coins) ? nextPayload.coins : current?.coins || [];
      const nextFlash = {};

      nextCoins.forEach((coin) => {
        const previous = currentCoins.get(coin.id);
        if (!previous) return;

        const previousPrice = Number(previous.current_price || 0);
        const nextPrice = Number(coin.current_price || 0);
        if (nextPrice > previousPrice) nextFlash[coin.id] = 'up';
        if (nextPrice < previousPrice) nextFlash[coin.id] = 'down';
      });

      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current);
      }

      if (Object.keys(nextFlash).length) {
        setFlashById(nextFlash);
        flashTimerRef.current = setTimeout(() => setFlashById({}), 1200);
      }

      const merged = {
        ...current,
        global: nextPayload.global || current?.global || null,
        coins: nextCoins,
        trending: nextPayload.trending || current?.trending || [],
        movers: nextPayload.movers || current?.movers || { topGainers: [], topLosers: [] }
      };

      const currentSelected = merged.coins.find((coin) => coin.id === selectedCoinId) || merged.coins[0] || null;
      if (currentSelected && currentSelected.id !== selectedCoinId) {
        setSelectedCoinId(currentSelected.id);
      }

      return merged;
    });

    setLastUpdated(new Date());
  }, [selectedCoinId]);

  const loadOverview = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const [data, sentimentData, eventsData] = await Promise.all([
        fetchMarketOverview({ limit: 60, trendingLimit: 7, moversLimit: 6 }),
        fetchMarketSentiment().catch(() => null),
        fetchMarketEvents(12).catch(() => ({ events: [] }))
      ]);

      setOverview(data);
      setSentiment(sentimentData || null);
      setEvents(Array.isArray(eventsData?.events) ? eventsData.events : []);
      setLastUpdated(new Date());
      setStatus('succeeded');

      const firstCoinId = data?.coins?.[0]?.id || 'bitcoin';
      setSelectedCoinId((current) => {
        if (current && data?.coins?.some((coin) => coin.id === current)) {
          return current;
        }
        return firstCoinId;
      });
    } catch (fetchError) {
      setOverview(null);
      setStatus('failed');
      setError(getErrorMessage(fetchError, 'Unable to load market data'));
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    const handleMarketTick = (payload) => {
      const now = Date.now();
      if (now - lastSocketRefreshRef.current < 30000) {
        return;
      }
      lastSocketRefreshRef.current = now;
      mergeMarketPayload(payload);
    };

    socket.on('market:tick', handleMarketTick);

    return () => {
      socket.off('market:tick', handleMarketTick);
    };
  }, [mergeMarketPayload]);

  useEffect(() => {
    const interval = setInterval(() => {
      void loadOverview();
    }, 300000);

    return () => clearInterval(interval);
  }, [loadOverview]);

  useEffect(() => {
    let active = true;

    async function loadChart() {
      if (!selectedCoinId) {
        setChartSeries([]);
        return;
      }

      setChartStatus('loading');
      setChartError(null);

      try {
        const data = await fetchCoinChart(selectedCoinId, 7);
        if (!active) return;
        setChartSeries(Array.isArray(data?.prices) ? data.prices : []);
        setChartStatus('succeeded');
      } catch (fetchError) {
        if (!active) return;
        setChartSeries([]);
        setChartStatus('failed');
        setChartError(getErrorMessage(fetchError, 'Unable to load chart data'));
      }
    }

    void loadChart();

    return () => {
      active = false;
    };
  }, [selectedCoinId]);

  const coins = overview?.coins || [];
  const trending = overview?.trending || [];
  const movers = overview?.movers || { topGainers: [], topLosers: [] };
  const selectedCoin = useMemo(() => coins.find((coin) => coin.id === selectedCoinId) || coins[0] || null, [coins, selectedCoinId]);
  const marketAgeSeconds = lastUpdated ? Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 1000)) : null;

  return {
    overview,
    coins,
    trending,
    movers,
    selectedCoin,
    selectedCoinId,
    setSelectedCoinId,
    chartSeries,
    chartStatus,
    chartError,
    status,
    error,
    lastUpdated,
    marketAgeSeconds,
    sentiment,
    events,
    flashById,
    reload: loadOverview
  };
}