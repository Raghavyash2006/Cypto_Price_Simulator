import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buyPortfolioAsset,
  fetchPortfolioSnapshot,
  fetchPortfolioTransactions,
  sellPortfolioAsset
} from '../../services/portfolioApi';

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

export function usePortfolioModule() {
  const [snapshot, setSnapshot] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [portfolioData, transactionData] = await Promise.all([
        fetchPortfolioSnapshot(),
        fetchPortfolioTransactions(100)
      ]);

      setSnapshot(portfolioData);
      setTransactions(transactionData.transactions || []);
    } catch (fetchError) {
      setSnapshot(null);
      setTransactions([]);
      setError(getErrorMessage(fetchError, 'Unable to load portfolio'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const executeTrade = useCallback(async (mode, payload) => {
    setActionLoading(true);
    setActionError(null);

    try {
      const normalizedPayload = {
        ...payload,
        coinId: String(payload.coinId || '').trim().toLowerCase(),
        quantity: Number(payload.quantity)
      };

      const response = mode === 'buy'
        ? await buyPortfolioAsset(normalizedPayload)
        : await sellPortfolioAsset(normalizedPayload);

      await refresh();
      return response;
    } catch (tradeError) {
      const message = getErrorMessage(tradeError, `Unable to ${mode}`);
      setActionError(message);
      throw new Error(message);
    } finally {
      setActionLoading(false);
    }
  }, [refresh]);

  const holdingsByCoinId = useMemo(() => {
    const map = new Map();
    (snapshot?.holdings || []).forEach((holding) => {
      const key = String(holding.coinId || holding.symbol || '').toLowerCase();
      map.set(key, holding);
    });
    return map;
  }, [snapshot?.holdings]);

  return {
    snapshot,
    holdings: snapshot?.holdings || [],
    summary: snapshot?.summary || null,
    transactions,
    loading,
    error,
    actionLoading,
    actionError,
    holdingsByCoinId,
    refresh,
    buyAsset: (payload) => executeTrade('buy', payload),
    sellAsset: (payload) => executeTrade('sell', payload)
  };
}