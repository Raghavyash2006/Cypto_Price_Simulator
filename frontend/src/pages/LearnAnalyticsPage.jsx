import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Chart from 'chart.js/auto';
import { motion } from 'framer-motion';
import Card from '../components/common/Card';
import Skeleton from '../components/common/Skeleton';
import { fetchLearnAnalytics } from '../services/learnApi';

const PERIOD_OPTIONS = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' }
];

function destroyChart(chartRef) {
  if (chartRef.current) {
    chartRef.current.destroy();
    chartRef.current = null;
  }
}

function StatCard({ label, value, detail }) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
      <div className="text-xs uppercase tracking-[0.35em] text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm text-slate-400">{detail}</div>
    </div>
  );
}

export default function LearnAnalyticsPage() {
  const [period, setPeriod] = useState('30d');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const completionChartRef = useRef(null);
  const xpChartRef = useRef(null);
  const completionChart = useRef(null);
  const xpChart = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchLearnAnalytics({ period });
        if (!cancelled) setAnalytics(data);
      } catch (fetchError) {
        if (!cancelled) {
          setAnalytics(null);
          setError(fetchError?.response?.data?.message || 'Unable to load learning analytics');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [period]);

  useEffect(() => {
    destroyChart(completionChart);
    destroyChart(xpChart);

    if (!analytics) return undefined;

    const completionGraph = Array.isArray(analytics.completionGraph) ? analytics.completionGraph : [];
    const xpHistory = Array.isArray(analytics.xpHistory) ? analytics.xpHistory : [];

    if (completionChartRef.current) {
      completionChart.current = new Chart(completionChartRef.current, {
        type: 'line',
        data: {
          labels: completionGraph.map((entry) => entry.label),
          datasets: [
            {
              label: 'Average completion',
              data: completionGraph.map((entry) => entry.averageCompletion),
              borderColor: '#22d3ee',
              backgroundColor: 'rgba(34, 211, 238, 0.12)',
              fill: true,
              tension: 0.35,
              pointRadius: 2
            },
            {
              label: 'Completed lessons',
              data: completionGraph.map((entry) => entry.completedLessons),
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              fill: false,
              tension: 0.25,
              pointRadius: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#cbd5e1' } } },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.08)' } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.08)' } }
          }
        }
      });
    }

    if (xpChartRef.current) {
      xpChart.current = new Chart(xpChartRef.current, {
        type: 'bar',
        data: {
          labels: xpHistory.map((entry) => entry.label),
          datasets: [
            {
              label: 'XP history',
              data: xpHistory.map((entry) => entry.xp),
              backgroundColor: 'rgba(34, 197, 94, 0.75)',
              borderRadius: 10
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.08)' } }
          }
        }
      });
    }

    return () => {
      destroyChart(completionChart);
      destroyChart(xpChart);
    };
  }, [analytics]);

  const safeAnalytics = useMemo(() => ({
    profile: {
      adaptiveLevel: 'beginner',
      explanationStyle: 'simplified',
      quizFocus: 'guided practice',
      score: 0,
      xp: 0,
      streak: 0,
      completionRate: 0,
      quizAccuracy: 0,
      portfolioRisk: 0,
      ...(analytics?.profile || {})
    },
    stats: {
      totalCourses: 0,
      totalLessons: 0,
      completedLessons: 0,
      totalXpEarned: 0,
      courseCompletion: 0,
      streak: 0,
      quizAccuracy: 0,
      recentAccuracy: 0,
      portfolioRisk: 0,
      quizAttempts: 0,
      completedCourses: 0,
      ...(analytics?.stats || {})
    },
    weakTopics: Array.isArray(analytics?.weakTopics) ? analytics.weakTopics : [],
    strongTopics: Array.isArray(analytics?.strongTopics) ? analytics.strongTopics : [],
    recommendedNextLessons: Array.isArray(analytics?.recommendedNextLessons) ? analytics.recommendedNextLessons : [],
    achievements: Array.isArray(analytics?.achievements) ? analytics.achievements : [],
    leaderboard: Array.isArray(analytics?.leaderboard) ? analytics.leaderboard : [],
    personalizedRecommendation: analytics?.personalizedRecommendation || {
      summary: 'Analytics are loading.',
      whyThisLevel: '',
      nextStep: '',
      focusTopics: [],
      quickPlan: []
    }
  }), [analytics]);

  if (loading && !analytics) {
    return <Skeleton className="h-[75vh] rounded-[2.5rem]" />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="space-y-6">
      <div className="glass-panel-strong rounded-[2.75rem] p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">Learning analytics</p>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Adaptive learning intelligence tuned to your progress, streak, and portfolio behavior.</h1>
            <p className="max-w-2xl text-base leading-7 text-slate-400">
              The dashboard blends lesson completion, quiz accuracy, streak momentum, and portfolio signals to recommend the right next step.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/learn" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
                Back to catalog
              </Link>
              <Link
                to={`/learn/quiz?level=${safeAnalytics.profile.adaptiveLevel}`}
                className="rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110"
              >
                Start adaptive quiz
              </Link>
            </div>
          </div>

          <Card className="border-white/10 bg-slate-950/50">
            <div className="space-y-4">
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">Adaptive profile</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">{safeAnalytics.profile.adaptiveLevel} track</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard label="Score" value={safeAnalytics.profile.score} detail="Composite adaptive score" />
                <StatCard label="Quiz accuracy" value={`${safeAnalytics.stats.quizAccuracy}%`} detail="Learning quiz average" />
                <StatCard label="Streak" value={`${safeAnalytics.stats.streak} days`} detail="Momentum signal" />
                <StatCard label="XP earned" value={safeAnalytics.stats.totalXpEarned} detail="Learning contribution" />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {error ? <div className="rounded-[1.75rem] border border-rose-400/20 bg-rose-500/10 p-5 text-sm text-rose-200">{error}</div> : null}

      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setPeriod(option.value)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${period === option.value ? 'border-cyan-400/30 bg-cyan-400/10 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Courses" value={safeAnalytics.stats.totalCourses} detail="Tracked modules" />
        <StatCard label="Lessons" value={safeAnalytics.stats.totalLessons} detail="Catalog depth" />
        <StatCard label="Completed lessons" value={safeAnalytics.stats.completedLessons} detail="Learning momentum" />
        <StatCard label="Portfolio risk" value={safeAnalytics.stats.portfolioRisk} detail="Behavior signal used for adaptation" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <h2 className="text-xl font-semibold text-white">Completion graph</h2>
          <p className="mt-1 text-sm text-slate-400">Lesson completion and average completion over time.</p>
          <div className="mt-5 h-72">
            <canvas ref={completionChartRef} />
          </div>
        </Card>

        <Card>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Personalized recommendations</h2>
            <p className="text-sm leading-6 text-slate-400">{safeAnalytics.personalizedRecommendation.summary}</p>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">{safeAnalytics.personalizedRecommendation.whyThisLevel}</div>
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm text-cyan-50">{safeAnalytics.personalizedRecommendation.nextStep}</div>
            {safeAnalytics.personalizedRecommendation.focusTopics.length ? (
              <div className="flex flex-wrap gap-2">
                {safeAnalytics.personalizedRecommendation.focusTopics.map((topic) => (
                  <span key={topic} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-300">
                    {topic}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <h2 className="text-xl font-semibold text-white">XP history</h2>
          <p className="mt-1 text-sm text-slate-400">Learning XP earned from lessons and quizzes.</p>
          <div className="mt-5 h-72">
            <canvas ref={xpChartRef} />
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-white">Weak and strong topics</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.35em] text-rose-300">Weak topics</div>
              {safeAnalytics.weakTopics.length ? safeAnalytics.weakTopics.map((topic) => (
                <div key={topic.id} className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
                  <div className="text-sm font-semibold text-white">{topic.title}</div>
                  <div className="mt-1 text-xs text-rose-100">Score {topic.learningScore} · {topic.quizAccuracy}% quiz accuracy</div>
                </div>
              )) : <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">No obvious weak topics yet.</div>}
            </div>
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.35em] text-emerald-300">Strong topics</div>
              {safeAnalytics.strongTopics.length ? safeAnalytics.strongTopics.map((topic) => (
                <div key={topic.id} className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                  <div className="text-sm font-semibold text-white">{topic.title}</div>
                  <div className="mt-1 text-xs text-emerald-100">Score {topic.learningScore} · {topic.completion}% completion</div>
                </div>
              )) : <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">Continue learning to reveal strong topics.</div>}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <h2 className="text-xl font-semibold text-white">Recommended next lessons</h2>
          <p className="mt-1 text-sm text-slate-400">Each recommendation uses your adaptive profile, not just raw progress.</p>
          <div className="mt-5 space-y-3">
            {safeAnalytics.recommendedNextLessons.length ? safeAnalytics.recommendedNextLessons.map((lesson) => (
              <div key={lesson.id} className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-500">{lesson.courseTitle}</div>
                    <h3 className="mt-2 text-lg font-semibold text-white">{lesson.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{lesson.reason}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link to={`/learn/lesson/${lesson.id}`} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
                      Open lesson
                    </Link>
                    <Link to={`/learn/quiz?lessonId=${lesson.id}&level=${lesson.recommendedQuizLevel}`} className="rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110">
                      Adaptive quiz
                    </Link>
                  </div>
                </div>
              </div>
            )) : <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-sm text-slate-400">No pending lessons. You are close to finishing the current catalog.</div>}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-semibold text-white">Learning badges</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {safeAnalytics.achievements.length ? safeAnalytics.achievements.map((badge) => (
                <span key={badge.id} className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs uppercase tracking-[0.25em] text-amber-100">
                  {badge.title}
                </span>
              )) : <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">No learning badges unlocked yet.</div>}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold text-white">Learning leaderboard</h2>
            <div className="mt-4 space-y-3">
              {safeAnalytics.leaderboard.length ? safeAnalytics.leaderboard.map((row) => (
                <div key={row.userId} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Rank {row.rank}</div>
                      <div className="mt-1 text-base font-semibold text-white">{row.name}</div>
                    </div>
                    <div className="text-lg font-semibold text-cyan-200">{Math.round(row.learningScore)} pts</div>
                  </div>
                  <div className="mt-3 text-xs uppercase tracking-[0.25em] text-slate-500">{row.completedLessons} lessons · {row.quizAverage}% quiz avg</div>
                </div>
              )) : <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">No leaderboard data yet.</div>}
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
