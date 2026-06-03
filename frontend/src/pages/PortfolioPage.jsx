import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import PortfolioAnalyticsPanel from '../components/charts/PortfolioAnalyticsPanel';
import Skeleton from '../components/common/Skeleton';
import PortfolioSummaryGrid from '../components/portfolio/PortfolioSummaryGrid';
import HoldingsTable from '../components/portfolio/HoldingsTable';
import TransactionHistory from '../components/portfolio/TransactionHistory';
import TradeModal from '../components/portfolio/TradeModal';
import { usePortfolioModule } from '../features/portfolio/usePortfolioModule';

export default function PortfolioPage() {
  const user = useSelector((state) => state.auth.user);
  const { snapshot, holdings, summary, transactions, loading, error, actionLoading, actionError, refresh, buyAsset, sellAsset } = usePortfolioModule();
  const [modal, setModal] = useState({ open: false, mode: 'buy', coin: null });

  const bestPerformer = useMemo(() => summary?.bestPerformer || null, [summary]);
  const worstPerformer = useMemo(() => summary?.worstPerformer || null, [summary]);

  const openBuyModal = (coin = null) => setModal({ open: true, mode: 'buy', coin });
  const openSellModal = (coin) => setModal({ open: true, mode: 'sell', coin });

  const handleSubmitTrade = async (payload) => {
    try {
      const normalizedPayload = {
        ...payload,
        coinId: String(payload.coinId || '').toLowerCase()
      };

      if (modal.mode === 'buy') {
        await buyAsset(normalizedPayload);
        toast.success('Buy order executed');
      } else {
        await sellAsset(normalizedPayload);
        toast.success('Sell order executed');
      }

      setModal({ open: false, mode: 'buy', coin: null });
    } catch (error) {
      const message = error?.message || 'Unable to complete trade';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel-strong rounded-[2.5rem] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Virtual portfolio</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">Simulate a real crypto portfolio with virtual cash, live pricing, and trade history.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">Track your virtual balance, holdings, P/L, and portfolio growth without affecting real funds.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openBuyModal()}
              className="rounded-2xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_-22px_rgba(34,211,238,0.7)]"
            >
              Buy crypto
            </motion.button>
            <button
              type="button"
              onClick={refresh}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Refresh portfolio
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">{user ? `Trading as ${user.username}` : 'Signed in user'}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">{loading ? 'Loading portfolio...' : 'Live portfolio snapshot'}</span>
          {error ? <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-rose-200">{error}</span> : null}
          {actionError ? <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-rose-200">{actionError}</span> : null}
        </div>
      </div>

      {loading && !snapshot ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-[1.5rem]" />
          ))}
        </div>
      ) : (
        <PortfolioSummaryGrid summary={summary} />
      )}

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="space-y-6">
          <PortfolioAnalyticsPanel />

          <div className="glass-panel rounded-[2.5rem] p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Holdings</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Current positions and live allocation</h2>
              </div>
              <button
                type="button"
                onClick={() => openBuyModal()}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
              >
                Buy another asset
              </button>
            </div>

            <div className="mt-6">
              <HoldingsTable
                holdings={holdings}
                onSell={openSellModal}
                onBuyMore={openBuyModal}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-[2.5rem] p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-300">Portfolio intelligence</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Top performers</h3>
            <div className="mt-5 space-y-3">
              {[bestPerformer, worstPerformer].filter(Boolean).map((item) => (
                <div key={item.symbol} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-500">{item === bestPerformer ? 'Best performer' : 'Weakest performer'}</div>
                  <div className="mt-2 text-lg font-semibold text-white">{item.coinName || item.coinId || item.symbol}</div>
                  <div className={`mt-1 text-sm font-semibold ${Number(item.profitLossPct || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{Number(item.profitLossPct || 0).toFixed(2)}%</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-[2.5rem] p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Transaction history</p>
            <h3 className="mt-2 text-xl font-semibold text-white">All buys and sells</h3>
            <div className="mt-5">
              <TransactionHistory transactions={transactions} />
            </div>
          </div>
        </div>
      </div>

      <TradeModal
        open={modal.open}
        mode={modal.mode}
        coin={modal.coin}
        loading={actionLoading}
        onClose={() => setModal({ open: false, mode: 'buy', coin: null })}
        onSubmit={handleSubmitTrade}
      />
    </div>
  );
}