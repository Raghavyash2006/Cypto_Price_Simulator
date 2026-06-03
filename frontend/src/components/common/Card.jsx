import { motion } from 'framer-motion';

export default function Card({ children, className = '', as = 'div' }) {
  const Component = as === 'motion' ? motion.div : 'div';

  const sharedClasses = `glass-panel relative flex h-full flex-col overflow-hidden rounded-[1.85rem] border border-[color:var(--page-border)] bg-[color:var(--page-surface)] p-5 shadow-[0_24px_80px_-34px_rgba(15,23,42,0.24)] transition-all duration-300 ease-out sm:p-6 ${className}`;

  if (as === 'motion') {
    return (
      <Component
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
        className={`${sharedClasses} will-change-transform hover:border-cyan-400/20 hover:shadow-[0_28px_90px_-38px_rgba(34,211,238,0.26)]`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--page-accent-2)_9%,transparent),transparent_30%)] opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="relative flex-1">{children}</div>
      </Component>
    );
  }

  return (
    <Component className={sharedClasses}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--page-accent-2)_9%,transparent),transparent_30%)] opacity-80" />
      <div className="relative flex-1">{children}</div>
    </Component>
  );
}