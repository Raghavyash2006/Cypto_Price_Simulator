export default function LearningProgressBar({ value = 0, className = '' }) {
  const progress = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>Progress</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}