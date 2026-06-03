import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Card from '../components/common/Card';
import Skeleton from '../components/common/Skeleton';
import { loadGamificationLeaderboard } from '../features/gamification/gamificationSlice';
import { getSocket } from '../services/socket';

export default function LeaderboardPage() {
  const dispatch = useDispatch();
  const { leaderboard, leaderboardStatus } = useSelector((state) => state.gamification);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState('xp');

  useEffect(() => {
    const limit = sortMode === 'profit' || sortMode === 'growth' ? 20 : 50;
    dispatch(loadGamificationLeaderboard({ limit, sortBy: sortMode }));
  }, [dispatch, sortMode]);

  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    const handlePortfolioUpdate = () => {
      const limit = sortMode === 'profit' || sortMode === 'growth' ? 20 : 50;
      dispatch(loadGamificationLeaderboard({ limit, sortBy: sortMode }));
    };

    socket.on('portfolio:update', handlePortfolioUpdate);

    return () => {
      socket.off('portfolio:update', handlePortfolioUpdate);
    };
  }, [dispatch, sortMode]);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = [...leaderboard].filter((row) => {
      if (!query) return true;
      return [row.username, row.name, row.level].some((value) => String(value || '').toLowerCase().includes(query));
    });

    return rows;
  }, [leaderboard, search, sortMode]);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Community ranks</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Interactive leaderboard</h1>
            <p className="mt-1 text-sm text-slate-400">Search by name, sort by XP, streak, or referrals, and compare your rank in real time.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'xp', label: 'XP' },
              { key: 'streak', label: 'Streak' },
              { key: 'referrals', label: 'Referrals' },
              { key: 'profit', label: 'Profit' },
              { key: 'growth', label: 'Growth' }
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSortMode(option.key)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  sortMode === option.key ? 'border-cyan-400/30 bg-cyan-400/15 text-cyan-200' : 'border-white/10 bg-white/5 text-slate-300'
                }`}
              >
                Sort by {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search users, levels, or usernames"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none placeholder:text-slate-500"
          />
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
            {leaderboardStatus === 'loading' ? 'Loading ranks…' : `${visibleRows.length} players`}
          </div>
        </div>
      </Card>

      {leaderboardStatus === 'loading' ? (
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <Card>
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-24 rounded-2xl" />
              ))}
            </div>
          </Card>

          <Card>
            <Skeleton className="h-8 w-36" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <div className="space-y-3">
            {visibleRows.map((row, index) => (
              <div
                key={row.id || row.username}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-sm font-black text-slate-950">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-white">{row.name}</div>
                    <div className="text-sm text-slate-400">
                      @{row.username} • {row.level} • {row.badgeCount} badges
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-right text-sm text-slate-300">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-500">XP</div>
                    <div className="font-semibold text-white">{row.xp.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Streak</div>
                    <div className="font-semibold text-white">{row.streak}d</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Referrals</div>
                    <div className="font-semibold text-white">{row.referralCount}</div>
                  </div>
                </div>
                {(sortMode === 'profit' || sortMode === 'growth') && (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 sm:mt-0">
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Portfolio performance</div>
                    <div className={`mt-1 font-semibold ${sortMode === 'profit' ? (row.profitLoss >= 0 ? 'text-emerald-300' : 'text-rose-300') : (row.profitLossPct >= 0 ? 'text-emerald-300' : 'text-rose-300')}`}>
                      {sortMode === 'profit' ? `${row.profitLoss?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0} USD` : `${Number(row.profitLossPct || 0).toFixed(2)}%`}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {!visibleRows.length && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                No matching leaderboard entries were found.
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-white">Ranking rules</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">XP is the primary rank signal.</div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">Streaks and referrals are visible tie-breakers.</div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">Profit and growth modes surface the strongest portfolio performers.</div>
          </div>
        </Card>
        </div>
      )}
    </div>
  );
}