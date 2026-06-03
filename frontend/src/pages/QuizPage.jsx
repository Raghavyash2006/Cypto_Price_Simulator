import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Skeleton from '../components/common/Skeleton';
import {
  createQuiz,
  getQuiz,
  getQuizAnalytics,
  getQuizLeaderboard,
  getQuizzes,
  submitQuiz
} from '../services/quizApi';

const defaultFilters = { level: '', category: '', search: '' };

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const remaining = (total % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
}

function toneClass(level) {
  if (level === 'advanced') return 'border-rose-400/30 bg-rose-500/10 text-rose-100';
  if (level === 'intermediate') return 'border-amber-400/30 bg-amber-500/10 text-amber-100';
  return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100';
}

function resultTone(isCorrect) {
  return isCorrect
    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
    : 'border-rose-400/30 bg-rose-500/10 text-rose-100';
}

export default function QuizPage() {
  const [filters, setFilters] = useState(defaultFilters);
  const [catalog, setCatalog] = useState({ quizzes: [], tags: { levels: [], categories: [] } });
  const [leaderboard, setLeaderboard] = useState([]);
  const [analytics, setAnalytics] = useState({ recentAttempts: [], aggregate: [] });
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizProgress, setQuizProgress] = useState(null);
  const [status, setStatus] = useState('library');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [remaining, setRemaining] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [result, setResult] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [loadingSideRail, setLoadingSideRail] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const autoSubmittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setLoadingCatalog(true);
      try {
        const data = await getQuizzes(filters);
        if (cancelled) return;
        setCatalog(data);
        setSelectedQuizId((current) => {
          if (current && data.quizzes.some((quiz) => String(quiz._id) === String(current))) {
            return current;
          }
          return data.quizzes[0]?._id || '';
        });
      } catch (error) {
        if (!cancelled) {
          setCatalog({ quizzes: [], tags: { levels: [], categories: [] } });
        }
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    }

    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  useEffect(() => {
    let cancelled = false;

    async function loadSideRail() {
      setLoadingSideRail(true);
      try {
        const [leaderboardData, analyticsData] = await Promise.all([getQuizLeaderboard({ limit: 5 }), getQuizAnalytics()]);
        if (cancelled) return;
        setLeaderboard(leaderboardData.leaderboard || []);
        setAnalytics(analyticsData || { recentAttempts: [], aggregate: [] });
      } catch (error) {
        if (!cancelled) {
          setLeaderboard([]);
          setAnalytics({ recentAttempts: [], aggregate: [] });
        }
      } finally {
        if (!cancelled) setLoadingSideRail(false);
      }
    }

    loadSideRail();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== 'running') return undefined;

    const timer = window.setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [status, activeQuiz?._id]);

  useEffect(() => {
    if (status !== 'running') return;
    if (remaining > 0) return;
    if (!activeQuiz || autoSubmittingRef.current) return;
    void handleSubmit();
  }, [remaining, status, activeQuiz]);

  async function refreshSideRail() {
    try {
      const [leaderboardData, analyticsData] = await Promise.all([getQuizLeaderboard({ limit: 5 }), getQuizAnalytics()]);
      setLeaderboard(leaderboardData.leaderboard || []);
      setAnalytics(analyticsData || { recentAttempts: [], aggregate: [] });
    } catch {
      // Keep the current side rail state if refresh fails.
    }
  }

  async function startQuiz(quizId) {
    if (!quizId) return;
    setLoadingQuiz(true);
    try {
      const data = await getQuiz(quizId);
      setActiveQuiz(data.quiz);
      setQuizProgress(data.progress);
      setCurrentIndex(0);
      setAnswers({});
      setResult(null);
      setStartedAt(new Date().toISOString());
      setRemaining(data.quiz.timeLimitSeconds || 300);
      setStatus('running');
      autoSubmittingRef.current = false;
    } finally {
      setLoadingQuiz(false);
    }
  }

  async function startGeneratedQuiz() {
    setLoadingQuiz(true);
    try {
      const payload = {
        level: filters.level || 'beginner',
        category: filters.category || 'wallet safety',
        focus: filters.search || filters.category || 'crypto fundamentals',
        count: 5
      };
      const created = await createQuiz(payload);
      await startQuiz(created.quiz._id);
    } finally {
      setLoadingQuiz(false);
    }
  }

  function toggleAnswer(optionIndex) {
    if (!activeQuiz || status !== 'running') return;
    const question = activeQuiz.questions[currentIndex];
    setAnswers((current) => {
      const existing = current[currentIndex] || [];
      if (question.multiSelect) {
        const hasOption = existing.includes(optionIndex);
        const next = hasOption ? existing.filter((value) => value !== optionIndex) : [...existing, optionIndex];
        return { ...current, [currentIndex]: next };
      }
      return { ...current, [currentIndex]: [optionIndex] };
    });
  }

  function moveQuestion(direction) {
    if (!activeQuiz) return;
    setCurrentIndex((value) => {
      const next = value + direction;
      return Math.max(0, Math.min(next, activeQuiz.questions.length - 1));
    });
  }

  async function handleSubmit() {
    if (!activeQuiz || submitting || autoSubmittingRef.current) return;
    autoSubmittingRef.current = true;
    setSubmitting(true);

    const completedAt = new Date().toISOString();
    const timeSpentSeconds = Math.max(0, (activeQuiz.timeLimitSeconds || 300) - remaining);
    const payloadAnswers = activeQuiz.questions.map((question, index) => ({
      questionIndex: index,
      selectedAnswers: answers[index] || []
    }));

    try {
      const data = await submitQuiz({
        quizId: activeQuiz._id,
        answers: payloadAnswers,
        startedAt,
        completedAt,
        timeSpentSeconds
      });
      setResult(data);
      setQuizProgress(data.progress);
      setStatus('results');
      await refreshSideRail();
    } finally {
      setSubmitting(false);
      autoSubmittingRef.current = false;
    }
  }

  function resetToLibrary() {
    setStatus('library');
    setActiveQuiz(null);
    setResult(null);
    setCurrentIndex(0);
    setAnswers({});
    setRemaining(0);
    setStartedAt(null);
  }

  const currentQuestion = activeQuiz?.questions?.[currentIndex];
  const selectedAnswers = answers[currentIndex] || [];
  const totalQuestions = activeQuiz?.questions?.length || 0;
  const answeredQuestions = Object.keys(answers).length;
  const progressPercent = totalQuestions ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
  const timerPercent = activeQuiz?.timeLimitSeconds ? Math.round((remaining / activeQuiz.timeLimitSeconds) * 100) : 0;
  const resultAnswers = result?.attempt?.answers || [];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.25),_transparent_32%),linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(3,7,18,0.94))] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)] md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-300">Crypto quiz arena</p>
            <h1 className="text-4xl font-semibold text-white md:text-5xl">Timed quizzes that reward real crypto knowledge.</h1>
            <p className="max-w-xl text-sm leading-7 text-slate-300">
              Pick a beginner, intermediate, or advanced quiz, race the clock, and earn XP when you complete the review.
              AI-generated quizzes are available when you want a fresh challenge.
            </p>
          </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[28rem] lg:grid-cols-3">
            <div className="glass-panel rounded-2xl p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Catalog</p>
              <p className="mt-2 text-2xl font-semibold text-white">{catalog.quizzes.length}</p>
            </div>
            <div className="glass-panel rounded-2xl p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Leaderboard</p>
              <p className="mt-2 text-2xl font-semibold text-white">{leaderboard.length}</p>
            </div>
            <div className="glass-panel rounded-2xl p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Quiz time</p>
              <p className="mt-2 text-2xl font-semibold text-white">{activeQuiz ? formatTime(remaining) : '05:00'}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.24)] backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-amber-300">Quiz library</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Choose a quiz or generate a fresh AI challenge.</h2>
              </div>
              <button
                type="button"
                onClick={startGeneratedQuiz}
                disabled={loadingQuiz}
                className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingQuiz ? 'Preparing quiz...' : 'Generate AI quiz'}
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <input
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Search topics"
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <select
                value={filters.level}
                onChange={(event) => setFilters((current) => ({ ...current, level: event.target.value }))}
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="">All levels</option>
                {catalog.tags.levels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
              <select
                value={filters.category}
                onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="">All categories</option>
                {catalog.tags.categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {status === 'library' && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.24)] backdrop-blur"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-400">{loadingCatalog ? 'Loading quiz catalog...' : `${catalog.quizzes.length} ready-to-play quizzes`}</p>
                  <h3 className="mt-1 text-xl font-semibold text-white">Available quizzes</h3>
                </div>
                <button
                  type="button"
                  onClick={() => startQuiz(selectedQuizId)}
                  disabled={!selectedQuizId || loadingQuiz}
                  className="rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Start selected quiz
                </button>
              </div>

              {loadingCatalog ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-40 rounded-[1.5rem]" />
                  ))}
                </div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                <AnimatePresence>
                  {catalog.quizzes.map((quiz) => {
                    const isSelected = String(quiz._id) === String(selectedQuizId);
                    return (
                      <motion.button
                        key={quiz._id}
                        type="button"
                        whileHover={{ y: -4 }}
                        onClick={() => setSelectedQuizId(quiz._id)}
                        className={`rounded-[1.5rem] border p-4 text-left transition ${
                          isSelected ? 'border-amber-400/40 bg-amber-500/10 shadow-glow' : 'border-white/10 bg-slate-950/50 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] ${toneClass(quiz.level)}`}>
                            {quiz.level}
                          </span>
                          <span className="text-xs uppercase tracking-[0.25em] text-slate-500">{quiz.category}</span>
                        </div>
                        <h4 className="mt-4 text-lg font-semibold text-white">{quiz.title}</h4>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {quiz.questionCount || quiz.questions?.length || 0} questions · {formatTime(quiz.timeLimitSeconds || 300)} limit · {quiz.completed ? 'completed' : 'fresh challenge'}
                        </p>
                        <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
                          <span>{quiz.progress || 0}% progress</span>
                          <span>{quiz.aiGenerated ? 'AI generated' : 'Seeded'}</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
                </div>
              )}
            </motion.section>
          )}

          {status === 'running' && activeQuiz && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.24)] backdrop-blur"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-amber-300">Live quiz</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">{activeQuiz.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {activeQuiz.category} · {activeQuiz.level} · {activeQuiz.questions.length} questions
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-center">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Time left</p>
                    <p className={`mt-1 text-2xl font-semibold ${remaining <= 30 ? 'text-rose-300' : 'text-white'}`}>{formatTime(remaining)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-center">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Answered</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{answeredQuestions}/{totalQuestions}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400"
                  animate={{ width: `${timerPercent}%` }}
                  transition={{ ease: 'linear', duration: 0.4 }}
                />
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-5">
                  <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
                    <span>Question {currentIndex + 1} of {totalQuestions}</span>
                    <span>{progressPercent}% completed</span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-500">
                    <span>{currentQuestion?.topic || activeQuiz.category || 'Crypto fundamentals'}</span>
                    <span className="text-slate-600">/</span>
                    <span>{currentQuestion?.difficulty || activeQuiz.level || 'beginner'}</span>
                  </div>

                  <h4 className="mt-3 text-2xl font-semibold leading-tight text-white">
                    {currentQuestion?.question?.trim() || 'Question text unavailable. Generate another quiz to continue.'}
                  </h4>

                  <div className="mt-5 grid gap-3">
                    {(currentQuestion?.options || []).map((option, optionIndex) => {
                      const isActive = selectedAnswers.includes(optionIndex);
                      return (
                        <button
                          key={`${option}-${optionIndex}`}
                          type="button"
                          onClick={() => toggleAnswer(optionIndex)}
                          className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                            isActive
                              ? 'border-amber-400/40 bg-amber-500/10 text-white'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                          }`}
                        >
                          <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs font-semibold">{String.fromCharCode(65 + optionIndex)}</span>
                          {option}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => moveQuestion(-1)}
                      disabled={currentIndex === 0}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestion(1)}
                      disabled={currentIndex >= totalQuestions - 1}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSubmit()}
                      disabled={submitting}
                      className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? 'Submitting...' : 'Finish quiz'}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Question map</p>
                      <span className="text-xs text-slate-400">{selectedAnswers.length ? 'Answered' : 'Empty'}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-5 gap-2">
                      {activeQuiz.questions.map((question, index) => {
                        const hasAnswer = Boolean((answers[index] || []).length);
                        const isActive = index === currentIndex;
                        return (
                          <button
                            key={question._id || index}
                            type="button"
                            onClick={() => setCurrentIndex(index)}
                            className={`rounded-xl border px-3 py-2 text-sm transition ${
                              isActive
                                ? 'border-amber-400/40 bg-amber-500/10 text-white'
                                : hasAnswer
                                  ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                                  : 'border-white/10 bg-white/5 text-slate-300'
                            }`}
                          >
                            {index + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Hint</p>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {currentQuestion?.hint || 'Use the topic, level, and question wording to reason it out. Multi-select questions are marked only after review.'}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Progress</p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400"
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ ease: 'easeOut', duration: 0.35 }}
                      />
                    </div>
                    <p className="mt-3 text-sm text-slate-400">
                      You have answered {answeredQuestions} of {totalQuestions} questions.
                    </p>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {status === 'results' && result && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.24)] backdrop-blur"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-amber-300">Results</p>
                  <h3 className="mt-2 text-3xl font-semibold text-white">{result.attempt.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {result.attempt.category} · {result.attempt.level} · {result.attempt.isPassed ? 'passed' : 'review recommended'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetToLibrary}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
                >
                  Back to library
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <div className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Score</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{result.attempt.score}</p>
                </div>
                <div className="rounded-[1.5rem] border border-amber-400/20 bg-amber-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-amber-100">Accuracy</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{result.attempt.percentage}%</p>
                </div>
                <div className="rounded-[1.5rem] border border-sky-400/20 bg-sky-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-sky-100">XP earned</p>
                  <p className="mt-2 text-3xl font-semibold text-white">+{result.attempt.xpAwarded}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Time used</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{formatTime(result.attempt.durationSeconds)}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.75fr]">
                <div className="space-y-3">
                  {resultAnswers.map((item) => (
                    <div key={item.questionIndex} className={`rounded-[1.5rem] border p-4 ${resultTone(item.correct)}`}>
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] opacity-70">Question {item.questionIndex + 1}</p>
                          <h4 className="mt-2 text-lg font-semibold text-white">{item.question}</h4>
                        </div>
                        <span className="rounded-full border border-current px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em]">
                          {item.correct ? 'Correct' : 'Wrong'}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-2 text-sm text-slate-200 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Your answer</p>
                          <p className="mt-2 leading-6">
                            {(item.selectedAnswers || []).length
                              ? item.selectedAnswers.map((index) => item.options[index]).filter(Boolean).join(', ')
                              : 'No answer submitted'}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Correct answer</p>
                          <p className="mt-2 leading-6">
                            {(item.correctAnswers || []).map((index) => item.options[index]).filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-slate-200/90">
                        {item.explanation || 'No explanation was provided for this question.'}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Quiz progress</p>
                    <div className="mt-4 space-y-3 text-sm text-slate-300">
                      <div className="flex items-center justify-between"><span>Attempts</span><span>{result.progress.totalAttempts}</span></div>
                      <div className="flex items-center justify-between"><span>Passed</span><span>{result.progress.passedAttempts}</span></div>
                      <div className="flex items-center justify-between"><span>Average score</span><span>{result.progress.averagePercentage}%</span></div>
                      <div className="flex items-center justify-between"><span>Total XP</span><span>{result.progress.totalXp}</span></div>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Your current quiz stats</p>
                    <div className="mt-4 space-y-3 text-sm text-slate-300">
                      <div className="flex items-center justify-between"><span>Completion rate</span><span>{quizProgress?.completionRate ?? 0}%</span></div>
                      <div className="flex items-center justify-between"><span>Average accuracy</span><span>{quizProgress?.averagePercentage ?? 0}%</span></div>
                      <div className="flex items-center justify-between"><span>Quiz attempts</span><span>{quizProgress?.totalAttempts ?? 0}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.24)] backdrop-blur">
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300">Leaderboard</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Top quiz performers</h3>
            <div className="mt-4 space-y-3">
              {loadingSideRail ? (
                <p className="text-sm text-slate-400">Loading leaderboard...</p>
              ) : leaderboard.length ? (
                leaderboard.map((row) => (
                  <div key={row.userId} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Rank {row.rank}</p>
                        <h4 className="mt-1 text-base font-semibold text-white">{row.name || row.username}</h4>
                      </div>
                      <p className="text-lg font-semibold text-amber-200">{row.totalXp} XP</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                      <span>Best {Math.round(row.bestPercentage || 0)}%</span>
                      <span>{row.attempts} attempts</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">Complete a few quizzes to populate the leaderboard.</p>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.24)] backdrop-blur">
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300">Analytics</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Recent quiz activity</h3>
            <div className="mt-4 space-y-3">
              {(analytics?.recentAttempts || []).length ? (
                analytics.recentAttempts.map((attempt) => (
                  <div key={attempt._id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{attempt.quiz?.title || attempt.title}</p>
                    <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
                      <span>{attempt.user?.name || attempt.user?.username || 'Quiz attempt'}</span>
                      <span>{attempt.percentage}%</span>
                    </div>
                    <div className="mt-2 text-xs uppercase tracking-[0.25em] text-slate-500">
                      {attempt.quiz?.level || attempt.level} · +{attempt.xpAwarded} XP
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No analytics yet. Finish a quiz to generate activity.</p>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.24)] backdrop-blur">
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300">Notes</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <li>Timed quizzes automatically submit when the countdown hits zero.</li>
              <li>Answer review cards reveal the correct options only after submission.</li>
              <li>AI-generated quizzes follow the same scoring and XP path as seeded quizzes.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
