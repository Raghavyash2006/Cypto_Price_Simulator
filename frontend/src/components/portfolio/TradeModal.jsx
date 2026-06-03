import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatMoney, safeNumber } from '../../features/portfolio/formatters';

export default function TradeModal({ open, mode, coin, onClose, onSubmit, loading = false }) {
  const [coinId, setCoinId] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!open) return;
    setCoinId(String(coin?.coinId || coin?.id || coin?.symbol || '').toLowerCase());
    setQuantity(mode === 'sell' && coin?.quantity ? safeNumber(coin.quantity, 1) : 1);
  }, [open, coin, mode]);

  const displayName = coin?.coinName || coin?.name || coin?.symbol || coinId || 'Asset';
  const displaySymbol = String(coin?.symbol || coin?.coinId || coinId || '').toUpperCase();
  const currentPrice = safeNumber(coin?.currentPrice || coin?.current_price, NaN);
  const numericQuantity = safeNumber(quantity, 0);
  const estimatedValue = useMemo(() => (Number.isFinite(currentPrice) ? currentPrice * numericQuantity : 0), [currentPrice, numericQuantity]);
  const maxQuantity = safeNumber(coin?.quantity);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit({
      coinId,
      quantity: Number(quantity),
      coinName: coin?.coinName || coin?.name || coinId,
      symbol: coin?.symbol || coinId
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 py-8 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
            className="glass-panel-strong w-full max-w-lg rounded-[2rem] p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">{mode === 'buy' ? 'Buy crypto' : 'Sell crypto'}</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{displayName}</h3>
                <p className="mt-1 text-sm text-slate-400">{displaySymbol || 'Manual coin ID entry'}</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10">
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block space-y-2 text-sm text-slate-300">
                <span>CoinGecko coin ID</span>
                <input
                  value={coinId}
                  onChange={(event) => setCoinId(event.target.value)}
                  readOnly={Boolean(coin?.id || coin?.coinId)}
                  placeholder="bitcoin"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2 text-sm text-slate-300">
                  <span>Quantity</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    max={mode === 'sell' ? maxQuantity || undefined : undefined}
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                  />
                </label>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">{mode === 'buy' ? 'Estimated cost' : 'Estimated proceeds'}</div>
                  <div className="mt-2 text-xl font-semibold text-white">{Number.isFinite(currentPrice) ? formatMoney(estimatedValue) : 'Price resolves on submit'}</div>
                  <div className="mt-1 text-xs text-slate-400">Live price {Number.isFinite(currentPrice) ? formatMoney(currentPrice) : 'unavailable in preview'}</div>
                </div>
              </div>

              {mode === 'sell' && coin?.quantity ? (
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Available to sell: {safeNumber(coin.quantity).toLocaleString()}</p>
              ) : null}

              <button
                type="submit"
                disabled={loading || !coinId || Number(quantity) <= 0}
                className={`w-full rounded-2xl px-5 py-3 text-sm font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-60 ${mode === 'buy' ? 'bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300' : 'bg-gradient-to-r from-rose-400 via-orange-400 to-amber-300'}`}
              >
                {loading ? 'Processing...' : mode === 'buy' ? 'Confirm buy' : 'Confirm sell'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}