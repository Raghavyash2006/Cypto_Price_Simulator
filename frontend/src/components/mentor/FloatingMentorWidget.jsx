import { lazy, Suspense, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const MentorChatPanel = lazy(() => import('./MentorChatPanel'));

export default function FloatingMentorWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.24 }}
            className="pointer-events-auto w-[min(92vw,28rem)]"
          >
            <Suspense fallback={<div className="glass-panel rounded-[2rem] p-5 text-sm text-[color:var(--page-muted)]">Loading mentor…</div>}>
              <MentorChatPanel compact onClose={() => setOpen(false)} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="pointer-events-auto flex items-center gap-3 rounded-full border border-cyan-400/25 bg-slate-950/95 px-4 py-3 text-left shadow-[0_20px_60px_-24px_rgba(34,211,238,0.65)] backdrop-blur-xl transition hover:-translate-y-0.5"
      >
        <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20">
          <Sparkles className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-sm font-semibold text-white">Ask the AI mentor</span>
          <span className="block text-xs text-slate-400">Portfolio checks, market notes, risk guidance</span>
        </span>
      </button>
    </div>
  );
}
