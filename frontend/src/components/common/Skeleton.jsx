export default function Skeleton({ className = '' }) {
  return <div className={`animate-shimmer rounded-2xl bg-gradient-to-r from-[color:color-mix(in_srgb,var(--page-text)_5%,transparent)] via-[color:color-mix(in_srgb,var(--page-text)_12%,transparent)] to-[color:color-mix(in_srgb,var(--page-text)_5%,transparent)] opacity-90 ${className}`} />;
}