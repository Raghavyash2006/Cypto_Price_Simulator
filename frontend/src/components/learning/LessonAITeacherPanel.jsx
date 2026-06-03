import { memo, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Card from '../common/Card';
import {
  askLearnTeacherExamples,
  askLearnTeacherExplain,
  askLearnTeacherSummarize
} from '../../services/learnApi';

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 text-slate-400">
      <span className="text-sm">Thinking</span>
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-300 [animation-delay:-0.2s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-300 [animation-delay:-0.1s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-amber-300" />
      </span>
    </div>
  );
}

function safeMessage(error) {
  return error?.response?.data?.message || error?.message || 'Unable to generate a learning response';
}

function LessonAITeacherPanel({ lesson, course }) {
  const [question, setQuestion] = useState('');
  const [responses, setResponses] = useState([]);
  const [loadingAction, setLoadingAction] = useState('');
  const [error, setError] = useState('');

  const canAsk = Boolean(lesson?.id && course?.id);
  const trimmedQuestion = useMemo(() => question.trim(), [question]);

  async function runAction(action) {
    if (!canAsk || loadingAction) return;

    setError('');
    setLoadingAction(action);

    try {
      const payload = { lessonId: lesson.id, question: trimmedQuestion };
      const result =
        action === 'summarize'
          ? await askLearnTeacherSummarize(payload)
          : action === 'examples'
            ? await askLearnTeacherExamples(payload)
            : await askLearnTeacherExplain(payload);

      const response = result?.response || {};
      const normalized = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        action: result?.action || action,
        title: response.title || 'AI teacher response',
        markdown: String(response.markdown || response.content || 'No response content available.'),
        keyTakeaways: Array.isArray(response.keyTakeaways) ? response.keyTakeaways : [],
        examples: Array.isArray(response.examples) ? response.examples : [],
        marketRelevance: response.marketRelevance || '',
        followUpQuestion: response.followUpQuestion || '',
        fallbackUsed: Boolean(result?.fallbackUsed)
      };

      setResponses((current) => [normalized, ...current].slice(0, 6));
      setQuestion('');
    } catch (aiError) {
      setError(safeMessage(aiError));
    } finally {
      setLoadingAction('');
    }
  }

  return (
    <Card as="motion">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">Ask AI Teacher</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Conversational learning support</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Ask for an explanation, summary, or real-world examples tailored to this lesson.
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-400">
            Gemini
          </div>
        </div>

        <div className="space-y-3 rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
          <label className="block space-y-2 text-sm text-slate-300">
            <span>Your question</span>
            <textarea
              rows={3}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask the AI teacher anything about this lesson..."
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/30 focus:ring-2 focus:ring-cyan-400/20"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => runAction('explain')}
              disabled={!canAsk || loadingAction === 'explain'}
              className="rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingAction === 'explain' ? 'Explaining…' : 'Explain lesson'}
            </button>
            <button
              type="button"
              onClick={() => runAction('summarize')}
              disabled={!canAsk || loadingAction === 'summarize'}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingAction === 'summarize' ? 'Summarizing…' : 'Summarize'}
            </button>
            <button
              type="button"
              onClick={() => runAction('examples')}
              disabled={!canAsk || loadingAction === 'examples'}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingAction === 'examples' ? 'Generating…' : 'Real-world examples'}
            </button>
          </div>

          {loadingAction ? <TypingIndicator /> : null}
          {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
        </div>

        {!responses.length && !loadingAction ? (
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
            No AI responses yet. Ask for an explanation, summary, or example to begin.
          </div>
        ) : null}

        <AnimatePresence initial={false}>
          {responses.map((response) => (
            <motion.div
              key={response.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4 shadow-[0_18px_50px_-24px_rgba(2,6,23,0.8)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">{response.action}</div>
                  <h3 className="mt-2 text-lg font-semibold text-white">{response.title}</h3>
                </div>
                {response.fallbackUsed ? (
                  <div className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-amber-200">
                    Fallback used
                  </div>
                ) : null}
              </div>

              <div className="prose prose-invert mt-4 max-w-none prose-p:leading-7 prose-p:text-slate-300 prose-headings:text-white prose-strong:text-white prose-li:text-slate-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{response.markdown}</ReactMarkdown>
              </div>

              {response.keyTakeaways.length ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Key takeaways</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {response.keyTakeaways.map((item) => (
                      <span key={item} className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs text-slate-200">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {response.examples.length ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Examples</div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {response.examples.map((item) => (
                      <li key={item} className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {response.marketRelevance ? (
                <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-400/8 p-3 text-sm text-slate-300">
                  <div className="text-xs uppercase tracking-[0.35em] text-cyan-200">Market relevance</div>
                  <p className="mt-2 leading-7">{response.marketRelevance}</p>
                </div>
              ) : null}

              {response.followUpQuestion ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-400">
                  {response.followUpQuestion}
                </div>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Card>
  );
}

export default memo(LessonAITeacherPanel);