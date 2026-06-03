import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Card from '../components/common/Card';
import Skeleton from '../components/common/Skeleton';
import LearningProgressBar from '../components/learning/LearningProgressBar';
import { fetchLearnCourse, fetchLearnLesson } from '../services/learnApi';
import { fetchLearnQuizHistory, generateLearnQuiz, submitLearnQuiz } from '../services/learnQuizApi';

const LEVEL_OPTIONS = ['beginner', 'intermediate', 'advanced'];

function formatTime(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function getDefaultLevel(sourceLesson, sourceCourse) {
  return sourceLesson?.difficulty || sourceCourse?.difficulty || 'beginner';
}

function normalizeLevel(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'easy') return 'beginner';
  if (normalized === 'medium') return 'intermediate';
  if (normalized === 'hard') return 'advanced';
  return LEVEL_OPTIONS.includes(normalized) ? normalized : 'beginner';
}

export default function LearnQuizPage() {
  const [searchParams] = useSearchParams();
  const lessonId = searchParams.get('lessonId');
  const courseId = searchParams.get('courseId');
  const requestedLevel = normalizeLevel(searchParams.get('level'));

  const [sourceLesson, setSourceLesson] = useState(null);
  const [sourceCourse, setSourceCourse] = useState(null);
  const [history, setHistory] = useState({ attempts: [], quizzes: [], stats: { totalAttempts: 0, passedAttempts: 0, averagePercentage: 0, totalXp: 0, streakBonusXp: 0 } });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState('idle');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [result, setResult] = useState(null);
  const [level, setLevel] = useState(requestedLevel);
  const [count, setCount] = useState(5);

  const contextTitle = sourceLesson?.title || sourceCourse?.title || 'Crypto learning quiz';
  const contextDescription = sourceLesson?.summary || sourceLesson?.description || sourceCourse?.description || 'Generate a Gemini quiz tailored to the selected learning context.';

  useEffect(() => {
    if (!searchParams.get('level')) {
      setLevel(normalizeLevel(getDefaultLevel(sourceLesson, sourceCourse)));
    }
  }, [sourceLesson, sourceCourse, searchParams]);

  useEffect(() => {
    let ignore = false;

    async function loadContext() {
      if (!lessonId && !courseId) {
        setSourceLesson(null);
        setSourceCourse(null);
        return;
      }

      setLoadingContext(true);
      setError('');

      try {
        if (lessonId) {
          const lessonData = await fetchLearnLesson(lessonId);
          if (ignore) return;
          setSourceLesson(lessonData.lesson || null);
          setSourceCourse(lessonData.course || null);
        } else if (courseId) {
          const courseData = await fetchLearnCourse(courseId);
          if (ignore) return;
          setSourceCourse(courseData.course || null);
        }
      } catch (fetchError) {
        if (!ignore) {
          setError(fetchError?.response?.data?.message || 'Unable to load quiz context');
        }
      } finally {
        if (!ignore) setLoadingContext(false);
      }
    }

    void loadContext();

    return () => {
      ignore = true;
    };
  }, [lessonId, courseId]);

  useEffect(() => {
    let ignore = false;

    async function loadHistory() {
      setHistoryLoading(true);
      try {
        const data = await fetchLearnQuizHistory({ lessonId: lessonId || undefined, courseId: courseId || undefined, limit: 8 });
        if (!ignore) setHistory(data);
      } catch {
        if (!ignore) {
          setHistory({ attempts: [], quizzes: [], stats: { totalAttempts: 0, passedAttempts: 0, averagePercentage: 0, totalXp: 0, streakBonusXp: 0 } });
        }
      } finally {
        if (!ignore) setHistoryLoading(false);
      }
    }

    void loadHistory();

    return () => {
      ignore = true;
    };
  }, [lessonId, courseId]);

  useEffect(() => {
    if (status !== 'running' || !remainingSeconds) return undefined;

    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          void handleSubmit();
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [status, remainingSeconds]);

  const totalQuestions = quiz?.questions?.length || 0;
  const progressPercent = totalQuestions ? Math.round(((currentIndex + 1) / totalQuestions) * 100) : 0;
  const answeredCount = useMemo(() => Object.values(answers).filter((value) => (value || []).length).length, [answers]);
  const currentQuestion = quiz?.questions?.[currentIndex] || null;
  const timerPercent = quiz?.timeLimitSeconds ? Math.max(0, Math.round((remainingSeconds / quiz.timeLimitSeconds) * 100)) : 0;

  async function generateQuiz() {
    setGenerating(true);
    setError('');
    setResult(null);
    try {
      const data = await generateLearnQuiz({
        lessonId: lessonId || undefined,
        courseId: courseId || undefined,
        level,
        count
      });

      setQuiz(data.quiz || null);
      setAnswers({});
      setCurrentIndex(0);
      setStartedAt(new Date().toISOString());
      setRemainingSeconds(data.quiz?.timeLimitSeconds || 300);
      setStatus('running');
      setHistoryLoading(true);

      const historyData = await fetchLearnQuizHistory({ lessonId: lessonId || undefined, courseId: courseId || undefined, limit: 8 });
      setHistory(historyData);
    } catch (generateError) {
      setError(generateError?.response?.data?.message || 'Unable to generate quiz');
      setStatus('idle');
    } finally {
      setGenerating(false);
      setHistoryLoading(false);
    }
  }

  function toggleAnswer(optionIndex) {
    if (!currentQuestion) return;

    setAnswers((currentAnswers) => {
      const selected = Array.isArray(currentAnswers[currentIndex]) ? [...currentAnswers[currentIndex]] : [];

      if (currentQuestion.multiSelect) {
        const existingIndex = selected.indexOf(optionIndex);
        if (existingIndex >= 0) selected.splice(existingIndex, 1);
        else selected.push(optionIndex);
        return { ...currentAnswers, [currentIndex]: selected.sort((left, right) => left - right) };
      }

      return { ...currentAnswers, [currentIndex]: [optionIndex] };
    });
  }

  function moveQuestion(step) {
    if (!totalQuestions) return;
    setCurrentIndex((current) => Math.min(Math.max(current + step, 0), totalQuestions - 1));
  }

  async function handleSubmit() {
    if (!quiz?.id || submitting || status !== 'running') return;

    setSubmitting(true);
    setError('');
    try {
      const completedAt = new Date().toISOString();
      const submittedAnswers = quiz.questions.map((_, index) => ({ selectedAnswers: answers[index] || [] }));
      const quizId = quiz.id || quiz._id;
      const resultData = await submitLearnQuiz({
        quizId,
        answers: submittedAnswers,
        startedAt,
        completedAt,
        timeSpentSeconds: Math.max(0, Math.round((new Date(completedAt) - new Date(startedAt || completedAt)) / 1000))
      });

      setResult(resultData);
      setStatus('results');
      setRemainingSeconds(0);
      const historyData = await fetchLearnQuizHistory({ lessonId: lessonId || undefined, courseId: courseId || undefined, limit: 8 });
      setHistory(historyData);
    } catch (submitError) {
      setError(submitError?.response?.data?.message || 'Unable to submit quiz');
    } finally {
      setSubmitting(false);
    }
  }

  function resetQuiz() {
    setQuiz(null);
    setAnswers({});
    setCurrentIndex(0);
    setStatus('idle');
    setResult(null);
    setRemainingSeconds(0);
    setStartedAt(null);
  }

  if (loadingContext && !sourceLesson && !sourceCourse) {
    return <Skeleton className="h-[70vh] rounded-[2.5rem]" />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="space-y-6">
      {error ? (
        <div className="rounded-[1.75rem] border border-rose-400/20 bg-rose-500/10 p-5 text-sm text-rose-200">
          <div>{error}</div>
          <button type="button" onClick={() => setError('')} className="mt-3 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10">
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="glass-panel-strong rounded-[2.75rem] p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.35em] text-cyan-300">
              <span>Gemini quiz engine</span>
              <span className="text-slate-500">/</span>
              <span>{sourceLesson ? 'lesson context' : sourceCourse ? 'course context' : 'general challenge'}</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">{contextTitle}</h1>
            <p className="text-base leading-7 text-slate-400">{contextDescription}</p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">{lessonId ? 'Lesson tailored' : 'Course tailored'}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Gemini generated</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">{history.stats.totalAttempts} prior attempts</span>
            </div>
          </div>

          <div className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">Quiz settings</div>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Difficulty</span>
                <select
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                >
                  {LEVEL_OPTIONS.map((option) => (
                    <option key={option} value={option} className="bg-slate-950 text-white">
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Question count</span>
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={count}
                  onChange={(event) => setCount(Number(event.target.value))}
                  className="mt-3 w-full accent-cyan-400"
                />
                <div className="mt-2 text-sm text-slate-300">{count} questions</div>
              </label>

              <button
                type="button"
                onClick={() => void generateQuiz()}
                disabled={generating}
                className="w-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {generating ? 'Generating…' : quiz ? 'Regenerate quiz' : 'Generate Gemini quiz'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.55fr_0.85fr]">
        <div className="space-y-6">
          {status === 'idle' && !quiz ? (
            <Card>
              <div className="space-y-5">
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">Ready to generate</div>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Create an AI quiz from the selected learning material.</h2>
                </div>
                <p className="text-sm leading-7 text-slate-400">
                  Gemini will build a safe JSON quiz using the lesson or course context, then the same submission and XP pipeline will handle scoring, bonuses, and achievements.
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">Multiple choice</div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">True or false</div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">Scenario prompts</div>
                </div>
              </div>
            </Card>
          ) : null}

          {status === 'running' && quiz ? (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.24)] backdrop-blur"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Live quiz</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">{quiz.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {quiz.category} · {quiz.level} · {quiz.questionCount} questions
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-center">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Time left</p>
                    <p className={`mt-1 text-2xl font-semibold ${remainingSeconds <= 30 ? 'text-rose-300' : 'text-white'}`}>{formatTime(remainingSeconds)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-center">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Answered</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{answeredCount}/{totalQuestions}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400"
                  animate={{ width: `${timerPercent}%` }}
                  transition={{ ease: 'linear', duration: 0.4 }}
                />
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-5">
                  <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
                    <span>
                      Question {currentIndex + 1} of {totalQuestions}
                    </span>
                    <span>{progressPercent}% completed</span>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-200">
                      {currentQuestion?.questionType || 'multiple_choice'}
                    </span>
                    {currentQuestion?.multiSelect ? (
                      <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-amber-200">
                        multi select
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-500">
                    <span>{currentQuestion?.topic || 'General crypto learning'}</span>
                    <span className="text-slate-600">/</span>
                    <span>{currentQuestion?.difficulty || quiz?.level || 'beginner'}</span>
                  </div>

                  <h4 className="mt-3 text-2xl font-semibold leading-tight text-white">
                    {currentQuestion?.question?.trim() || 'Question text unavailable. Please generate the quiz again.'}
                  </h4>

                  <div className="mt-5 grid gap-3">
                    {(currentQuestion?.options || []).map((option, optionIndex) => {
                      const isSelected = (answers[currentIndex] || []).includes(optionIndex);
                      return (
                        <button
                          key={`${currentIndex}-${option}-${optionIndex}`}
                          type="button"
                          onClick={() => toggleAnswer(optionIndex)}
                          className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                            isSelected
                              ? 'border-cyan-400/40 bg-cyan-500/10 text-white'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                          }`}
                        >
                          <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs font-semibold">
                            {String.fromCharCode(65 + optionIndex)}
                          </span>
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
                      <span className="text-xs text-slate-400">{answeredCount ? 'Active' : 'Empty'}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-5 gap-2">
                      {quiz.questions.map((question, index) => {
                        const isActive = index === currentIndex;
                        const hasAnswer = Boolean((answers[index] || []).length);
                        return (
                          <button
                            key={question.id || index}
                            type="button"
                            onClick={() => setCurrentIndex(index)}
                            className={`rounded-xl border px-3 py-2 text-sm transition ${
                              isActive
                                ? 'border-cyan-400/40 bg-cyan-500/10 text-white'
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
                      {currentQuestion?.hint || 'Use the lesson context, the difficulty level, and the wording of the question to reason it out.'}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Progress</p>
                    <LearningProgressBar value={Math.max(0, Math.min(100, progressPercent))} className="mt-3" />
                    <p className="mt-3 text-sm text-slate-400">You have answered {answeredCount} of {totalQuestions} questions.</p>
                  </div>
                </div>
              </div>
            </motion.section>
          ) : null}

          {status === 'results' && result ? (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.24)] backdrop-blur"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Results</p>
                  <h3 className="mt-2 text-3xl font-semibold text-white">{result.attempt.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {result.attempt.category} · {result.attempt.level} · {result.attempt.isPassed ? 'passed' : 'review recommended'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={resetQuiz}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
                  >
                    New challenge
                  </button>
                  <Link to="/learn" className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5">
                    Back to learn
                  </Link>
                </div>
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
                  {result.attempt.answers?.map((item) => (
                    <div key={item.questionIndex} className={`rounded-[1.5rem] border p-4 ${item.correct ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-rose-400/20 bg-rose-500/10'}`}>
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

                      <p className="mt-3 text-sm leading-6 text-slate-200/90">{item.explanation || 'No explanation was provided for this question.'}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Rewards</p>
                    <div className="mt-4 space-y-3 text-sm text-slate-300">
                      <div className="flex items-center justify-between">
                        <span>Base bonus</span>
                        <span>+{result.rewards?.bonusXp || 0} XP</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Streak</span>
                        <span>{result.rewards?.streak || 0} day(s)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Achievements</span>
                        <span>{result.rewards?.achievements?.length || 0}</span>
                      </div>
                    </div>
                    {result.rewards?.achievements?.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {result.rewards.achievements.map((achievement) => (
                          <span key={achievement.id} className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-amber-100">
                            {achievement.title}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Quiz history</p>
                    <div className="mt-4 space-y-3">
                      {historyLoading ? (
                        <p className="text-sm text-slate-400">Loading history...</p>
                      ) : history.attempts.length ? (
                        history.attempts.map((attempt) => (
                          <div key={attempt.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{attempt.quiz?.title || attempt.title}</p>
                                <div className="mt-1 text-sm text-slate-300">{attempt.percentage}% · {attempt.isPassed ? 'passed' : 'review'}</div>
                              </div>
                              <p className="text-lg font-semibold text-cyan-200">+{attempt.xpAwarded} XP</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-400">No history yet. Generate and complete a quiz to populate this panel.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.24)] backdrop-blur">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Learning context</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{contextTitle}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">{contextDescription}</p>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="flex items-center justify-between"><span>Source</span><span>{lessonId ? 'Lesson' : courseId ? 'Course' : 'General'}</span></div>
              <div className="flex items-center justify-between"><span>Difficulty</span><span>{level}</span></div>
              <div className="flex items-center justify-between"><span>Questions</span><span>{count}</span></div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.24)] backdrop-blur">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">History stats</p>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="flex items-center justify-between"><span>Total attempts</span><span>{history.stats.totalAttempts}</span></div>
              <div className="flex items-center justify-between"><span>Passed</span><span>{history.stats.passedAttempts}</span></div>
              <div className="flex items-center justify-between"><span>Average score</span><span>{history.stats.averagePercentage}%</span></div>
              <div className="flex items-center justify-between"><span>XP earned</span><span>{history.stats.totalXp}</span></div>
              <div className="flex items-center justify-between"><span>Streak bonus</span><span>{history.stats.streakBonusXp}</span></div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.24)] backdrop-blur">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Navigation</p>
            <div className="mt-4 grid gap-3">
              <Link to="/learn" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Back to catalog
              </Link>
              {lessonId ? (
                <Link to={`/learn/lesson/${lessonId}`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                  Return to lesson
                </Link>
              ) : null}
              {courseId ? (
                <Link to={`/learn/course/${courseId}`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                  Return to course
                </Link>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </motion.div>
  );
}