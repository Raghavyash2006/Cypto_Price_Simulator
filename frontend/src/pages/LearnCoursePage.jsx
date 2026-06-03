import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Card from '../components/common/Card';
import Skeleton from '../components/common/Skeleton';
import LearningProgressBar from '../components/learning/LearningProgressBar';
import { fetchLearnCourse } from '../services/learnApi';

function formatMinutes(minutes) {
  return `${Number(minutes || 0)} min`;
}

export default function LearnCoursePage() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [stats, setStats] = useState(null);
  const [adaptive, setAdaptive] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  async function loadCourse() {
    setStatus('loading');
    setError('');
    try {
      const data = await fetchLearnCourse(id);
      setCourse(data.course || null);
      setLessons(data.lessons || []);
      setStats(data.stats || null);
      setAdaptive(data.adaptive || null);
      setStatus('succeeded');
    } catch (fetchError) {
      setError(fetchError?.response?.data?.message || 'Unable to load course');
      setStatus('failed');
    }
  }

  useEffect(() => {
    void loadCourse();
  }, [id]);

  if (status === 'loading' && !course) {
    return <Skeleton className="h-[65vh] rounded-[2.5rem]" />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="space-y-6">
      {error ? (
        <div className="rounded-[1.75rem] border border-rose-400/20 bg-rose-500/10 p-5 text-sm text-rose-200">
          <div>{error}</div>
          <button type="button" onClick={loadCourse} className="mt-3 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10">
            Retry
          </button>
        </div>
      ) : null}

      {course ? (
        <>
          <div className="glass-panel-strong rounded-[2.75rem] p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl space-y-4">
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.35em] text-cyan-300">
                  <span>{course.category}</span>
                  <span className="text-slate-500">/</span>
                  <span>{course.difficulty}</span>
                </div>
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">{course.title}</h1>
                <p className="text-base leading-7 text-slate-400">{course.description}</p>
                <div className="flex flex-wrap gap-3 text-sm text-slate-300">
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">{course.lessonCount} lessons</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">{formatMinutes(course.estimatedDurationMinutes)}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">+{Number(course.xpReward || 0).toLocaleString()} XP</span>
                </div>
              </div>
              <Link to="/learn" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
                Back to catalog
              </Link>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_0.7fr]">
              <Card className="border-white/10 bg-slate-950/55">
                <div className="space-y-4">
                  <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">Course completion</div>
                  <div className="text-3xl font-semibold text-white">{course.completionPercentage}%</div>
                  <LearningProgressBar value={course.completionPercentage} />
                  <div className="text-sm text-slate-400">
                    {course.completedLessons}/{course.lessonCount} lessons complete · {stats?.completionPercentage ?? course.completionPercentage}% course average
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    XP earned from learning: {stats?.totalXpEarned ?? course.earnedXp ?? 0}
                  </div>
                  <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/8 p-4 text-sm text-slate-300">
                    Adaptive level: {adaptive?.level || 'beginner'} · Quiz focus: {adaptive?.quizFocus || 'guided practice'}
                  </div>
                  <Link to={`/learn/quiz?courseId=${course.id}&level=${adaptive?.quizLevel || course.difficulty}`} className="inline-flex rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110">
                    Start course quiz
                  </Link>
                </div>
              </Card>

              <Card className="border-white/10 bg-slate-950/55">
                <div className="space-y-3">
                  <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">Learning path</div>
                  <div className="text-lg font-semibold text-white">Continue in sequence</div>
                  <p className="text-sm leading-6 text-slate-400">Each lesson carries its own progress state so you can track completion without losing context.</p>
                    {adaptive ? (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                        This course leans toward {adaptive.lessonDepth} with {adaptive.explanationStyle} explanations.
                      </div>
                    ) : null}
                </div>
              </Card>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">Lessons</h2>
                  <p className="mt-1 text-sm text-slate-400">Open any lesson to continue progress or review the module material.</p>
                </div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-500">{lessons.length} items</div>
              </div>

              <div className="mt-5 space-y-3">
                {lessons.length ? lessons.map((lesson) => (
                  <motion.div key={lesson.id} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
                          <span>{lesson.difficulty}</span>
                          <span>{formatMinutes(lesson.estimatedDurationMinutes)}</span>
                          <span>+{lesson.xpReward} XP</span>
                        </div>
                        <h3 className="text-lg font-semibold text-white">{lesson.title}</h3>
                        <p className="text-sm leading-6 text-slate-400">{lesson.description}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
                        <div className="text-sm text-slate-300">{lesson.completionPercentage}% complete</div>
                        <LearningProgressBar value={lesson.completionPercentage} className="w-full min-w-[220px] md:w-[260px]" />
                        <Link
                          to={`/learn/lesson/${lesson.id}`}
                          className="inline-flex rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                        >
                          Open lesson
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )) : (
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6 text-sm text-slate-400">
                    No lessons are available in this course yet.
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <div className="space-y-4">
                <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">Course stats</div>
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Average progress</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{stats?.completionPercentage ?? course.completionPercentage}%</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Finished lessons</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{course.completedLessons}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Reward pool</div>
                    <div className="mt-2 text-2xl font-semibold text-white">+{course.xpReward} XP</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </motion.div>
  );
}