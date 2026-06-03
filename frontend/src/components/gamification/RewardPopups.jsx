import { AnimatePresence, motion } from 'framer-motion';

export default function RewardPopups({ rewards = [] }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(92vw,26rem)] flex-col gap-3">
      <AnimatePresence>
        {rewards.map((reward) => (
          <motion.div
            key={reward.key}
            initial={{ opacity: 0, y: -18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-auto rounded-3xl border border-emerald-400/20 bg-slate-950/95 p-4 shadow-[0_20px_60px_-20px_rgba(16,185,129,0.6)] backdrop-blur"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-lg font-black text-slate-950">
                {reward.icon || '✦'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{reward.title}</p>
                <p className="mt-1 text-sm text-slate-300">{reward.description}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">
                  +{reward.xpAward} XP
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
