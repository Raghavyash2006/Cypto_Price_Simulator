import { memo } from 'react';
import { motion } from 'framer-motion';

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatCompact(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function MarketCoinRow({ coin, selected = false, onSelect, onAddToWatchlist, flashDirection = null, onOpenDetail }) {
  const change = Number(coin?.price_change_percentage_24h || 0);
  const changeClass = change >= 0 ? 'text-emerald-300' : 'text-rose-300';
  const flashClass = flashDirection === 'up' ? 'border-emerald-400/30 bg-emerald-400/10' : flashDirection === 'down' ? 'border-rose-400/30 bg-rose-400/10' : '';

  return (
    <motion.button
      type="button"
      layout
      onClick={() => onSelect?.(coin)}
      whileHover={{ y: -2 }}
      className={`w-full rounded-[1.5rem] border p-4 text-left transition ${selected ? 'border-cyan-400/25 bg-cyan-400/10 shadow-[0_18px_60px_-32px_rgba(34,211,238,0.55)]' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'} ${flashClass}`}
    >
      <div className="flex flex-col gap-4 md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] md:items-center">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
            {coin?.image ? <img src={coin.image} alt={coin?.name} className="h-10 w-10 object-cover" /> : <span className="text-xs font-black text-white">{String(coin?.symbol || '?').slice(0, 3).toUpperCase()}</span>}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">#{coin?.market_cap_rank || '—'}</span>
              <h3 className="truncate text-sm font-semibold text-white">{coin?.name || 'Unknown coin'}</h3>
            </div>
            <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-500">{String(coin?.symbol || '').toUpperCase()}</p>
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 md:hidden">Price</p>
          <div className="mt-1 text-sm font-semibold text-white md:mt-0">{formatCurrency(coin?.current_price)}</div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 md:hidden">24h</p>
          <div className={`mt-1 text-sm font-semibold md:mt-0 ${changeClass}`}>{change.toFixed(2)}%</div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 md:hidden">Market cap</p>
          <div className="mt-1 text-sm font-semibold text-white md:mt-0">{formatCompact(coin?.market_cap)}</div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 md:hidden">Volume</p>
          <div className="mt-1 text-sm font-semibold text-white md:mt-0">{formatCompact(coin?.total_volume)}</div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 md:hidden">Rank</p>
          <div className="mt-1 text-sm font-semibold text-white md:mt-0">#{coin?.market_cap_rank || '—'}</div>
        </div>

        <div className="flex flex-wrap justify-start gap-2 md:justify-end">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenDetail?.(coin);
            }}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Details
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAddToWatchlist?.(coin);
            }}
            className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
          >
            Watchlist
          </button>
        </div>
      </div>
    </motion.button>
  );
}

export default memo(MarketCoinRow);