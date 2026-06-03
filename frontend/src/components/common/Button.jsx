import { motion } from 'framer-motion';

export default function Button({ children, className = '', ...props }) {
  return (
    <motion.button
      whileHover={{ y: -1, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className={`rounded-2xl border border-cyan-400/20 bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_-22px_rgba(34,211,238,0.55)] transition focus:outline-none focus:ring-2 focus:ring-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}