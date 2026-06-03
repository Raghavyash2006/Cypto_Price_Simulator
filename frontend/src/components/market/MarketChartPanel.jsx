import { memo, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { motion } from 'framer-motion';
import Skeleton from '../common/Skeleton';

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function MarketChartPanel({ coin, series = [], status = 'idle', error = null, onRetry, onAddToWatchlist, onOpenDetail }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !series.length) return undefined;

    const context = canvasRef.current.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(34, 211, 238, 0.35)');
    gradient.addColorStop(1, 'rgba(34, 211, 238, 0)');

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(context, {
      type: 'line',
      data: {
        labels: series.map(([timestamp]) => new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
        datasets: [
          {
            data: series.map(([, price]) => price),
            borderColor: '#22c55e',
            backgroundColor: gradient,
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 4,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
        scales: {
          x: { ticks: { color: '#94a3b8', maxTicksLimit: 6 }, grid: { display: false } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.10)' } }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [series]);

  if (status === 'loading' && !series.length) {
    return (
      <div className="glass-panel rounded-[2rem] p-5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-80 w-full rounded-[1.5rem]" />
      </div>
    );
  }

  if (!series.length && !error) {
    return (
      <motion.div whileHover={{ y: -3 }} className="glass-panel rounded-[2rem] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-300">Market chart</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{coin?.name || 'Select a coin'}</h3>
            <p className="mt-1 text-sm text-slate-400">Chart data is temporarily unavailable. Using market fallback data keeps this section visible.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Current price</p>
            <p className="mt-1 text-lg font-semibold text-white">{formatCurrency(coin?.current_price)}</p>
          </div>
        </div>
        <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-5 text-sm text-slate-400">
          The chart will reappear once a live or cached price series is available.
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div whileHover={{ y: -3 }} className="glass-panel rounded-[2rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-300">Market chart</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">{coin?.name || 'Select a coin'}</h3>
          <p className="mt-1 text-sm text-slate-400">7 day market price movement for the selected asset.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Current price</p>
          <p className="mt-1 text-lg font-semibold text-white">{formatCurrency(coin?.current_price)}</p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => onOpenDetail?.(coin)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10">
              View details
            </button>
            <button type="button" onClick={() => onAddToWatchlist?.(coin)} className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-500/20">
              Add to watchlist
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-[1.5rem] border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          <div>{error}</div>
          {onRetry ? (
            <button type="button" onClick={onRetry} className="mt-3 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10">
              Retry
            </button>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 h-80">
          <canvas ref={canvasRef} />
        </div>
      )}
    </motion.div>
  );
}

export default memo(MarketChartPanel);