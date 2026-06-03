import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const highlights = [
  'Glassmorphism-first product UI',
  'Premium onboarding and auth flow',
  'Built for mobile and desktop'
];

export default function AuthShell({ title, subtitle, eyebrow, children, footerText, footerLinkText, footerLinkTo }) {
  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="glass-panel-strong hidden rounded-[2.5rem] p-8 lg:block"
        >
          <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
            {eyebrow}
          </div>
          <h1 className="mt-5 text-5xl font-black tracking-tight text-white">{title}</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-400">{subtitle}</p>
          <div className="mt-8 space-y-3">
            {highlights.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 text-xs font-black text-slate-950">✓</span>
                {item}
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-[2rem] border border-white/10 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">What you get</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {['Mentor', 'Quizzes', 'Trading'].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 }}
          className="glass-panel-strong rounded-[2.5rem] p-5 sm:p-8"
        >
          <div className="mb-8 flex items-center justify-between gap-4 lg:hidden">
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">{eyebrow}</div>
              <h1 className="mt-2 text-3xl font-black text-white">{title}</h1>
            </div>
            <Link to="/" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10">
              Home
            </Link>
          </div>

          <div className="hidden lg:block">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">{eyebrow}</p>
            <h2 className="mt-2 text-3xl font-black text-white">{title}</h2>
            <p className="mt-3 max-w-lg text-sm leading-7 text-slate-400">{subtitle}</p>
          </div>

          <div className="mt-8">{children}</div>

          {footerText && footerLinkText && footerLinkTo ? (
            <p className="mt-6 text-sm text-slate-400">
              {footerText} <Link to={footerLinkTo} className="font-semibold text-cyan-300 hover:text-cyan-200">{footerLinkText}</Link>
            </p>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}
