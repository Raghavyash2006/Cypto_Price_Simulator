import { Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import FloatingMentorWidget from '../mentor/FloatingMentorWidget';
import SocialNotifications from '../social/SocialNotifications';
import { closeSidebar } from '../../features/ui/uiSlice';

export default function AppLayout() {
  const location = useLocation();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(closeSidebar());
  }, [dispatch, location.pathname]);

  return (
    <div className="min-h-screen text-[color:var(--page-text)]">
      <div className="mx-auto flex min-h-screen max-w-[1800px] gap-0 lg:gap-2 xl:gap-3">
        <Sidebar />
        <div className="relative flex min-h-screen flex-1 flex-col">
          <Topbar />
          <main className="relative flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 xl:px-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="mx-auto w-full max-w-[1600px]"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <SocialNotifications />
      <FloatingMentorWidget />
    </div>
  );
}