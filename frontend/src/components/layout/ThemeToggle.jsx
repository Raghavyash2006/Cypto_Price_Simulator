import { MoonStar, SunMedium } from 'lucide-react';

export default function ThemeToggle({ theme, onToggle, compact = false }) {
  const isLight = theme === 'light';

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-2 rounded-full border border-[color:var(--page-border)] bg-[color:var(--page-surface)] px-4 py-2 text-sm font-semibold text-[color:var(--page-text)] shadow-[0_14px_48px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/30 hover:shadow-[0_20px_60px_-32px_rgba(34,211,238,0.45)] focus:outline-none focus:ring-2 focus:ring-cyan-400/40 ${compact ? 'px-3 py-2 text-xs' : ''}`}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      <span className="grid h-8 w-8 place-items-center rounded-full bg-[color:color-mix(in_srgb,var(--page-accent)_16%,transparent)] text-[color:var(--page-accent)]">
        {isLight ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
      </span>
      <span>{isLight ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
}