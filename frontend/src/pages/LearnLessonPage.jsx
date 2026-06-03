import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Card from '../components/common/Card';
import Skeleton from '../components/common/Skeleton';
import LessonAITeacherPanel from '../components/learning/LessonAITeacherPanel';
import LearningProgressBar from '../components/learning/LearningProgressBar';
import { fetchLearnLesson, saveLearnProgress } from '../services/learnApi';

function formatMinutes(minutes) {
  return `${Number(minutes || 0)} min`;
}

export default function LearnLessonPage() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [adaptive, setAdaptive] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('loading');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [previousLesson, setPreviousLesson] = useState(null);
  const [nextLesson, setNextLesson] = useState(null);

  async function loadLesson() {
    setStatus('loading');
    setError('');
    setSaveMessage('');
    try {
      const data = await fetchLearnLesson(id);
      setCourse(data.course || null);
      setLesson(data.lesson || null);
      setAdaptive(data.adaptive || null);
      setProgress(data.lesson?.completionPercentage ?? 0);
      setPreviousLesson(data.previousLesson || null);
      setNextLesson(data.nextLesson || null);
      setStatus('succeeded');
    } catch (fetchError) {
      setError(fetchError?.response?.data?.message || 'Unable to load lesson');
      setStatus('failed');
    }
  }

  useEffect(() => {
    void loadLesson();
  }, [id]);

  const lessonProgress = Number(progress) || 0;
  const contentParagraphs = useMemo(() => String(lesson?.content || '').trim().split(/\n\n+/).filter(Boolean), [lesson?.content]);
  const lessonSummary = lesson?.summary || lesson?.description || contentParagraphs[0] || 'This lesson is ready for review once the content loads.';
  const keyConcepts = lesson?.keyConcepts?.length ? lesson.keyConcepts : lesson?.takeaways || [];
  const readingMinutes = lesson?.estimatedReadingMinutes || Math.max(3, Math.round((String(lesson?.content || '').split(/\s+/).filter(Boolean).length || 0) / 180));

  async function handleSaveProgress() {
    if (!lesson?.id) {
      return;
    }

    setSaving(true);
    setSaveMessage('');
    try {
      const result = await saveLearnProgress({ lessonId: lesson.id, completionPercentage: 100, completed: true });
      setCourse(result.course || course);
      setLesson((current) =>
        current
          ? {
              ...current,
              completionPercentage: result.lesson?.completionPercentage ?? 100,
              completed: result.lesson?.completed ?? true,
              xpEarned: result.lesson?.xpEarned ?? current.xpEarned
            }
          : current
      );
      setProgress(result.lesson?.completionPercentage ?? 100);
      setSaveMessage(result.xpDelta > 0 ? `Lesson completed. +${result.xpDelta} XP earned.` : 'Lesson completed.');
    } catch (saveError) {
      setSaveMessage(saveError?.response?.data?.message || 'Unable to save progress');
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading' && !lesson) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[18rem] rounded-[2.5rem]" />
        <div className="grid gap-6 lg:grid-cols-[1.55fr_0.85fr]">
          <Skeleton className="h-[28rem] rounded-[2rem]" />
          <Skeleton className="h-[28rem] rounded-[2rem]" />
        </div>
      </div>
    );
  }

  if (!lesson || !course) {
    return (
      <div className="glass-panel-strong rounded-[2.75rem] p-8 text-center sm:p-12">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Lesson unavailable</p>
        <h1 className="mt-4 text-3xl font-black text-white">We could not load this lesson.</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-400">
          The lesson may have been removed or is still syncing. You can return to the course catalog and continue from another lesson.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/learn" className="rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-4 py-2 text-sm font-semibold text-slate-950">
            Back to catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="space-y-6">
      {error ? (
        <div className="rounded-[1.75rem] border border-rose-400/20 bg-rose-500/10 p-5 text-sm text-rose-200">
          <div>{error}</div>
          <button type="button" onClick={loadLesson} className="mt-3 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10">
            Retry
          </button>
        </div>
      ) : null}

      <div className="glass-panel-strong rounded-[2.75rem] p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.35em] text-cyan-300">
              <Link to={`/learn/course/${course.id}`}>{course.title}</Link>
              <span className="text-slate-500">/</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] tracking-[0.3em] text-cyan-200">{lesson.difficulty}</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">{lesson.title}</h1>
            <p className="text-base leading-7 text-slate-400">{lesson.description || lessonSummary}</p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Reading {formatMinutes(readingMinutes)}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">+{lesson.xpReward} XP</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">{lesson.completed ? 'Completed' : 'In progress'}</span>
            </div>
          </div>

          <div className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">Completion</div>
            <div className="mt-3 text-3xl font-semibold text-white">{lessonProgress}%</div>
            <LearningProgressBar value={lessonProgress} className="mt-4" />
            <p className="mt-3 text-sm leading-6 text-slate-400">Mark this lesson complete when you finish the content. Progress is stored in MongoDB and contributes to course completion.</p>
            <button
              type="button"
              onClick={handleSaveProgress}
              disabled={saving || lesson.completed}
              className="mt-5 w-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Saving…' : lesson.completed ? 'Completed' : 'Mark as Complete'}
            </button>
            <Link
              to={`/learn/quiz?lessonId=${lesson.id}&level=${adaptive?.quizLevel || lesson.difficulty}`}
              className="mt-3 block w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Take adaptive AI quiz
            </Link>
            <div className="mt-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/8 p-4 text-sm text-slate-300">
              Adaptive mode: {adaptive?.level || 'beginner'} · {adaptive?.explanationStyle || 'simplified'} explanations
            </div>
            {saveMessage ? <div className="mt-3 text-sm text-slate-300">{saveMessage}</div> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.55fr_0.85fr]">
        <Card as="motion">
          <div className="space-y-5">
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">Lesson content</div>
              <h2 className="mt-2 text-2xl font-semibold text-white">Study notes</h2>
            </div>

            <div className="rounded-[1.5rem] border border-cyan-400/15 bg-cyan-400/8 p-4">
              <div className="text-xs uppercase tracking-[0.35em] text-cyan-200">Summary</div>
              <p className="mt-3 text-sm leading-7 text-slate-200">{lessonSummary}</p>
            </div>

            <div className="prose prose-invert max-w-none prose-p:leading-7 prose-p:text-slate-300 prose-headings:text-white prose-strong:text-white prose-a:text-cyan-300">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.content || lesson.summary || lesson.description || 'Content is not available yet.'}</ReactMarkdown>
            </div>

            {keyConcepts.length ? (
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
                <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Highlighted key concepts</div>
                <div className="mt-3 flex flex-wrap gap-3">
                  {keyConcepts.map((concept) => (
                    <span key={concept} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {lesson.takeaways?.length ? (
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
                <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Summary section</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {lesson.takeaways.map((takeaway) => (
                    <div key={takeaway} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                      {takeaway}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Card>

        <div className="space-y-6">
          <Card as="motion">
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">Lesson navigation</div>
              <div className="grid gap-3">
                <Link to={`/learn/course/${course.id}`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                  Back to course
                </Link>
                <Link to={`/learn/quiz?lessonId=${lesson.id}`} className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15">
                  Start lesson quiz
                </Link>
                {previousLesson ? (
                  <Link to={`/learn/lesson/${previousLesson.id}`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                    Previous lesson: {previousLesson.title}
                  </Link>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-500">No previous lesson</div>
                )}
                {nextLesson ? (
                  <Link to={`/learn/lesson/${nextLesson.id}`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                    Next lesson: {nextLesson.title}
                  </Link>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-500">No next lesson</div>
                )}
              </div>
            </div>
          </Card>

          <Card as="motion">
            <div className="space-y-4">
              <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">XP reward</div>
              <div className="text-3xl font-semibold text-white">+{lesson.xpReward} XP</div>
              <p className="text-sm leading-6 text-slate-400">This lesson contributes to your learning score and updates your MongoDB progress record when marked complete.</p>
              {adaptive ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  Recommended next difficulty: {adaptive.quizLevel}
                </div>
              ) : null}
            </div>
          </Card>

          <Card as="motion">
            <div className="space-y-4">
              <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">Course progress</div>
              <div className="text-2xl font-semibold text-white">{course.completionPercentage}%</div>
              <LearningProgressBar value={course.completionPercentage} />
              <div className="text-sm text-slate-400">{course.completedLessons}/{course.lessonCount} lessons complete</div>
              <div className="text-sm text-slate-300">XP earned from learning: {course.earnedXp || 0}</div>
            </div>
          </Card>
        </div>
      </div>

      <LessonAITeacherPanel lesson={lesson} course={course} />
    </motion.div>
  );
}