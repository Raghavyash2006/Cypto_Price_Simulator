import { motion } from 'framer-motion';

export default function MarketStatCard({ title, value, detail, tone = 'cyan' }) {
  const toneClass =
    tone === 'amber'
      ? 'from-amber-400/20 via-white/5 to-amber-300/10'
      : tone === 'emerald'
        ? 'from-emerald-400/20 via-white/5 to-emerald-300/10'
        : 'from-cyan-400/20 via-white/5 to-cyan-300/10';

  return (
    <motion.div whileHover={{ y: -3 }} className={`glass-panel rounded-[1.5rem] border border-white/10 bg-gradient-to-br ${toneClass} p-4`}>
      <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">{title}</p>
      <div className="mt-2 text-2xl font-black text-white">{value}</div>
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
    </motion.div>
  );
}