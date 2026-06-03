import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import LearningProgressBar from './LearningProgressBar';

function formatMinutes(minutes) {
  return `${Number(minutes || 0)} min`;
}

export default function LearningCourseCard({ course }) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.18 }} className="glass-panel rounded-[2rem] p-5 sm:p-6">
      <div className="flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">{course.category}</div>
            <h3 className="mt-2 text-2xl font-semibold text-white">{course.title}</h3>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
            {course.difficulty}
          </div>
        </div>

        <p className="text-sm leading-6 text-slate-400">{course.description}</p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-3">
            <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Duration</div>
            <div className="mt-1 text-sm font-semibold text-white">{formatMinutes(course.estimatedDurationMinutes)}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-3">
            <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">XP reward</div>
            <div className="mt-1 text-sm font-semibold text-white">+{Number(course.xpReward || 0).toLocaleString()} XP</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-3">
            <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Lessons</div>
            <div className="mt-1 text-sm font-semibold text-white">{course.lessonCount}</div>
          </div>
        </div>

        <LearningProgressBar value={course.completionPercentage} />

        <div className="mt-auto flex items-center justify-between gap-4 pt-1">
          <div className="text-sm text-slate-300">{course.completedLessons}/{course.lessonCount} complete</div>
          <Link
            to={`/learn/course/${course.id}`}
            className="inline-flex items-center rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110"
          >
            Open course
          </Link>
        </div>
      </div>
    </motion.div>
  );
}