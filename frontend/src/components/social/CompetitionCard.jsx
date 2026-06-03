import { memo } from 'react';
import { motion } from 'framer-motion';

function CompetitionCard({ competition, onJoin, onOpen }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.85)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-violet-300">Trading competition</p>
          <h4 className="mt-2 text-xl font-semibold text-white">{competition.title}</h4>
          <p className="mt-2 text-sm leading-6 text-slate-400">{competition.description}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${competition.isJoined ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-white/5 text-slate-300'}`}>
          {competition.participantCount || 0} participants
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Start</div>
          <div className="mt-1 text-sm font-semibold text-white">{new Date(competition.startsAt).toLocaleDateString()}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">End</div>
          <div className="mt-1 text-sm font-semibold text-white">{new Date(competition.endsAt).toLocaleDateString()}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Prize</div>
          <div className="mt-1 text-sm font-semibold text-white">{competition.prize}</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onJoin?.(competition._id)}
          className="rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
        >
          {competition.isJoined ? 'Joined' : 'Join competition'}
        </button>
        <button
          type="button"
          onClick={() => onOpen?.(competition._id)}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white"
        >
          View standings
        </button>
      </div>
    </motion.div>
  );
}

export default memo(CompetitionCard);
