import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import MarketAlertModal from '../components/market/MarketAlertModal';
import Skeleton from '../components/common/Skeleton';
import { createNotificationAlert, deleteNotificationAlert, listNotificationAlerts, updateNotificationAlert } from '../services/notificationsApi';

export default function MarketAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const activeAlerts = useMemo(() => alerts.filter((alert) => alert.isActive !== false), [alerts]);

  async function loadAlerts() {
    setLoading(true);
    try {
      const data = await listNotificationAlerts();
      setAlerts(data.alerts || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Unable to load alerts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAlerts();
  }, []);

  const handleSubmit = async (payload) => {
    try {
      await createNotificationAlert(payload);
      toast.success('Alert saved');
      setModalOpen(false);
      await loadAlerts();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Unable to save alert');
    }
  };

  const handleToggle = async (alert) => {
    try {
      await updateNotificationAlert(alert.id, { isActive: !alert.isActive });
      toast.success(alert.isActive ? 'Alert disabled' : 'Alert enabled');
      await loadAlerts();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Unable to update alert');
    }
  };

  const handleDelete = async (alertId) => {
    try {
      await deleteNotificationAlert(alertId);
      toast.success('Alert removed');
      await loadAlerts();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Unable to delete alert');
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel-strong rounded-[2.5rem] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-300">Alerts</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">Build price, portfolio, and movement alerts with a premium control panel.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">Create active market signals, toggle them on or off, and let the notification center surface matches with live badges and toasts.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <motion.button type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => setModalOpen(true)} className="rounded-2xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-5 py-3 text-sm font-semibold text-slate-950">
              New alert
            </motion.button>
            <motion.button type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => void loadAlerts()} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
              Refresh
            </motion.button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Active alerts</p>
            <div className="mt-2 text-2xl font-black text-white">{activeAlerts.length}</div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Total alerts</p>
            <div className="mt-2 text-2xl font-black text-white">{alerts.length}</div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Status</p>
            <div className="mt-2 text-2xl font-black text-white">{loading ? 'Syncing' : 'Ready'}</div>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-[2.5rem] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Alert list</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Manage active market watchers</h2>
          </div>
        </div>

        {loading && !alerts.length ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-[1.5rem]" />)}
          </div>
        ) : alerts.length ? (
          <div className="mt-6 space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className={`rounded-[1.5rem] border p-4 ${alert.isActive !== false ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-300">{alert.type}</span>
                      {!alert.isActive && <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-100">Disabled</span>}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-white">{alert.title}</h3>
                    <p className="mt-1 text-sm text-slate-300">
                      {alert.type === 'movement'
                        ? `${alert.coinId} ${alert.movementDirection === 'below' ? 'drops' : 'moves'} ${Number(alert.movementPercent || 0).toFixed(2)}% over ${Number(alert.movementWindowMinutes || 60)} minutes`
                        : alert.type === 'portfolio'
                          ? `${alert.portfolioMetric} ${alert.direction} ${Number(alert.threshold || 0).toLocaleString()}`
                          : `${alert.coinId} ${alert.direction} $${Number(alert.targetPrice || 0).toLocaleString()}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void handleToggle(alert)} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10">
                      {alert.isActive === false ? 'Enable' : 'Disable'}
                    </button>
                    <button type="button" onClick={() => void handleDelete(alert.id)} className="rounded-full border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400">No alerts configured yet. Create a price, portfolio, or movement alert to start receiving live notifications.</div>
        )}
      </div>

      <MarketAlertModal
        open={modalOpen}
        coin={null}
        loading={loading}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}