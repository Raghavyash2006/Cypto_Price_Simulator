import { memo } from 'react';
import { motion } from 'framer-motion';

function LeaderboardPreview({ leaders = [] }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Leaderboard</h3>
        <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Top ranks</span>
      </div>
      <div className="mt-4 space-y-2">
        {leaders.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
            Leaderboard results will appear here once users start earning XP.
          </div>
        ) : (
          leaders.map((leader, index) => (
            <motion.div
              key={leader.id || leader.username}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-3"
            >
              <div>
                <div className="text-sm font-semibold text-white">
                  #{leader.rank} {leader.name}
                </div>
                <div className="text-xs text-slate-400">{leader.xp.toLocaleString()} XP • {leader.level}</div>
              </div>
              <div className="text-sm text-cyan-300">{leader.streak} day streak</div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

export default memo(LeaderboardPreview);
