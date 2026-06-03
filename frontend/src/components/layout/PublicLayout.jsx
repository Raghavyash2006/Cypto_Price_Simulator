import { Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

export default function PublicLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen text-[color:var(--page-text)]">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.12),transparent_22%),linear-gradient(180deg,var(--page-bg-alt),var(--page-bg))]" />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          className="min-h-screen"
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
