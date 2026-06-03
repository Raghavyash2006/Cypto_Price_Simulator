import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const defaultForm = {
  type: 'price',
  title: '',
  coinId: '',
  coinName: '',
  symbol: '',
  direction: 'above',
  targetPrice: '',
  portfolioMetric: 'totalValue',
  threshold: '',
  movementPercent: '',
  movementWindowMinutes: 60,
  movementDirection: 'above'
};

export default function MarketAlertModal({ open, coin, loading = false, onClose, onSubmit }) {
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (!open) return;
    setForm((current) => ({
      ...current,
      coinId: coin?.id || current.coinId,
      coinName: coin?.name || current.coinName,
      symbol: coin?.symbol || current.symbol,
      title: coin?.name ? `${coin.name} alert` : current.title
    }));
  }, [coin, open]);

  if (typeof document === 'undefined') return null;

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit?.({
      ...form,
      targetPrice: Number(form.targetPrice),
      threshold: Number(form.threshold),
      movementPercent: Number(form.movementPercent),
      movementWindowMinutes: Number(form.movementWindowMinutes)
    });
    setForm(defaultForm);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[140]">
          <button type="button" aria-label="Close alert modal" onClick={onClose} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="absolute inset-x-3 top-10 mx-auto w-[min(96vw,42rem)] rounded-[2rem] border border-white/12 bg-slate-950/96 p-6 shadow-[0_50px_140px_rgba(2,6,23,0.82)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.4em] text-amber-300">Price alert modal</p>
                <h3 className="mt-1 text-2xl font-semibold text-white">Create a premium market alert</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">Set price, portfolio, or movement alerts and get in-app notifications when the market crosses your threshold.</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10">Close</button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none">
                  <option value="price">Price alert</option>
                  <option value="portfolio">Portfolio alert</option>
                  <option value="movement">Movement alert</option>
                </select>
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Alert title" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" />
              </div>

              {form.type === 'price' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <input value={form.coinId} onChange={(event) => setForm((current) => ({ ...current, coinId: event.target.value }))} placeholder="coin id (bitcoin)" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" />
                  <input value={form.targetPrice} onChange={(event) => setForm((current) => ({ ...current, targetPrice: event.target.value }))} placeholder="Target price" type="number" min="0" step="0.01" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" />
                  <select value={form.direction} onChange={(event) => setForm((current) => ({ ...current, direction: event.target.value }))} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none">
                    <option value="above">Above</option>
                    <option value="below">Below</option>
                  </select>
                  <input value={form.symbol} onChange={(event) => setForm((current) => ({ ...current, symbol: event.target.value }))} placeholder="Symbol" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" />
                </div>
              )}

              {form.type === 'portfolio' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <select value={form.portfolioMetric} onChange={(event) => setForm((current) => ({ ...current, portfolioMetric: event.target.value }))} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none">
                    <option value="totalValue">Total value</option>
                    <option value="profitLoss">Profit / loss</option>
                  </select>
                  <select value={form.direction} onChange={(event) => setForm((current) => ({ ...current, direction: event.target.value }))} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none">
                    <option value="above">Above</option>
                    <option value="below">Below</option>
                  </select>
                  <input value={form.threshold} onChange={(event) => setForm((current) => ({ ...current, threshold: event.target.value }))} placeholder="Threshold" type="number" min="0" step="0.01" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" />
                </div>
              )}

              {form.type === 'movement' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <input value={form.coinId} onChange={(event) => setForm((current) => ({ ...current, coinId: event.target.value }))} placeholder="coin id (bitcoin)" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" />
                  <input value={form.movementPercent} onChange={(event) => setForm((current) => ({ ...current, movementPercent: event.target.value }))} placeholder="Movement %" type="number" min="0" step="0.1" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" />
                  <select value={form.movementDirection} onChange={(event) => setForm((current) => ({ ...current, movementDirection: event.target.value }))} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none">
                    <option value="above">Above threshold</option>
                    <option value="below">Below threshold</option>
                  </select>
                  <input value={form.movementWindowMinutes} onChange={(event) => setForm((current) => ({ ...current, movementWindowMinutes: event.target.value }))} placeholder="Window minutes" type="number" min="5" step="5" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" />
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? 'Saving alert...' : 'Save alert'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}