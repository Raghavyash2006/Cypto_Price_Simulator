import { motion } from 'framer-motion';

export default function Achievements({ badges = [] }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Achievement badges</h3>
        <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Unlocked</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {badges.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400 sm:col-span-2 xl:col-span-3">
            Unlock your first badge by making a trade, claiming a streak, or inviting a friend.
          </div>
        ) : (
          badges.map((badge, index) => (
            <motion.div
              key={badge.id || badge.key}
              whileHover={{ y: -3, scale: 1.02 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-center shadow-[0_18px_40px_-28px_rgba(34,197,94,0.45)]"
            >
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 via-emerald-400 to-lime-300 text-xl font-black text-slate-950">
                {badge.badgeImage || '🏅'}
              </div>
              <div className="font-semibold text-white">{badge.title}</div>
              <div className="mt-1 text-sm text-slate-400">{badge.description}</div>
              <div className="mt-2 text-xs uppercase tracking-[0.3em] text-emerald-300">+{badge.xpReward} XP</div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
