import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Loader2, RefreshCcw, Send, Sparkles, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { clearMentorHistory, getMentorSession, sendMentorMessage } from '../../services/mentorApi';

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-300 [animation-delay:-0.2s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-300 [animation-delay:-0.1s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-lime-300" />
    </div>
  );
}

function PlainTextFallback({ content }) {
  const text = String(content || '');
  const urlPattern = /(https?:\/\/[^\s)]+)|(www\.[^\s)]+)/gi;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = urlPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const rawUrl = match[0];
    const href = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    parts.push(
      <a key={`${rawUrl}-${match.index}`} href={href} target="_blank" rel="noreferrer" className="text-cyan-300 underline decoration-cyan-400/50 underline-offset-2">
        {rawUrl}
      </a>
    );
    lastIndex = match.index + rawUrl.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <div className="whitespace-pre-wrap leading-7 text-slate-100">{parts.length ? parts : text}</div>;
}

function SafeMarkdown({ content }) {
  try {
    return (
      <div className="ai-markdown space-y-3">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="leading-7 text-slate-100">{children}</p>,
            ul: ({ children }) => <ul className="ml-4 list-disc space-y-2 text-slate-200">{children}</ul>,
            ol: ({ children }) => <ol className="ml-4 list-decimal space-y-2 text-slate-200">{children}</ol>,
            li: ({ children }) => <li className="leading-7">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
            em: ({ children }) => <em className="italic text-slate-100">{children}</em>,
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-300 underline decoration-cyan-400/50 underline-offset-2 transition hover:text-cyan-200"
              >
                {children}
              </a>
            ),
            code: ({ inline, children }) =>
              inline ? (
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-[0.82em] text-cyan-200">{children}</code>
              ) : (
                <code className="block overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/90 p-4 text-[0.85em] leading-6 text-cyan-100">
                  {children}
                </code>
              ),
            pre: ({ children }) => <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/90 p-0">{children}</pre>,
            h1: ({ children }) => <h1 className="text-base font-semibold text-white">{children}</h1>,
            h2: ({ children }) => <h2 className="text-sm font-semibold text-white">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-semibold text-cyan-100">{children}</h3>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-cyan-400/40 pl-3 text-slate-300">{children}</blockquote>
            )
          }}
        >
          {content || ' '}
        </ReactMarkdown>
      </div>
    );
  } catch (error) {
    console.error('Markdown rendering failed', error);
    return <PlainTextFallback content={content} />;
  }
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-7 shadow-lg ${
          isUser
            ? 'rounded-tr-md bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 text-slate-950 shadow-cyan-500/20'
            : 'rounded-tl-md border border-white/10 bg-slate-950/72 text-slate-100 backdrop-blur'
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : message.streaming ? (
          <TypingDots />
        ) : (
          <SafeMarkdown content={message.content} />
        )}
      </div>
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function MentorChatPanel({ compact = false, onClose, className = '' }) {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [activePrompt, setActivePrompt] = useState(null);
  const [lastFailedMessage, setLastFailedMessage] = useState('');
  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  const normalizeMessages = (data) => {
    if (Array.isArray(data?.messages) && data.messages.length) {
      return data.messages.map((message, index) => ({
        id: `${message.role}-${message.createdAt || index}-${index}`,
        role: message.role,
        content: message.content,
        streaming: false
      }));
    }

    if (Array.isArray(data?.history) && data.history.length) {
      return data.history.flatMap((turn, index) => [
        {
          id: `user-${turn._id || index}`,
          role: 'user',
          content: turn.message,
          streaming: false
        },
        {
          id: `assistant-${turn._id || index}`,
          role: 'assistant',
          content: turn.response,
          streaming: false
        }
      ]);
    }

    return [];
  };

  const applySession = (data) => {
    setSession(data);
    setMessages(normalizeMessages(data));
  };

  useEffect(() => {
    const loadSession = async () => {
      try {
        setIsLoading(true);
        const data = await getMentorSession();
        applySession(data);
        setError(null);
      } catch (loadError) {
        console.error('Unable to load AI mentor session', loadError);
        setError(loadError.message || 'Unable to load mentor session');
        toast.error(loadError.message || 'Unable to load mentor session');
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isStreaming]);

  const suggestedPrompts = session?.suggestedPrompts || [];
  const quickStats = session?.quickStats || {};
  const portfolio = session?.portfolio || {};
  const market = session?.market || {};
  const conversationTitle = 'AI Trading Mentor';

  const marketHighlights = useMemo(() => market.topCoins || [], [market.topCoins]);

  const refreshSession = async () => {
    const data = await getMentorSession();
    applySession(data);
  };

  const sendMessage = async (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed || isStreaming) return;

    setInput('');
    setActivePrompt(null);
    setError(null);
    setLastFailedMessage('');

    const assistantId = `assistant-${Date.now()}`;
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', content: trimmed, streaming: false },
      { id: assistantId, role: 'assistant', content: '', streaming: true }
    ]);

    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);

    try {
      const result = await sendMentorMessage({ message: trimmed, signal: controller.signal });
      const reply = result?.reply || result?.turn?.response || 'The mentor response is temporarily unavailable.';

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId ? { ...message, content: reply, streaming: false } : message
        )
      );

      if (result?.session) {
        applySession(result.session);
      } else {
        await refreshSession();
      }

      toast.success('AI mentor response ready');
    } catch (sendError) {
      const fallbackMessage = 'I could not generate a live answer right now. Please try again in a moment.';
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: fallbackMessage,
                streaming: false
              }
            : message
        )
      );
      setError(sendError.message || 'Unable to send message');
      setLastFailedMessage(trimmed);
      toast.error(sendError.message || 'Unable to send message');
    } finally {
      setIsStreaming(false);
    }
  };

  const retryLastMessage = async () => {
    if (!lastFailedMessage) return;
    await sendMessage(lastFailedMessage);
  };

  const clearChat = async () => {
    try {
      await clearMentorHistory();
      setMessages([]);
      setSession((current) => ({
        ...current,
        history: [],
        messages: [],
        quickStats: {
          ...(current?.quickStats || {}),
          conversationTurns: 0
        }
      }));
      setLastFailedMessage('');
      toast.success('Chat history cleared');
    } catch (clearError) {
      toast.error(clearError.message || 'Unable to clear history');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await sendMessage(input);
  };

  const wrapperClass = compact
    ? 'flex h-[min(78vh,760px)] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] shadow-[0_30px_100px_-40px_rgba(15,23,42,0.95)]'
    : 'grid min-h-[78vh] gap-6 overflow-hidden rounded-[2.4rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.99))] p-5 shadow-[0_40px_120px_-40px_rgba(15,23,42,0.95)] lg:grid-cols-[1.45fr_0.95fr]';

  const summaryCards = [
    { label: 'Cash balance', value: portfolio.summary?.virtualBalance || '$0' },
    { label: 'Portfolio value', value: portfolio.summary?.totalValue || '$0' },
    { label: 'P/L', value: portfolio.summary?.profitLoss || '$0' },
    { label: 'Risk', value: portfolio.risk?.riskScore != null ? `${Number(portfolio.risk.riskScore).toFixed(0)}/100` : 'n/a' }
  ];

  return (
    <div className={`${wrapperClass} ${className}`}>
      <div className="flex min-h-0 flex-col overflow-hidden rounded-[1.9rem] border border-white/10 bg-slate-950/60">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">AI trading mentor</p>
            <h1 className="mt-1 text-2xl font-bold text-white">{conversationTitle}</h1>
            <p className="mt-1 text-sm text-slate-400">Beginner-friendly guidance, portfolio analysis, risk warnings, and market summaries.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              {isStreaming ? 'Thinking' : 'Ready'}
            </span>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/5"
              >
                Close
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 p-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="flex min-h-0 flex-col rounded-[1.6rem] border border-white/10 bg-slate-950/50">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.3em] text-slate-400">
              <span className="inline-flex items-center gap-2"><Bot className="h-3.5 w-3.5" /> Conversation history</span>
              <div className="flex items-center gap-3">
                <span>{messages.length} messages</span>
                <button
                  type="button"
                  onClick={clearChat}
                  disabled={!messages.length || isLoading}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear chat
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {isLoading ? (
                <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  <div className="h-4 w-40 rounded-full bg-white/10" />
                  <div className="h-4 w-full rounded-full bg-white/10" />
                  <div className="h-4 w-4/5 rounded-full bg-white/10" />
                </div>
              ) : messages.length ? (
                messages.map((message) => <MessageBubble key={message.id} message={message} />)
              ) : (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  Ask about crypto fundamentals, portfolio risk, market cap, or whether a coin looks too concentrated.
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSubmit} className="border-t border-white/10 p-4">
              <label className="sr-only" htmlFor="mentor-input">
                Ask the mentor
              </label>
              <textarea
                id="mentor-input"
                rows={compact ? 2 : 3}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about Bitcoin, diversification, risk, market cap, or your current portfolio..."
                className="w-full resize-none rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  {error ? <span className="text-rose-300">{error}</span> : 'Responses are generated securely through Gemini in the backend.'}
                </div>
                <div className="flex items-center gap-2">
                  {lastFailedMessage ? (
                    <button
                      type="button"
                      onClick={retryLastMessage}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
                    >
                      <RefreshCcw className="h-4 w-4" /> Retry
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    disabled={isStreaming || !input.trim()}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {isStreaming ? 'Thinking…' : 'Send'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <aside className="space-y-4 rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
            <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Suggested prompts</p>
                <Sparkles className="h-4 w-4 text-cyan-300" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setActivePrompt(prompt);
                      setInput(prompt);
                    }}
                    className={`rounded-full border px-3 py-2 text-left text-xs font-medium transition hover:-translate-y-0.5 ${
                      activePrompt === prompt
                        ? 'border-cyan-400/30 bg-cyan-400/15 text-cyan-100'
                        : 'border-white/10 bg-white/5 text-slate-300'
                    }`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4">
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">Market summary</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {market.global?.activeCryptocurrencies
                  ? `Tracking ${market.global.activeCryptocurrencies} active cryptocurrencies across the market. `
                  : 'Live market conditions are being tracked for context-aware guidance. '}
                The mentor blends this with your portfolio risk and recent trades.
              </p>
              <div className="mt-4 space-y-2">
                {marketHighlights.slice(0, 3).map((coin) => (
                  <div key={`${coin.name}-${coin.symbol}`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                    <div>
                      <div className="font-semibold text-white">{coin.name}</div>
                      <div className="text-xs text-slate-400">{coin.symbol}</div>
                    </div>
                    <div className="text-right text-xs text-slate-300">
                      <div>{coin.price ? `$${Number(coin.price).toLocaleString()}` : 'n/a'}</div>
                      <div>{Number(coin.change24h || 0).toFixed(2)}% 24h</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4">
              <p className="text-xs uppercase tracking-[0.35em] text-violet-300">Portfolio snapshot</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {summaryCards.map((item) => (
                  <StatPill key={item.label} label={item.label} value={item.value} />
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <StatPill label="Conversation" value={String(quickStats.conversationTurns || 0)} />
              <StatPill label="Assets tracked" value={String(quickStats.marketCoinsTracked || 0)} />
            </div>
          </aside>
        </div>
      </div>

      {!compact ? null : (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatPill label="Prompt chips" value={String(suggestedPrompts.length)} />
          <StatPill label="Recent trades" value={String(quickStats.recentTrades || 0)} />
          <StatPill label="Market highlights" value={String(marketHighlights.length)} />
        </div>
      )}
    </div>
  );
}

export default memo(MentorChatPanel);
