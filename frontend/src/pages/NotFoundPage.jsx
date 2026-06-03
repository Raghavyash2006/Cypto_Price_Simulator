import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="glass-panel-strong w-full rounded-[2.5rem] p-8 text-center sm:p-12">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Not found</p>
        <h1 className="mt-4 text-5xl font-black text-white sm:text-6xl">404</h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-400">The page you’re looking for does not exist or has moved to a different premium experience.</p>
        <Link to="/" className="mt-8 inline-flex rounded-2xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_-22px_rgba(34,211,238,0.7)]">
          Go home
        </Link>
      </div>
    </div>
  );
}