import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { motion } from 'framer-motion';
import { getSocket } from '../../services/socket';
import { getPortfolioAnalytics } from '../../services/portfolioAnalyticsApi';
import { formatMoney, formatPercent, safeNumber } from '../../features/portfolio/formatters';
import Skeleton from '../common/Skeleton';

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

function StatPill({ label, value, tone = 'cyan' }) {
  const toneClass =
    tone === 'emerald'
      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
      : tone === 'rose'
        ? 'border-rose-400/20 bg-rose-400/10 text-rose-100'
        : tone === 'amber'
          ? 'border-amber-400/20 bg-amber-400/10 text-amber-100'
          : 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100';

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <div className="text-[10px] uppercase tracking-[0.35em] opacity-70">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

export default function PortfolioAnalyticsPanel() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('30d');
  const growthRef = useRef(null);
  const allocationRef = useRef(null);
  const performanceRef = useRef(null);
  const riskRef = useRef(null);
  const growthChartRef = useRef(null);
  const allocationChartRef = useRef(null);
  const performanceChartRef = useRef(null);
  const riskChartRef = useRef(null);
  const refreshTimerRef = useRef(null);

  const loadAnalytics = useCallback(async (selectedPeriod) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPortfolioAnalytics(selectedPeriod);
      setAnalytics(data);
    } catch {
      setAnalytics(null);
      setError('Analytics unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics(period);
  }, [loadAnalytics, period]);

  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    const handlePortfolioUpdate = () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = window.setTimeout(() => {
        void loadAnalytics(period);
      }, 750);
    };

    socket.on('portfolio:update', handlePortfolioUpdate);
    socket.on('transaction:new', handlePortfolioUpdate);

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
      socket.off('portfolio:update', handlePortfolioUpdate);
      socket.off('transaction:new', handlePortfolioUpdate);
    };
  }, [loadAnalytics, period]);

  useEffect(() => {
    destroyChart(growthChartRef);
    destroyChart(allocationChartRef);
    destroyChart(performanceChartRef);
    destroyChart(riskChartRef);

    if (!analytics) return undefined;

    const historical = Array.isArray(analytics.historical) ? analytics.historical : [];
    const allocation = Array.isArray(analytics.allocation) ? analytics.allocation : [];
    const performance = Array.isArray(analytics.performance) ? analytics.performance : [];
    const risk = analytics.risk || {};

    if (growthRef.current) {
      growthChartRef.current = new Chart(growthRef.current, {
        type: 'line',
        data: {
          labels: historical.map((entry) => entry.label),
          datasets: [
            {
              label: 'Portfolio value',
              data: historical.map((entry) => safeNumber(entry.value)),
              borderColor: '#22c55e',
              backgroundColor: 'rgba(34, 197, 94, 0.14)',
              fill: true,
              tension: 0.35,
              pointRadius: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.08)' } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.08)' } }
          }
        }
      });
    }

    if (allocationRef.current) {
      allocationChartRef.current = new Chart(allocationRef.current, {
        type: 'doughnut',
        data: {
          labels: allocation.map((entry) => entry.symbol),
          datasets: [
            {
              data: allocation.map((entry) => safeNumber(entry.marketValue)),
              backgroundColor: ['#f59e0b', '#22d3ee', '#a78bfa', '#34d399', '#fb7185', '#f97316', '#60a5fa', '#eab308'],
              borderWidth: 0,
              hoverOffset: 10
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#cbd5e1', boxWidth: 12 }
            }
          }
        }
      });
    }

    if (performanceRef.current) {
      performanceChartRef.current = new Chart(performanceRef.current, {
        type: 'bar',
        data: {
          labels: performance.map((entry) => entry.symbol),
          datasets: [
            {
              label: 'P/L %',
              data: performance.map((entry) => safeNumber(entry.profitLossPct)),
              backgroundColor: performance.map((entry) => (entry.profitLossPct >= 0 ? 'rgba(34, 197, 94, 0.75)' : 'rgba(248, 113, 113, 0.75)')),
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

    if (riskRef.current) {
      riskChartRef.current = new Chart(riskRef.current, {
        type: 'radar',
        data: {
          labels: ['Risk', 'Volatility', 'Drawdown', 'Diversification', 'Concentration'],
          datasets: [
            {
              label: 'Risk profile',
              data: [
                safeNumber(risk.riskScore),
                safeNumber(risk.volatilityScore),
                safeNumber(risk.drawdownScore),
                safeNumber(risk.diversificationScore),
                100 - safeNumber(risk.concentrationScore)
              ],
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.16)',
              pointBackgroundColor: '#f59e0b'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            r: {
              angleLines: { color: 'rgba(148, 163, 184, 0.18)' },
              grid: { color: 'rgba(148, 163, 184, 0.12)' },
              pointLabels: { color: '#cbd5e1' },
              ticks: { color: '#94a3b8', backdropColor: 'transparent' },
              suggestedMin: 0,
              suggestedMax: 100
            }
          }
        }
      });
    }

    return () => {
      destroyChart(growthChartRef);
      destroyChart(allocationChartRef);
      destroyChart(performanceChartRef);
      destroyChart(riskChartRef);
    };
  }, [analytics]);

  const safeAnalytics = useMemo(() => ({
    summary: {
      totalValue: 0,
      unrealizedPnL: 0,
      realizedPnL: 0,
      bestPerformer: null,
      worstPerformer: null,
      ...(analytics?.summary || {})
    },
    trading: {
      totalTrades: 0,
      buyCount: 0,
      sellCount: 0,
      winCount: 0,
      lossCount: 0,
      winLossRatio: 0,
      averageProfitPerTrade: 0,
      tradingFrequency: 0,
      realizedPnL: 0,
      closedTradeWinRate: 0,
      activeDays: 0,
      ...(analytics?.trading || {})
    },
    risk: {
      riskScore: 0,
      volatilityScore: 0,
      drawdownScore: 0,
      diversificationScore: 0,
      concentrationScore: 0,
      ...(analytics?.risk || {})
    },
    insights: {
      summary: 'Analytics are loading.',
      risks: [],
      opportunities: [],
      nextActions: [],
      ...(analytics?.insights || {})
    },
    historical: Array.isArray(analytics?.historical) ? analytics.historical : [],
    allocation: Array.isArray(analytics?.allocation) ? analytics.allocation : [],
    performance: Array.isArray(analytics?.performance) ? analytics.performance : [],
    tradeTimeline: Array.isArray(analytics?.tradeTimeline) ? analytics.tradeTimeline : [],
    period: analytics?.period || period
  }), [analytics, period]);

  const topAllocation = useMemo(() => safeAnalytics.allocation.slice(0, 3), [safeAnalytics.allocation]);
  const tradeTimeline = safeAnalytics.tradeTimeline;

  if (loading && !analytics) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-white">Portfolio analytics</h3>
          <p className="mt-1 text-sm text-slate-400">Loading live allocation, growth, and risk data...</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass-panel rounded-[1.75rem] p-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-4 h-64 w-full rounded-[1.5rem]" />
          </div>
          <div className="glass-panel rounded-[1.75rem] p-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="mt-4 h-64 w-full rounded-[1.5rem]" />
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-sm text-slate-400">Analytics will appear once your portfolio has holdings and transaction history.</div>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5 text-sm text-slate-300">
        <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Portfolio analytics</div>
        <div className="mt-2 text-white">{error}</div>
        <div className="mt-1 text-slate-400">The rest of the dashboard can continue to load normally.</div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Advanced analytics</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Portfolio analytics</h3>
          <p className="mt-1 text-sm text-slate-400">Interactive performance, allocation, trade cadence, and risk views with live refresh on trades.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                period === option.value ? 'border-cyan-400/30 bg-cyan-400/15 text-cyan-200' : 'border-white/10 bg-white/5 text-slate-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatPill label="Portfolio value" value={formatMoney(safeAnalytics.summary.totalValue)} tone="emerald" />
        <StatPill label="Unrealized P/L" value={formatMoney(safeAnalytics.summary.unrealizedPnL)} tone={safeAnalytics.summary.unrealizedPnL >= 0 ? 'emerald' : 'rose'} />
        <StatPill label="Realized P/L" value={formatMoney(safeAnalytics.summary.realizedPnL)} tone={safeAnalytics.summary.realizedPnL >= 0 ? 'emerald' : 'rose'} />
        <StatPill label="Win / loss" value={`${safeAnalytics.trading.winCount}/${safeAnalytics.trading.lossCount || 0}`} tone="amber" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatPill label="Trading frequency" value={`${safeAnalytics.trading.tradingFrequency} trades/week`} tone="cyan" />
        <StatPill label="Average profit / trade" value={formatMoney(safeAnalytics.trading.averageProfitPerTrade)} tone={safeAnalytics.trading.averageProfitPerTrade >= 0 ? 'emerald' : 'rose'} />
        <StatPill label="Closed trade win rate" value={formatPercent(safeAnalytics.trading.closedTradeWinRate)} tone="amber" />
        <StatPill label="Risk score" value={`${safeNumber(safeAnalytics.risk.riskScore)}/100`} tone={safeAnalytics.risk.riskScore <= 35 ? 'emerald' : safeAnalytics.risk.riskScore <= 65 ? 'amber' : 'rose'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="glass-panel rounded-[1.75rem] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Historical performance</p>
              <h4 className="mt-1 text-lg font-semibold text-white">Portfolio growth</h4>
            </div>
            <span className="text-xs text-slate-400">{safeAnalytics.period}</span>
          </div>
          <div className="mt-4 h-64">
            <canvas ref={growthRef} />
          </div>
        </div>

        <div className="glass-panel rounded-[1.75rem] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Asset allocation</p>
              <h4 className="mt-1 text-lg font-semibold text-white">Investment distribution</h4>
            </div>
            <span className="text-xs text-slate-400">Live allocation</span>
          </div>
          <div className="mt-4 h-64">
            <canvas ref={allocationRef} />
          </div>
        </div>

        <div className="glass-panel rounded-[1.75rem] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Profit / loss</p>
              <h4 className="mt-1 text-lg font-semibold text-white">Per-asset returns</h4>
            </div>
            <span className="text-xs text-slate-400">By holding</span>
          </div>
          <div className="mt-4 h-64">
            <canvas ref={performanceRef} />
          </div>
        </div>

        <div className="glass-panel rounded-[1.75rem] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Risk analysis</p>
              <h4 className="mt-1 text-lg font-semibold text-white">Portfolio exposure</h4>
            </div>
            <span className="text-xs text-slate-400">Risk score {safeNumber(safeAnalytics.risk.riskScore)}/100</span>
          </div>
          <div className="mt-4 h-64">
            <canvas ref={riskRef} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel rounded-[1.75rem] p-4">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">AI portfolio insights</p>
          <h4 className="mt-1 text-lg font-semibold text-white">Actionable guidance</h4>
          <p className="mt-3 text-sm leading-7 text-slate-300">{safeAnalytics.insights.summary}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Risks</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                {safeAnalytics.insights.risks.map((item) => (
                  <li key={item} className="rounded-2xl border border-white/10 bg-white/5 p-3">{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Next actions</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                {safeAnalytics.insights.nextActions.map((item) => (
                  <li key={item} className="rounded-2xl border border-white/10 bg-white/5 p-3">{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Trade timeline</p>
          <h4 className="mt-1 text-lg font-semibold text-white">Latest trade activity</h4>
          <div className="mt-4 space-y-3">
            {tradeTimeline.length ? tradeTimeline.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">{entry.coinName || entry.symbol || 'Trade'}</div>
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-500">{entry.label}</div>
                  </div>
                  <div className={`text-right text-sm font-semibold ${entry.realizedPnL >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {entry.type === 'sell' ? formatMoney(entry.realizedPnL) : formatMoney(entry.amount)}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-400">
                  <div>{entry.quantity} qty</div>
                  <div>{formatMoney(entry.unitPrice)} / unit</div>
                  <div>{new Date(entry.timestamp).toLocaleDateString()}</div>
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">No recent transactions yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Top holdings</p>
        <h4 className="mt-1 text-lg font-semibold text-white">Largest allocation drivers</h4>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {topAllocation.map((item) => (
            <div key={item.symbol} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-white">{item.symbol}</div>
                  <div className="text-xs text-slate-400">{item.coinName}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-white">{formatMoney(item.marketValue)}</div>
                  <div className={`text-xs ${item.profitLoss >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{formatPercent(item.allocationPct)} allocation</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Best</p>
            <p className="mt-1 font-semibold text-emerald-300">{safeAnalytics.summary.bestPerformer?.symbol || 'N/A'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Worst</p>
            <p className="mt-1 font-semibold text-rose-300">{safeAnalytics.summary.worstPerformer?.symbol || 'N/A'}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}