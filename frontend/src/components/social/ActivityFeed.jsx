import { memo } from 'react';
import { motion } from 'framer-motion';

function ActivityFeed({ items = [] }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Activity feed</h3>
        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Live</span>
      </div>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">No activity yet. Follow users and trade to build the feed.</div>
        ) : (
          items.map((item, index) => (
            <motion.div
              key={item._id || `${item.type}-${index}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-sm font-black text-slate-950">
                  {item.actor?.name?.slice(0, 1) || item.actor?.username?.slice(0, 1) || '•'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white">{item.title}</div>
                  <div className="mt-1 text-sm text-slate-300">{item.summary}</div>
                  <div className="mt-2 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

export default memo(ActivityFeed);
