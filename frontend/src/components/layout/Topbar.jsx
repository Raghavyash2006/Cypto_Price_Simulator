import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { Menu } from 'lucide-react';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';
import { toggleSidebar, toggleTheme } from '../../features/ui/uiSlice';
import { logoutUser } from '../../features/auth/authSlice';

export default function Topbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, status } = useSelector((state) => state.auth);
  const theme = useSelector((state) => state.ui.theme);

  const displayName = user?.name || user?.username || 'Account';
  const avatarLabel = (displayName || '?').slice(0, 1).toUpperCase();

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      toast.success('Signed out');
    } catch (error) {
      toast.error(error || 'Signed out locally');
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--page-border)] bg-[color:color-mix(in_srgb,var(--page-bg)_78%,transparent)] backdrop-blur-2xl transition-colors duration-300">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 lg:gap-4">
          <button
            type="button"
            onClick={() => dispatch(toggleSidebar())}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-[color:var(--page-border)] bg-[color:var(--page-surface)] text-[color:var(--page-text)] shadow-[0_16px_48px_-28px_rgba(15,23,42,0.38)] transition hover:border-cyan-400/30 hover:bg-[color:var(--page-surface-strong)] lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden h-11 w-11 place-items-center rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/20 via-white/10 to-emerald-400/20 text-sm font-black text-[color:var(--page-text)] shadow-[0_18px_50px_-20px_rgba(34,211,238,0.55)] lg:grid">
            CS
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] uppercase tracking-[0.4em] text-cyan-300">AI-powered crypto learning</p>
            <h2 className="text-lg font-semibold tracking-tight text-[color:var(--page-text)]">Gamified finance training</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle theme={theme} onToggle={() => dispatch(toggleTheme())} compact />
          <NotificationBell />
          {user ? (
            <div className="hidden items-center gap-3 rounded-full border border-[color:var(--page-border)] bg-[color:var(--page-surface)] px-3 py-2 sm:flex">
              <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 text-sm font-black text-slate-950">
                {user.avatar ? <img src={user.avatar} alt={displayName} className="h-full w-full object-cover" /> : avatarLabel}
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-semibold text-[color:var(--page-text)]">{displayName}</div>
                <div className="text-xs text-[color:var(--page-muted)]">@{user.username}</div>
              </div>
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={status === 'loading'}
                className="rounded-full border border-[color:var(--page-border)] px-3 py-2 text-xs font-semibold text-[color:var(--page-text)] transition hover:bg-[color:var(--page-surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === 'loading' ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="rounded-full border border-[color:var(--page-border)] bg-[color:var(--page-surface)] px-4 py-2 text-sm text-[color:var(--page-text)] transition hover:bg-[color:var(--page-surface-strong)]">
                Sign in
              </Link>
              <Link to="/register" className="rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_-22px_rgba(34,211,238,0.7)]">
                Join now
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}