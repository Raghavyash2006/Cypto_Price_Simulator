export default function XpProgressBar({ xp = 0, level = {}, streak = 0 }) {
  const progress = Math.max(0, Math.min(100, Math.round((level.progress || 0) * 100)));

  return (
    <div className="space-y-3 rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-slate-900/95 via-slate-950 to-slate-900 p-5 shadow-[0_24px_80px_-28px_rgba(34,211,238,0.45)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Level progression</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">
            {level.title || 'Rising trader'} <span className="text-slate-400">• Rank {level.rank || 1}</span>
          </h3>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-right">
          <p className="text-xs text-slate-400">Current XP</p>
          <p className="text-lg font-bold text-white">{xp.toLocaleString()} XP</p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>{level.minXp?.toLocaleString?.() || 0} XP</span>
          <span>{level.nextMinXp ? `${level.nextMinXp.toLocaleString()} XP` : 'Max level'}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-lime-300 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{progress}% to next tier</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{streak} day streak</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Next: {level.nextTitle || 'Complete mastery'}</span>
      </div>
    </div>
  );
}
