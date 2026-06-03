import Card from './Card';

export default function MetricCard({ label, value, delta }) {
  return (
    <Card className="group">
      <div className="flex h-full flex-col justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--page-muted)]">{label}</p>
          <strong className="mt-3 block text-[clamp(1.9rem,3vw,2.4rem)] font-black tracking-tight text-[color:var(--page-text)]">{value}</strong>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-[color:var(--page-accent)] transition duration-300 group-hover:border-emerald-400/30 group-hover:bg-emerald-400/14">
          {delta}
        </span>
      </div>
    </Card>
  );
}