import { motion } from 'framer-motion';
import { formatMoney, formatPercent, safeNumber } from '../../features/portfolio/formatters';

export default function HoldingsTable({ holdings = [], onSell, onBuyMore }) {
  if (!holdings.length) {
    return (
      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6 text-sm text-slate-400">
        No holdings yet. Buy an asset to start building your simulated portfolio.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="hidden rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-4 text-[10px] uppercase tracking-[0.35em] text-slate-400 md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] md:items-center">
        <div>Asset</div>
        <div>Invested</div>
        <div>Current</div>
        <div>P/L</div>
        <div>Allocation</div>
        <div>Actions</div>
      </div>

      {holdings.map((holding) => {
        const isProfitable = safeNumber(holding.profitLoss) >= 0;
        const quantity = safeNumber(holding.quantity);

        return (
          <motion.div
            key={holding.id || holding.coinId || holding.symbol}
            whileHover={{ y: -2 }}
            className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 transition hover:border-white/20 hover:bg-white/8"
          >
            <div className="flex flex-col gap-4 md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] md:items-center">
              <div>
                <div className="text-sm font-semibold text-white">{holding.coinName || holding.coinId || holding.symbol}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-500">
                  {String(holding.symbol || holding.coinId || '').toUpperCase()} • {quantity.toLocaleString()} units
                </div>
              </div>

              <div className="text-sm font-semibold text-white">{formatMoney(holding.investedValue)}</div>
              <div className="text-sm font-semibold text-white">{formatMoney(holding.marketValue)}</div>
              <div className={`text-sm font-semibold ${isProfitable ? 'text-emerald-300' : 'text-rose-300'}`}>{formatMoney(holding.profitLoss)}</div>
              <div className="text-sm font-semibold text-white">{formatPercent(holding.allocationPct)}</div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onSell?.(holding)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                >
                  Sell
                </button>
                <button
                  type="button"
                  onClick={() => onBuyMore?.(holding)}
                  className="rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950"
                >
                  Buy more
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}