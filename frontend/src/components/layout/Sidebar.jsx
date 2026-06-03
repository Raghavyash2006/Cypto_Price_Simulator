import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { closeSidebar } from '../../features/ui/uiSlice';

const linkClass = ({ isActive }) =>
  [
    'group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40',
    isActive
      ? 'border border-cyan-400/20 bg-gradient-to-r from-cyan-400/18 via-white/8 to-emerald-400/14 text-[color:var(--page-text)] shadow-[0_20px_60px_-28px_rgba(34,211,238,0.55)]'
      : 'border border-transparent text-[color:var(--page-muted)] hover:border-[color:var(--page-border)] hover:bg-[color:var(--page-surface)] hover:text-[color:var(--page-text)]'
  ].join(' ');

export default function Sidebar() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const isOpen = useSelector((state) => state.ui.sidebarOpen);
  const displayName = user?.name || user?.username || 'Guest';
  const links = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/portfolio', label: 'Portfolio' },
    { to: '/learn', label: 'Learn' },
    { to: '/quizzes', label: 'Quizzes' },
    { to: '/market', label: 'Market' },
    { to: '/watchlist', label: 'Watchlist' },
    { to: '/market/alerts', label: 'Alerts' },
    { to: '/community', label: 'Community' },
    { to: '/arena', label: 'Arena' },
    { to: '/leaderboard', label: 'Leaderboard' },
    { to: '/chat', label: 'AI Mentor' }
  ];

  if (user?.isAdmin) {
    links.push({ to: '/admin', label: 'Admin' });
  }

  const sidebarContent = (
    <>
      <div className="glass-panel-strong mb-8 rounded-[2rem] p-5 shadow-[0_24px_70px_-36px_rgba(34,211,238,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Crypto Simulator</p>
            <h1 className="mt-2 text-[1.45rem] font-semibold tracking-tight text-[color:var(--page-text)]">Learn. Earn. Level Up.</h1>
            <p className="mt-3 text-sm leading-6 text-[color:var(--page-muted)]">A premium simulation layer for fintech-style learning, trading, and competition.</p>
          </div>
          <button
            type="button"
            onClick={() => dispatch(closeSidebar())}
            className="grid h-10 w-10 place-items-center rounded-full border border-[color:var(--page-border)] bg-[color:var(--page-surface)] text-[color:var(--page-text)] transition hover:bg-[color:var(--page-surface-strong)] lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {user && (
          <div className="mt-5 rounded-2xl border border-[color:var(--page-border)] bg-[color:var(--page-surface)] p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-sm font-black text-slate-950">
                {user.avatar ? <img src={user.avatar} alt={displayName} className="h-full w-full object-cover" /> : displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[color:var(--page-text)]">{displayName}</div>
                <div className="truncate text-xs text-[color:var(--page-muted)]">@{user.username}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-[color:var(--page-muted)]">
              <span>XP {user.xp?.toLocaleString?.() || user.xp || 0}</span>
              <span>{user.level}</span>
            </div>
          </div>
        )}
      </div>
      <nav className="space-y-2">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className={linkClass} onClick={() => dispatch(closeSidebar())}>
            <span className="h-2 w-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 opacity-60 transition group-hover:opacity-100" />
            {link.label}
            {link.to === '/dashboard' && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.25em] text-[color:var(--page-muted)]">Home</span>}
          </NavLink>
        ))}
      </nav>
    </>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-80 border-r border-[color:var(--page-border)] bg-[color:color-mix(in_srgb,var(--page-surface)_65%,transparent)] p-6 backdrop-blur-2xl lg:block">
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <button
              type="button"
              aria-label="Close navigation overlay"
              onClick={() => dispatch(closeSidebar())}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -24 }}
              animate={{ x: 0 }}
              exit={{ x: -24 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="relative z-10 h-full w-[min(88vw,22rem)] border-r border-[color:var(--page-border)] bg-[color:var(--page-bg)] p-5 shadow-[0_24px_80px_-28px_rgba(15,23,42,0.45)]"
            >
              {sidebarContent}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}