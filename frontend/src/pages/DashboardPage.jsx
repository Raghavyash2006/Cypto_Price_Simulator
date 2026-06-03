import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import Card from '../components/common/Card';
import MetricCard from '../components/common/MetricCard';
import Skeleton from '../components/common/Skeleton';
import PortfolioAnalyticsPanel from '../components/charts/PortfolioAnalyticsPanel';
import LivePrices from '../components/dashboard/LivePrices';
import TransactionsList from '../components/dashboard/TransactionsList';
import Achievements from '../components/dashboard/Achievements';
import AIRecommendations from '../components/dashboard/AIRecommendations';
import NewsWidget from '../components/dashboard/NewsWidget';
import LeaderboardPreview from '../components/dashboard/LeaderboardPreview';
import MissionList from '../components/gamification/MissionList';
import RewardPopups from '../components/gamification/RewardPopups';
import XpProgressBar from '../components/gamification/XpProgressBar';
import {
  claimReward,
  claimStreak,
  clearLastReward,
  loadGamificationLeaderboard,
  loadGamificationOverview
} from '../features/gamification/gamificationSlice';
import { getSocket } from '../services/socket';

const buildRewardPopup = (reward, type) => ({
  key: `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  title: reward.title || (type === 'streak' ? 'Daily streak claimed' : 'Reward unlocked'),
  description: reward.description || `+${reward.rewardXp || reward.xpAward || 0} XP earned`,
  xpAward: reward.rewardXp || reward.xpAward || 0,
  icon: type === 'streak' ? '🔥' : '🏆'
});

export default function DashboardPage() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { overview, leaderboard, status, lastReward } = useSelector((state) => state.gamification);
  const [rewards, setRewards] = useState([]);
  const lastLevel = useRef(null);

  useEffect(() => {
    dispatch(loadGamificationOverview());
    dispatch(loadGamificationLeaderboard(5));
  }, [dispatch]);

  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    const refreshLeaderboard = () => {
      dispatch(loadGamificationLeaderboard(5));
      dispatch(loadGamificationOverview());
    };

    socket.on('portfolio:update', refreshLeaderboard);

    return () => {
      socket.off('portfolio:update', refreshLeaderboard);
    };
  }, [dispatch]);

  useEffect(() => {
    if (!lastReward) return;
    const popup = buildRewardPopup(lastReward, lastReward.type);
    setRewards((current) => [...current, popup]);
    const timer = window.setTimeout(() => {
      setRewards((current) => current.filter((reward) => reward.key !== popup.key));
      dispatch(clearLastReward());
    }, 4200);

    return () => window.clearTimeout(timer);
  }, [dispatch, lastReward]);

  useEffect(() => {
    if (overview?.level?.rank && lastLevel.current && overview.level.rank > lastLevel.current) {
      const popup = {
        key: `level-${Date.now()}`,
        title: `Level up to ${overview.level.title}`,
        description: `You reached rank ${overview.level.rank}. Keep pushing for the next tier.`,
        xpAward: 0,
        icon: '✦'
      };
      setRewards((current) => [
        ...current,
        popup
      ]);
      window.setTimeout(() => {
        setRewards((current) => current.filter((reward) => reward.key !== popup.key));
      }, 5000);
    }

    if (overview?.level?.rank) {
      lastLevel.current = overview.level.rank;
    }
  }, [overview?.level?.rank]);

  const metrics = useMemo(() => {
    if (!overview) {
      return [
        { label: 'Current XP', value: '—', delta: 'Loading' },
        { label: 'Virtual balance', value: '—', delta: 'Loading' },
        { label: 'Streak', value: '—', delta: 'Loading' }
      ];
    }

    return [
      { label: 'Current XP', value: overview.user.xp.toLocaleString(), delta: `Rank ${overview.level.rank}` },
      { label: 'Virtual balance', value: `$${overview.user.virtualBalance.toLocaleString()}`, delta: `${overview.user.referralCount} referrals` },
      { label: 'Streak', value: `${overview.user.streak} days`, delta: `${overview.summary.tradeCountToday} trades today` }
    ];
  }, [overview]);

  const handleStreakClaim = async () => {
    await dispatch(claimStreak()).unwrap();
    dispatch(loadGamificationOverview());
    dispatch(loadGamificationLeaderboard(5));
  };

  const handleRewardClaim = async (rewardType, reward) => {
    await dispatch(claimReward({ rewardType, rewardKey: reward.periodKey })).unwrap();
    dispatch(loadGamificationOverview());
    dispatch(loadGamificationLeaderboard(5));
  };

  const missions = overview?.missions || [];
  const challenges = overview?.challenges || [];
  const isLoadingOverview = !overview;

  return (
    <div className="space-y-6">
      {user && (
        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-r from-cyan-400/10 via-emerald-400/10 to-amber-300/10 p-5 shadow-[0_18px_60px_-28px_rgba(34,211,238,0.45)]">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-lg font-black text-slate-950">
              {user.avatar ? <img src={user.avatar} alt={user.name || user.username} className="h-full w-full object-cover" /> : (user.name || user.username || '?').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Signed in as</p>
              <h2 className="mt-1 text-2xl font-bold text-white">{user.name || user.username}</h2>
              <p className="text-sm text-slate-400">@{user.username} • {user.email}</p>
            </div>
          </div>
        </div>
      )}

      <RewardPopups rewards={rewards} />

      {overview?.level?.rank > 1 && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-cyan-400/10 via-emerald-400/10 to-lime-300/10 p-5 shadow-[0_20px_60px_-30px_rgba(34,197,94,0.5)]"
        >
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Level progression</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{overview.level.title} unlocked</h2>
          <p className="mt-1 text-sm text-slate-300">Level rewards, badges, and leaderboard placement are now tracking in real time.</p>
        </motion.div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {isLoadingOverview
          ? Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-4 h-10 w-40" />
                <Skeleton className="mt-4 h-8 w-24 rounded-full" />
              </Card>
            ))
          : metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </div>

      {overview && <XpProgressBar xp={overview.user.xp} level={overview.level} streak={overview.user.streak} />}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
        <div className="space-y-6">
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">Portfolio growth</h3>
                <p className="mt-1 text-sm text-slate-400">Track P/L, allocation, growth, risk, and AI insights in real time.</p>
              </div>
              <div className="text-sm text-slate-400">7 day</div>
            </div>
            <div className="mt-6">
              <PortfolioAnalyticsPanel />
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Daily missions</h3>
                <p className="mt-1 text-sm text-slate-400">Claim rewards as you trade and earn XP.</p>
              </div>
              <button
                type="button"
                onClick={handleStreakClaim}
                className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
              >
                Claim streak
              </button>
            </div>
            <div className="mt-5 grid gap-6 xl:grid-cols-2">
              <MissionList title="Daily missions" items={missions} onClaim={(item) => handleRewardClaim('daily', item)} />
              <MissionList title="Weekly challenges" items={challenges} onClaim={(item) => handleRewardClaim('weekly', item)} />
            </div>
          </Card>

          <Card>
            <h3 className="text-xl font-semibold text-white">Market trends</h3>
            <p className="mt-1 text-sm text-slate-400">Overview of top movers and market sentiment.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <LivePrices />
            </div>
          </Card>

          <Card>
            <h3 className="text-xl font-semibold text-white">Recent transactions</h3>
            <p className="mt-1 text-sm text-slate-400">Your latest simulated trades and rewards.</p>
            <div className="mt-4">
              <TransactionsList />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <AIRecommendations />
          </Card>

          <Card>
            <Achievements badges={overview?.badges || []} />
          </Card>

          <Card>
            <NewsWidget />
          </Card>

          <Card>
            <LeaderboardPreview leaders={leaderboard} />
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Reward notifications</h3>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Recent</span>
            </div>
            <div className="mt-4 space-y-3">
              {(overview?.notifications || []).length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">No new rewards yet.</div>
              ) : (
                overview.notifications.map((notification) => (
                  <div key={notification._id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-sm text-slate-300">
                    <div className="font-semibold text-white">{notification.type.toUpperCase()}</div>
                    <div className="mt-1">{notification.message}</div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}