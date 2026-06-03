import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Card from '../components/common/Card';
import Skeleton from '../components/common/Skeleton';
import LearningCourseCard from '../components/learning/LearningCourseCard';
import LearningProgressBar from '../components/learning/LearningProgressBar';
import { fetchLearnAnalytics, fetchLearnCourses } from '../services/learnApi';

function StatCard({ label, value, detail }) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
      <div className="text-xs uppercase tracking-[0.35em] text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm text-slate-400">{detail}</div>
    </div>
  );
}

export default function LearnDashboardPage() {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  async function loadCourses() {
    setStatus('loading');
    setError('');
    try {
      const [courseResult, analyticsResult] = await Promise.allSettled([
        fetchLearnCourses(),
        fetchLearnAnalytics({ period: '30d' })
      ]);

      if (courseResult.status !== 'fulfilled') {
        throw courseResult.reason;
      }

      const data = courseResult.value;
      setCourses(data.courses || []);
      setCategories(['All', ...(data.categories || [])]);
      setStats(data.stats || null);
      setAnalytics(analyticsResult.status === 'fulfilled' ? analyticsResult.value : null);
      setActiveCategory((current) => current || 'All');
      setStatus('succeeded');
    } catch (fetchError) {
      setError(fetchError?.response?.data?.message || 'Unable to load learning courses');
      setStatus('failed');
    }
  }

  useEffect(() => {
    void loadCourses();
  }, []);

  const filteredCourses = useMemo(() => {
    if (activeCategory === 'All') return courses;
    return courses.filter((course) => course.category === activeCategory);
  }, [activeCategory, courses]);

  const completionSummary = stats?.averageCompletion || 0;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="space-y-6">
      <div className="glass-panel-strong rounded-[2.75rem] p-6 sm:p-8 lg:p-10">
        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr] xl:items-center">
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">Learning engine</p>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl">Build crypto understanding with a premium course workspace.</h1>
            <p className="max-w-2xl text-base leading-7 text-slate-400">
              Study foundational crypto concepts, track progress across courses, and continue into detailed lessons without leaving the trading product.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link to="/quizzes" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
                Review quizzes
              </Link>
              <Link to="/learn/analytics" className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15">
                Open analytics
              </Link>
              <button
                type="button"
                onClick={loadCourses}
                className="rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_-24px_rgba(34,211,238,0.8)]"
              >
                Refresh catalog
              </button>
            </div>
          </div>

          <Card className="border-white/10 bg-slate-950/50">
            <div className="space-y-4">
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">Learning snapshot</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">Your progress at a glance</h2>
              </div>
              {status === 'loading' && !stats ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 rounded-[1.5rem]" />
                  <Skeleton className="h-24 rounded-[1.5rem]" />
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <StatCard label="Courses" value={stats?.totalCourses ?? 0} detail="Available modules" />
                    <StatCard label="Lessons" value={stats?.totalLessons ?? 0} detail="Catalog depth" />
                    <StatCard label="Completion" value={`${completionSummary}%`} detail="Across all courses" />
                  </div>
                  <LearningProgressBar value={completionSummary} />
                  <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/8 p-4 text-sm text-slate-300">
                    Completion is calculated from your lesson progress across all courses.
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    XP earned from learning: {stats?.totalXpEarned ?? 0}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    Adaptive level: {analytics?.profile?.adaptiveLevel || 'beginner'} · Focus: {analytics?.profile?.quizFocus || 'guided practice'}
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      {error ? (
        <div className="rounded-[1.75rem] border border-rose-400/20 bg-rose-500/10 p-5 text-sm text-rose-200">
          <div>{error}</div>
          <button type="button" onClick={loadCourses} className="mt-3 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10">
            Retry
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const active = activeCategory === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? 'border-cyan-400/30 bg-cyan-400/10 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              {category}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {status === 'loading' && !courses.length
          ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-96 rounded-[2rem]" />)
          : filteredCourses.map((course) => <LearningCourseCard key={course.id} course={course} />)}
      </div>

      {analytics ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Adaptive intelligence</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Recommended next lessons</h2>
              </div>
              <Link to="/learn/analytics" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
                Open dashboard
              </Link>
            </div>
            <div className="mt-5 space-y-3">
              {(analytics.recommendedNextLessons || []).slice(0, 3).map((lesson) => (
                <div key={lesson.id} className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.3em] text-slate-500">{lesson.courseTitle}</div>
                      <h3 className="mt-2 text-lg font-semibold text-white">{lesson.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{lesson.reason}</p>
                    </div>
                    <Link to={`/learn/lesson/${lesson.id}`} className="rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110">
                      Continue
                    </Link>
                  </div>
                </div>
              ))}
              {!analytics.recommendedNextLessons?.length ? (
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-sm text-slate-400">Finish a few lessons and quizzes to activate personalized recommendations.</div>
              ) : null}
            </div>
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Learning signals</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <StatCard label="Streak" value={`${analytics.stats?.streak || 0} days`} detail="Momentum in the learning loop" />
              <StatCard label="Quiz accuracy" value={`${analytics.stats?.quizAccuracy || 0}%`} detail="Average across learning quizzes" />
              <StatCard label="Weak topics" value={analytics.weakTopics?.length || 0} detail="Prioritized for review" />
              <StatCard label="Strong topics" value={analytics.strongTopics?.length || 0} detail="Ready for deeper study" />
            </div>
          </Card>
        </div>
      ) : null}

      {!filteredCourses.length && status !== 'loading' ? (
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
          No courses match this category yet.
        </div>
      ) : null}
    </motion.div>
  );
}