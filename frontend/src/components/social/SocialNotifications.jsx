import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getSocket } from '../../services/socket';

export default function SocialNotifications() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    const handleNotification = (notification) => {
      const entry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: notification.title || notification.message || 'New notification',
        type: notification.type || 'system',
        metadata: notification.metadata || {}
      };

      setItems((current) => [entry, ...current].slice(0, 3));
      window.setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== entry.id));
      }, 5000);
    };

    socket.on('notification:new', handleNotification);
    socket.on('social:notification', handleNotification);

    return () => {
      socket.off('notification:new', handleNotification);
      socket.off('social:notification', handleNotification);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(92vw,24rem)] flex-col gap-3">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            className="pointer-events-auto rounded-3xl border border-amber-400/20 bg-slate-950/95 p-4 shadow-[0_24px_80px_-28px_rgba(245,158,11,0.45)] backdrop-blur"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-300 text-sm font-black text-slate-950">
                {String(item.type || 'system').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Real-time</p>
                <p className="mt-1 text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-xs text-slate-400">{item.type}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
