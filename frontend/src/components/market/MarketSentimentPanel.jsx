import { memo } from 'react';
import { motion } from 'framer-motion';

function clamp(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function gaugeColor(score) {
  if (score >= 70) return 'from-emerald-400 to-cyan-300';
  if (score <= 30) return 'from-rose-400 to-amber-300';
  return 'from-amber-400 to-cyan-300';
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function MarketSentimentPanel({ sentiment, riskWarnings = [], events = [] }) {
  const fearGreed = sentiment?.sentiment?.fearGreed || sentiment?.fearGreed || { score: 50, classification: 'Neutral' };
  const btcDominance = sentiment?.sentiment?.btcDominance ?? sentiment?.btcDominance ?? 0;
  const volatilityScore = sentiment?.sentiment?.volatilityScore ?? sentiment?.volatilityScore ?? 0;
  const bullishBias = sentiment?.sentiment?.bullishBias ?? sentiment?.bullishBias ?? 50;
  const summary = sentiment?.sentiment?.summary || sentiment?.summary || 'Market intelligence will appear here once the feed loads.';
  const explanations = sentiment?.sentiment?.explanations || sentiment?.explanations || {};

  return (
    <div className="glass-panel rounded-[2.5rem] p-6 sm:p-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Market intelligence</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Sentiment, dominance, and AI context</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400">A beginner-friendly read on what the broader crypto market is doing right now and how that may affect your positions.</p>
        </div>

        <motion.div whileHover={{ y: -2 }} className={`rounded-[1.8rem] border border-white/10 bg-gradient-to-br ${gaugeColor(clamp(fearGreed.score))} p-[1px]`}>
          <div className="rounded-[1.7rem] bg-slate-950/90 px-5 py-4 text-center backdrop-blur-xl">
            <div className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Fear & Greed</div>
            <div className="mt-2 text-4xl font-black text-white">{clamp(fearGreed.score)}</div>
            <div className="mt-1 text-sm text-slate-300">{fearGreed.classification || 'Neutral'}</div>
          </div>
        </motion.div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">BTC dominance</p>
          <div className="mt-2 text-2xl font-black text-white">{formatPercent(btcDominance)}</div>
          <p className="mt-2 text-sm text-slate-400">{explanations.dominance || 'BTC dominance helps show whether the market is rotating toward Bitcoin or altcoins.'}</p>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Volatility</p>
          <div className="mt-2 text-2xl font-black text-white">{Math.round(clamp(volatilityScore))}/100</div>
          <p className="mt-2 text-sm text-slate-400">{explanations.volatility || 'Higher volatility means bigger swings and more careful position sizing.'}</p>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Bullish bias</p>
          <div className="mt-2 text-2xl font-black text-white">{formatPercent(bullishBias)}</div>
          <p className="mt-2 text-sm text-slate-400">{explanations.sentiment || 'Bullish bias compares how much of the tape is leaning toward gains versus losses.'}</p>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">AI summary</p>
          <p className="mt-2 line-clamp-6 text-sm leading-6 text-slate-300">{summary}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-5">
          <p className="text-[10px] uppercase tracking-[0.35em] text-amber-300">Risk warnings</p>
          <div className="mt-4 space-y-3">
            {riskWarnings.length ? riskWarnings.map((warning) => (
              <div key={warning} className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                {warning}
              </div>
            )) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">No portfolio risk warnings right now.</div>
            )}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-5">
          <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-300">Market events</p>
          <div className="mt-4 space-y-3">
            {events.length ? events.slice(0, 5).map((event) => (
              <div key={event.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-semibold text-white">{event.title}</div>
                <div className="mt-1 text-sm leading-6 text-slate-400">{event.message}</div>
              </div>
            )) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">No recent market events yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(MarketSentimentPanel);