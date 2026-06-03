import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Chart from 'chart.js/auto';
import Skeleton from '../components/common/Skeleton';
import TradeModal from '../components/portfolio/TradeModal';
import MarketAlertModal from '../components/market/MarketAlertModal';
import { buyPortfolioAsset, sellPortfolioAsset } from '../services/portfolioApi';
import { addWatchlistCoin, fetchCoinChart, fetchCoinDetails, removeWatchlistCoin } from '../services/marketApi';
import { createNotificationAlert } from '../services/notificationsApi';

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

export default function CoinDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [coin, setCoin] = useState(null);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [error, setError] = useState(null);
  const [watchlisted, setWatchlisted] = useState(false);
  const [tradeModal, setTradeModal] = useState({ open: false, mode: 'buy' });
  const [alertModalOpen, setAlertModalOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCoin() {
      setLoading(true);
      setError(null);
      try {
        const [coinData, chartData] = await Promise.all([
          fetchCoinDetails(id),
          fetchCoinChart(id, 7)
        ]);
        if (!active) return;
        setCoin(coinData);
        setSeries(Array.isArray(chartData?.prices) ? chartData.prices : []);
      } catch (fetchError) {
        if (!active) return;
        setError(fetchError?.response?.data?.message || fetchError?.message || 'Unable to load coin details');
      } finally {
        if (active) {
          setLoading(false);
          setChartLoading(false);
        }
      }
    }

    void loadCoin();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!series.length) return undefined;

    const canvas = document.getElementById('coin-detail-chart');
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(34, 211, 238, 0.35)');
    gradient.addColorStop(1, 'rgba(34, 211, 238, 0)');

    const chart = new Chart(context, {
      type: 'line',
      data: {
        labels: series.map(([timestamp]) => new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
        datasets: [{ data: series.map(([, price]) => price), borderColor: '#22c55e', backgroundColor: gradient, fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { color: '#94a3b8', maxTicksLimit: 6 }, grid: { display: false } }, y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.12)' } } }
      }
    });

    return () => chart.destroy();
  }, [series]);

  const currentPrice = coin?.market_data?.current_price?.usd || 0;
  const marketCap = coin?.market_data?.market_cap?.usd;
  const volume = coin?.market_data?.total_volume?.usd;
  const high24 = coin?.market_data?.high_24h?.usd;
  const low24 = coin?.market_data?.low_24h?.usd;

  const handleWatchlist = async () => {
    try {
      if (watchlisted) {
        await removeWatchlistCoin(id);
        setWatchlisted(false);
        toast.success('Removed from watchlist');
      } else {
        await addWatchlistCoin({ coinId: id, coinName: coin?.name, symbol: coin?.symbol, image: coin?.image?.small || coin?.image?.thumb || '' });
        setWatchlisted(true);
        toast.success('Added to watchlist');
      }
    } catch (watchlistError) {
      toast.error(watchlistError?.response?.data?.message || watchlistError?.message || 'Unable to update watchlist');
    }
  };

  const handleTradeSubmit = async () => {
    try {
      if (tradeModal.mode === 'buy') {
        await buyPortfolioAsset({ coinId: id, quantity: 1, coinName: coin?.name, symbol: coin?.symbol });
      } else {
        await sellPortfolioAsset({ coinId: id, quantity: 1, coinName: coin?.name, symbol: coin?.symbol });
      }
      toast.success(`${tradeModal.mode === 'buy' ? 'Buy' : 'Sell'} executed`);
      setTradeModal({ open: false, mode: 'buy' });
    } catch (tradeError) {
      toast.error(tradeError?.response?.data?.message || tradeError?.message || 'Unable to complete trade');
    }
  };

  const marketSummary = useMemo(() => coin?.description?.en?.replace(/<[^>]+>/g, '').slice(0, 220) || 'No description available for this asset.', [coin]);

  return (
    <div className="space-y-6">
      <div className="glass-panel-strong rounded-[2.5rem] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <button type="button" onClick={() => navigate(-1)} className="text-xs uppercase tracking-[0.35em] text-slate-500 hover:text-slate-300">Back</button>
            <p className="mt-3 text-xs uppercase tracking-[0.35em] text-cyan-300">Coin detail</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">{loading ? 'Loading coin...' : coin?.name || id}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">{marketSummary}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <motion.button type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={handleWatchlist} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
              {watchlisted ? 'Remove watchlist' : 'Add to watchlist'}
            </motion.button>
            <motion.button type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => setAlertModalOpen(true)} className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-5 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20">
              Create alert
            </motion.button>
            <motion.button type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => setTradeModal({ open: true, mode: 'buy' })} className="rounded-2xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-5 py-3 text-sm font-semibold text-slate-950">
              Quick trade
            </motion.button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">{coin?.symbol?.toUpperCase() || 'COIN'}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">{currentPrice ? formatCurrency(currentPrice) : 'Live price'}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">24h {formatPercent(coin?.market_data?.price_change_percentage_24h || 0)}</span>
        </div>
      </div>

      {error ? <div className="rounded-[1.5rem] border border-rose-400/20 bg-rose-500/10 p-5 text-sm text-rose-200">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4"><div className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Market cap</div><div className="mt-2 text-2xl font-black text-white">{formatCurrency(marketCap)}</div></div>
        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4"><div className="text-[10px] uppercase tracking-[0.35em] text-slate-500">24h volume</div><div className="mt-2 text-2xl font-black text-white">{formatCurrency(volume)}</div></div>
        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4"><div className="text-[10px] uppercase tracking-[0.35em] text-slate-500">24h high</div><div className="mt-2 text-2xl font-black text-white">{formatCurrency(high24)}</div></div>
        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4"><div className="text-[10px] uppercase tracking-[0.35em] text-slate-500">24h low</div><div className="mt-2 text-2xl font-black text-white">{formatCurrency(low24)}</div></div>
      </div>

      <div className="glass-panel rounded-[2.5rem] p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Price chart</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">7 day market movement</h2>
          </div>
          <Link to="/watchlist" className="text-sm text-amber-200 hover:underline">Open watchlist</Link>
        </div>

        <div className="mt-6 h-96 rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4">
          {chartLoading && !series.length ? <Skeleton className="h-full rounded-[1.2rem]" /> : <canvas id="coin-detail-chart" />}
        </div>
      </div>

      <TradeModal open={tradeModal.open} mode={tradeModal.mode} coin={{ id, name: coin?.name, symbol: coin?.symbol, currentPrice }} loading={false} onClose={() => setTradeModal({ open: false, mode: 'buy' })} onSubmit={handleTradeSubmit} />

      <MarketAlertModal
        open={alertModalOpen}
        coin={{ id, name: coin?.name, symbol: coin?.symbol }}
        loading={false}
        onClose={() => setAlertModalOpen(false)}
        onSubmit={async (payload) => {
          await createNotificationAlert({
            ...payload,
            coinId: id,
            coinName: coin?.name,
            symbol: coin?.symbol
          });
          toast.success(`${payload.type} alert configured`);
          setAlertModalOpen(false);
        }}
      />
    </div>
  );
}