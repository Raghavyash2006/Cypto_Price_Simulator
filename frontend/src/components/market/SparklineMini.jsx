export default function SparklineMini({ data = [], positive = true, className = '' }) {
  const points = Array.isArray(data)
    ? data.map((value) => {
        if (Array.isArray(value)) return Number(value[1] ?? value[0] ?? 0);
        return Number(value || 0);
      })
    : [];

  if (!points.length) {
    return <div className={`h-10 rounded-xl border border-white/10 bg-white/5 ${className}`} />;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 120;
  const height = 40;
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const path = points
    .map((point, index) => {
      const x = index * step;
      const y = height - ((point - min) / range) * (height - 6) - 3;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`h-10 w-full overflow-visible ${className}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sparkline-fill-${positive ? 'up' : 'down'}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={positive ? '#22c55e' : '#fb7185'} stopOpacity="0.35" />
          <stop offset="100%" stopColor={positive ? '#22c55e' : '#fb7185'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L ${width} ${height} L 0 ${height} Z`} fill={`url(#sparkline-fill-${positive ? 'up' : 'down'})`} />
      <path d={path} fill="none" stroke={positive ? '#22c55e' : '#fb7185'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}