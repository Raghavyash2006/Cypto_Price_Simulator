import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Skeleton from '../components/common/Skeleton';
import TradeModal from '../components/portfolio/TradeModal';
import WatchlistItemCard from '../components/market/WatchlistItemCard';
import MarketSentimentPanel from '../components/market/MarketSentimentPanel';
import { useWatchlistModule } from '../features/market/useWatchlistModule';
import { useMarketModule } from '../features/market/useMarketModule';
import { buyPortfolioAsset, sellPortfolioAsset } from '../services/portfolioApi';

export default function WatchlistPage() {
  const navigate = useNavigate();
  const { items, summary, status, error, lastUpdated, reload, removeCoin, clearAll } = useWatchlistModule();
  const { sentiment, events } = useMarketModule();
  const [tradeModal, setTradeModal] = useState({ open: false, mode: 'buy', coin: null });
  const [tradeLoading, setTradeLoading] = useState(false);

  const orderedItems = useMemo(() => [...items].sort((left, right) => Number(right.performancePct || 0) - Number(left.performancePct || 0)), [items]);

  const openTradeModal = (mode, coin) => setTradeModal({ open: true, mode, coin });

  const handleTradeSubmit = async (payload) => {
    setTradeLoading(true);
    try {
      const normalizedPayload = {
        ...payload,
        coinId: String(payload.coinId || '').toLowerCase()
      };

      if (tradeModal.mode === 'buy') {
        await buyPortfolioAsset(normalizedPayload);
        toast.success('Buy order executed');
      } else {
        await sellPortfolioAsset(normalizedPayload);
        toast.success('Sell order executed');
      }

      setTradeModal({ open: false, mode: 'buy', coin: null });
    } catch (tradeError) {
      toast.error(tradeError?.response?.data?.message || tradeError?.message || 'Unable to complete trade');
    } finally {
      setTradeLoading(false);
    }
  };

  const handleRemove = async (coinId) => {
    try {
      await removeCoin(coinId);
      toast.success('Removed from watchlist');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Unable to remove coin');
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel-strong rounded-[2.5rem] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Watchlist</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">Track the coins you care about with live prices and quick trade actions.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">Watchlist items update live, keep a rolling performance view, and let you jump straight into buy/sell or alert setup from one place.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <motion.button type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => void reload()} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
              Refresh watchlist
            </motion.button>
            <motion.button type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => navigate('/market')} className="rounded-2xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_-22px_rgba(34,211,238,0.7)]">
              Back to market
            </motion.button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Live watchlist'}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">{summary.itemsCount || 0} tracked coins</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">{summary.performancePct >= 0 ? 'Positive momentum' : 'Downside pressure'}</span>
          {error ? <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-rose-200">{error}</span> : null}
        </div>
      </div>

      <MarketSentimentPanel sentiment={sentiment} riskWarnings={sentiment?.riskWarnings || []} events={events || []} />

      <div className="glass-panel rounded-[2.5rem] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-300">Tracked coins</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Live watchlist performance</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void clearAll()} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10">
              Clear watchlist
            </button>
          </div>
        </div>

        {status === 'loading' && !items.length ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-40 rounded-[1.7rem]" />)}
          </div>
        ) : orderedItems.length ? (
          <div className="mt-6 space-y-3">
            {orderedItems.map((item) => (
              <WatchlistItemCard
                key={item.coinId}
                item={item}
                onOpenDetail={() => navigate(`/market/coin/${item.coinId}`)}
                onBuy={() => openTradeModal('buy', item)}
                onSell={() => openTradeModal('sell', item)}
                onAddAlert={() => navigate('/market/alerts')}
                onRemove={() => void handleRemove(item.coinId)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center">
            <div className="mx-auto max-w-xl">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Empty watchlist</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">Add coins you want to monitor</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">Build a personalized watchlist, compare live performance, and jump into trading when a setup looks ready.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link to="/market" className="rounded-2xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-5 py-3 text-sm font-semibold text-slate-950">Browse market</Link>
                <Link to="/market/alerts" className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">Create alert</Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <TradeModal
        open={tradeModal.open}
        mode={tradeModal.mode}
        coin={tradeModal.coin}
        loading={tradeLoading}
        onClose={() => setTradeModal({ open: false, mode: 'buy', coin: null })}
        onSubmit={handleTradeSubmit}
      />
    </div>
  );
}