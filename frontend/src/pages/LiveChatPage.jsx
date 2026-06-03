import { lazy, Suspense } from 'react';
import Skeleton from '../components/common/Skeleton';

const MentorChatPanel = lazy(() => import('../components/mentor/MentorChatPanel'));

function MentorChatFallback() {
  return (
    <div className="space-y-4 rounded-[2rem] border border-white/10 bg-slate-950/70 p-5">
      <Skeleton className="h-7 w-44" />
      <Skeleton className="h-28 rounded-[1.5rem]" />
      <Skeleton className="h-64 rounded-[1.5rem]" />
    </div>
  );
}

export default function LiveChatPage() {
  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">AI trading mentor</p>
        <h1 className="mt-2 text-4xl font-black text-white sm:text-5xl">Your finance coach, risk analyst, and market guide in one chat.</h1>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Ask for beginner explanations, portfolio analysis, diversification advice, market summaries, or a personalized next step.
        </p>
      </div>

      <Suspense fallback={<MentorChatFallback />}>
        <MentorChatPanel />
      </Suspense>
    </div>
  );
}