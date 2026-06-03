import { motion } from 'framer-motion';
import SparklineMini from './SparklineMini';

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatCompact(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function WatchlistItemCard({ item, onBuy, onSell, onRemove, onAddAlert, onOpenDetail }) {
  const positive = Number(item?.performancePct || 0) >= 0;

  return (
    <motion.div whileHover={{ y: -3 }} className="rounded-[1.7rem] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <button type="button" onClick={onOpenDetail} className="flex min-w-0 items-center gap-3 text-left">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
            {item?.image ? <img src={item.image} alt={item.coinName} className="h-full w-full object-cover" /> : <span className="text-xs font-black text-white">{String(item?.symbol || '?').slice(0, 3).toUpperCase()}</span>}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{item?.coinName || 'Coin'}</div>
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">{String(item?.symbol || '').toUpperCase()}</div>
          </div>
        </button>

        <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-5 xl:items-center">
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Live price</div>
            <div className="mt-1 text-lg font-semibold text-white">{formatCurrency(item?.currentPrice)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-slate-500">24h change</div>
            <div className={`mt-1 text-lg font-semibold ${Number(item?.priceChange24h || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{Number(item?.priceChange24h || 0).toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Market cap</div>
            <div className="mt-1 text-lg font-semibold text-white">{formatCompact(item?.marketCap)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Watchlist performance</div>
            <div className={`mt-1 text-lg font-semibold ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>{Number(item?.performancePct || 0).toFixed(2)}%</div>
          </div>
          <div className="min-w-[120px]">
            <SparklineMini data={item?.sparkline || []} positive={positive} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={onBuy} className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20">Quick buy</button>
        <button type="button" onClick={onSell} className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20">Quick sell</button>
        <button type="button" onClick={onAddAlert} className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/20">Price alert</button>
        <button type="button" onClick={onRemove} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10">Remove</button>
      </div>
    </motion.div>
  );
}