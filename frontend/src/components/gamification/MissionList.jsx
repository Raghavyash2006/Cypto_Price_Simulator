import { motion } from 'framer-motion';

export default function MissionList({ title, items = [], onClaim, emptyLabel = 'No active rewards yet.' }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Live rewards</span>
      </div>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">{emptyLabel}</div>
        ) : (
          items.map((item, index) => (
            <motion.div
              key={item.periodKey || item.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="rounded-2xl border border-white/10 bg-slate-950/55 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.description}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.3em] text-cyan-300">
                    {item.current}/{item.target} progress
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-emerald-300">+{item.rewardXp} XP</div>
                  <button
                    type="button"
                    disabled={!item.completed || item.claimed || !onClaim}
                    onClick={() => onClaim?.(item)}
                    className="mt-2 rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {item.claimed ? 'Claimed' : item.completed ? 'Claim' : 'Locked'}
                  </button>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/8">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${item.progress}%` }} />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
