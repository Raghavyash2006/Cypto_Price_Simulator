import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { getSocket } from '../../services/socket';
import { getNotificationDashboard, markAllNotificationsRead, markNotificationRead } from '../../services/notificationsApi';

function typeTone(type) {
  if (type === 'price-alert') return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100';
  if (type === 'portfolio-alert') return 'border-rose-400/25 bg-rose-500/10 text-rose-100';
  if (type === 'friend_request' || type === 'social') return 'border-cyan-400/25 bg-cyan-500/10 text-cyan-100';
  if (type === 'achievement' || type === 'quiz') return 'border-amber-400/25 bg-amber-500/10 text-amber-100';
  return 'border-white/10 bg-white/5 text-slate-100';
}

function typeLabel(type) {
  return String(type || 'system')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [dashboard, setDashboard] = useState({ notifications: [], alerts: [], unreadCount: 0 });
  const [loading, setLoading] = useState(false);

  const latestNotifications = useMemo(() => dashboard.notifications || [], [dashboard.notifications]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const data = await getNotificationDashboard();
      setDashboard(data || { notifications: [], alerts: [], unreadCount: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    const handleNotification = (notification) => {
      setDashboard((current) => {
        const entry = {
          ...notification,
          _id: notification._id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          localOnly: !notification._id,
          read: false
        };
        return {
          ...current,
          unreadCount: (current.unreadCount || 0) + 1,
          notifications: [entry, ...(current.notifications || [])].slice(0, 20)
        };
      });
    };

    socket.on('notification:new', handleNotification);
    socket.on('social:notification', handleNotification);

    return () => {
      socket.off('notification:new', handleNotification);
      socket.off('social:notification', handleNotification);
    };
  }, []);

  async function handleMarkRead(notificationId) {
    const notification = dashboard.notifications.find((item) => String(item._id) === String(notificationId));
    if (notification?.localOnly) {
      setDashboard((current) => ({
        ...current,
        unreadCount: Math.max(0, (current.unreadCount || 0) - 1),
        notifications: (current.notifications || []).map((item) =>
          String(item._id) === String(notificationId) ? { ...item, read: true } : item
        )
      }));
      return;
    }

    await markNotificationRead(notificationId);
    setDashboard((current) => ({
      ...current,
      unreadCount: Math.max(0, (current.unreadCount || 0) - 1),
      notifications: (current.notifications || []).map((notification) =>
        String(notification._id) === String(notificationId) ? { ...notification, read: true } : notification
      )
    }));
  }

  async function handleMarkAll() {
    await markAllNotificationsRead();
    setDashboard((current) => ({
      ...current,
      unreadCount: 0,
      notifications: (current.notifications || []).map((notification) => ({ ...notification, read: true }))
    }));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void loadDashboard();
        }}
        className="relative grid h-11 w-11 place-items-center rounded-full border border-[color:var(--page-border)] bg-[color:var(--page-surface)] text-[color:var(--page-text)] transition hover:bg-[color:var(--page-surface-strong)]"
        aria-label="Open notifications"
      >
        <span className="text-lg">◔</span>
        {dashboard.unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-slate-950">
            {dashboard.unreadCount > 9 ? '9+' : dashboard.unreadCount}
          </span>
        )}
        {(dashboard.alerts?.length || 0) > 0 && (
          <span className="absolute -left-1 -bottom-1 grid min-h-5 min-w-5 place-items-center rounded-full border border-amber-300/40 bg-slate-950 px-1 text-[9px] font-black uppercase text-amber-200">
            {dashboard.alerts.length > 9 ? '9+' : dashboard.alerts.length}
          </span>
        )}
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120]"
            >
              <button
                type="button"
                aria-label="Close notifications"
                onClick={() => setOpen(false)}
                className="absolute inset-0 cursor-default bg-slate-950/75 backdrop-blur-md"
              />

              <motion.div
                initial={{ opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.96 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute inset-x-3 top-16 mx-auto w-[min(96vw,34rem)] overflow-hidden rounded-[1.9rem] border border-[color:var(--page-border)] bg-[color:var(--page-surface-strong)] text-[color:var(--page-text)] shadow-[0_40px_120px_rgba(2,6,23,0.28)] backdrop-blur-2xl md:inset-x-auto md:right-4 md:w-[32rem]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-[color:var(--page-border)] px-5 py-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.4em] text-amber-300">Notifications</p>
                    <h3 className="mt-1 text-lg font-semibold text-[color:var(--page-text)]">Live inbox</h3>
                    <p className="mt-1 text-sm text-[color:var(--page-muted)]">Price alerts, portfolio updates, and activity reminders.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => void handleMarkAll()} className="rounded-full border border-[color:var(--page-border)] bg-[color:var(--page-surface)] px-3 py-2 text-xs text-[color:var(--page-text)] transition hover:bg-[color:var(--page-surface-strong)]">
                      Mark all read
                    </button>
                    <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-[color:var(--page-border)] bg-[color:var(--page-surface)] px-3 py-2 text-xs text-[color:var(--page-text)] transition hover:bg-[color:var(--page-surface-strong)]">
                      Close
                    </button>
                  </div>
                </div>

                <div className="max-h-[calc(100vh-14rem)] overflow-y-auto px-4 py-4 md:px-5">
                  {loading && latestNotifications.length === 0 ? (
                    <div className="rounded-[1.25rem] border border-[color:var(--page-border)] bg-[color:var(--page-surface)] p-4 text-sm text-[color:var(--page-muted)]">Loading notifications...</div>
                  ) : latestNotifications.length ? (
                    <div className="space-y-3">
                      {latestNotifications.map((notification) => (
                        <button
                          key={notification._id}
                          type="button"
                          onClick={() => void handleMarkRead(notification._id)}
                          className={`w-full rounded-[1.35rem] border p-4 text-left transition hover:border-[color:var(--page-border-strong)] hover:bg-[color:var(--page-surface)] ${notification.read ? 'border-[color:var(--page-border)] bg-[color:var(--page-surface)]' : 'border-amber-400/20 bg-amber-500/10 shadow-[0_10px_30px_rgba(245,158,11,0.08)]'}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.25em] ${typeTone(notification.type)}`}>
                                  {typeLabel(notification.type)}
                                </span>
                                {!notification.read && <span className="rounded-full bg-amber-400 px-2 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-slate-950">New</span>}
                              </div>
                              <h4 className="mt-3 truncate text-sm font-semibold text-[color:var(--page-text)]">{notification.title || notification.message}</h4>
                              <p className="mt-1 line-clamp-2 text-sm leading-6 text-[color:var(--page-muted)]">{notification.message}</p>
                            </div>
                            <div className="text-right text-[10px] uppercase tracking-[0.3em] text-[color:var(--page-muted)]">
                              {notification.priority || 'normal'}
                            </div>
                          </div>
                          {notification.actionUrl && (
                            <div className="mt-3">
                              <Link to={notification.actionUrl} className="text-xs font-semibold text-amber-300 hover:text-amber-200">
                                Open linked view
                              </Link>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[1.25rem] border border-[color:var(--page-border)] bg-[color:var(--page-surface)] p-6 text-center text-sm text-[color:var(--page-muted)]">
                      No notifications yet. Price alerts, achievements, and reminders will appear here.
                    </div>
                  )}
                </div>

                <div className="border-t border-[color:var(--page-border)] p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[color:var(--page-border)] bg-[color:var(--page-surface)] p-3">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--page-muted)]">Active alerts</p>
                      <p className="mt-1 text-lg font-semibold text-[color:var(--page-text)]">{dashboard.alerts?.length || 0}</p>
                    </div>
                    <div className="rounded-2xl border border-[color:var(--page-border)] bg-[color:var(--page-surface)] p-3">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--page-muted)]">Unread</p>
                      <p className="mt-1 text-lg font-semibold text-[color:var(--page-text)]">{dashboard.unreadCount || 0}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[color:var(--page-muted)]">
                    <span className="rounded-full border border-[color:var(--page-border)] px-3 py-1">Price alerts</span>
                    <span className="rounded-full border border-[color:var(--page-border)] px-3 py-1">Portfolio alerts</span>
                    <span className="rounded-full border border-[color:var(--page-border)] px-3 py-1">Weekly digest</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
