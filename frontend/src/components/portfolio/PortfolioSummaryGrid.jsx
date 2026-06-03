import { motion } from 'framer-motion';
import { formatMoney, formatPercent, safeNumber } from '../../features/portfolio/formatters';

function SummaryCard({ label, value, detail, tone = 'cyan' }) {
  const toneClass =
    tone === 'rose'
      ? 'from-rose-400/20 via-white/5 to-rose-300/10'
      : tone === 'amber'
        ? 'from-amber-400/20 via-white/5 to-amber-300/10'
        : 'from-cyan-400/20 via-white/5 to-cyan-300/10';

  return (
    <motion.div whileHover={{ y: -2 }} className={`glass-panel rounded-[1.5rem] border border-white/10 bg-gradient-to-br ${toneClass} p-4`}>
      <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">{label}</p>
      <div className="mt-2 text-2xl font-black text-white">{value}</div>
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
    </motion.div>
  );
}

export default function PortfolioSummaryGrid({ summary }) {
  if (!summary) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <SummaryCard label="Virtual balance" value={formatMoney(summary.virtualBalance)} detail="Available cash" tone="cyan" />
      <SummaryCard label="Portfolio value" value={formatMoney(summary.totalValue)} detail="Current holdings value" tone="emerald" />
      <SummaryCard label="Invested capital" value={formatMoney(summary.investedCapital)} detail="Cost basis across holdings" tone="amber" />
      <SummaryCard label="Profit / loss" value={formatMoney(summary.profitLoss)} detail={formatPercent(summary.profitLossPct)} tone={summary.profitLoss >= 0 ? 'emerald' : 'rose'} />
      <SummaryCard label="Equity value" value={formatMoney(summary.equityValue)} detail="Cash + portfolio" tone="cyan" />
      <SummaryCard label="Holdings" value={safeNumber(summary.holdingsCount).toLocaleString()} detail={`Realized P/L ${formatMoney(summary.realizedPnL)}`} tone="amber" />
    </div>
  );
}