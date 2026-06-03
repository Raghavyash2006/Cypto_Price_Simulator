import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import SocialComposer from '../components/social/SocialComposer';
import PostCard from '../components/social/PostCard';
import ActivityFeed from '../components/social/ActivityFeed';
import CompetitionCard from '../components/social/CompetitionCard';
import Card from '../components/common/Card';
import Skeleton from '../components/common/Skeleton';
import {
  commentPost,
  createFeedPost,
  getActivityFeed,
  getCommunityFeed,
  getCommunityLeaderboard,
  getCompetitions,
  getCompetitionStandings,
  joinCompetition,
  likePost
} from '../services/socialApi';

export default function CommunityPage() {
  const user = useSelector((state) => state.auth.user);
  const [feed, setFeed] = useState([]);
  const [activity, setActivity] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [selectedCompetition, setSelectedCompetition] = useState(null);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    try {
      const [feedData, activityData, leaderData] = await Promise.all([
        getCommunityFeed({ limit: 20 }),
        getActivityFeed(24),
        getCommunityLeaderboard(8)
      ]);

      setFeed(feedData.feed || []);
      setActivity(activityData.activity || []);
      setLeaders(leaderData.leaderboard || []);
    } catch {
      setFeed([]);
      setActivity([]);
      setLeaders([]);
    }
  }, []);

  const loadCompetitionStandings = useCallback(async (competitionId) => {
    if (!competitionId) {
      setStandings([]);
      return;
    }

    const board = await getCompetitionStandings(competitionId);
    setStandings(board.standings || []);
  }, []);

  const loadCompetitions = useCallback(async () => {
    try {
      const competitionData = await getCompetitions();
      const list = competitionData.competitions || [];
      setCompetitions(list);

      const nextCompetitionId = selectedCompetition || list[0]?._id || null;
      setSelectedCompetition(nextCompetitionId);
      await loadCompetitionStandings(nextCompetitionId);
    } catch {
      setCompetitions([]);
      setSelectedCompetition(null);
      setStandings([]);
    }
  }, [loadCompetitionStandings, selectedCompetition]);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadFeed(), loadCompetitions()]);
    } finally {
      setLoading(false);
    }
  }, [loadCompetitions, loadFeed]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  const handleCreatePost = useCallback(async (payload) => {
    await createFeedPost({ ...payload, tags: ['community', 'crypto'] });
    await loadFeed();
  }, [loadFeed]);

  const handleLike = useCallback(async (postId) => {
    await likePost(postId);
    await loadFeed();
  }, [loadFeed]);

  const handleComment = useCallback(async (postId, content) => {
    await commentPost(postId, content);
    await loadFeed();
  }, [loadFeed]);

  const handleJoinCompetition = useCallback(async (competitionId) => {
    await joinCompetition(competitionId);
    await loadCompetitions();
  }, [loadCompetitions]);

  const handleOpenCompetition = useCallback(async (competitionId) => {
    const board = await getCompetitionStandings(competitionId);
    setSelectedCompetition(competitionId);
    setStandings(board.standings || []);
  }, []);

  const heroStats = useMemo(() => [
    { label: 'Active users', value: leaders.length ? leaders.length.toString() : '—' },
    { label: 'Posts in feed', value: feed.length.toString() },
    { label: 'Live competitions', value: competitions.length.toString() }
  ], [competitions.length, feed.length, leaders.length]);

  return (
    <div className="space-y-6">
      <div className="rounded-[2.5rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] p-6 shadow-[0_28px_100px_-40px_rgba(15,23,42,0.95)] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">Community</p>
            <h1 className="mt-3 text-4xl font-black text-white sm:text-5xl">Trade, share, and compete with other learners.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              A social layer for the crypto simulator with follow relationships, friendships, public profiles, activity, and live trading competitions.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {heroStats.map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.3em] text-slate-500">{stat.label}</div>
                <div className="mt-2 text-2xl font-bold text-white">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SocialComposer onSubmit={handleCreatePost} loading={loading} />

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <div className="space-y-6">
          <div className="space-y-4">
            {loading ? Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="mt-4 h-24 w-full rounded-[1.5rem]" />
                <Skeleton className="mt-4 h-10 w-48 rounded-full" />
              </Card>
            )) : feed.map((post) => (
              <PostCard key={post._id} post={post} onLike={handleLike} onComment={handleComment} />
            ))}
            {!feed.length && !loading && (
              <Card>
                <p className="text-sm text-slate-400">The community feed is empty. Be the first to post a market idea or learning win.</p>
              </Card>
            )}
          </div>

          {loading ? (
            <Card>
              <Skeleton className="h-6 w-36" />
              <div className="mt-4 space-y-3">
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-16 rounded-2xl" />
              </div>
            </Card>
          ) : (
            <ActivityFeed items={activity} />
          )}
        </div>

        <aside className="space-y-6">
          <Card>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Community leaderboard</h3>
              <Link to="/leaderboard" className="text-sm text-cyan-300 hover:underline">
                Full board
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {loading ? Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 rounded-2xl" />
              )) : leaders.map((leader) => (
                <div key={leader._id || leader.username} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                  <div>
                    <div className="font-semibold text-white">#{leader.rank} {leader.name}</div>
                    <div className="text-xs text-slate-400">@{leader.username} • {leader.level}</div>
                  </div>
                  <div className="text-right text-sm text-slate-300">
                    <div>{leader.xp.toLocaleString()} XP</div>
                    <div>{leader.followersCount} followers</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            {loading ? Array.from({ length: 2 }).map((_, index) => (
              <Card key={index}>
                <Skeleton className="h-6 w-44" />
                <Skeleton className="mt-4 h-24 rounded-[1.5rem]" />
              </Card>
            )) : competitions.map((competition) => (
              <CompetitionCard key={competition._id} competition={competition} onJoin={handleJoinCompetition} onOpen={handleOpenCompetition} />
            ))}
          </div>

          <Card>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Standings</h3>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Live</span>
            </div>
            <div className="mt-4 space-y-3">
              {loading ? Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 rounded-2xl" />
              )) : standings.length ? standings.map((row) => (
                <div key={row.user?._id || row.rank} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">#{row.rank} {row.user?.name || row.user?.username}</div>
                      <div className="text-xs text-slate-400">Trades: {row.tradesCount}</div>
                    </div>
                    <div className="text-right text-sm text-emerald-300">{row.score.toFixed(2)} pts</div>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-400">
                  Open a competition to view live standings.
                </div>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
