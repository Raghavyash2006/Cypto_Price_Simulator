import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import Card from '../components/common/Card';
import Skeleton from '../components/common/Skeleton';
import ActivityFeed from '../components/social/ActivityFeed';
import PostCard from '../components/social/PostCard';
import {
  compareProfiles,
  followUser,
  getProfile,
  requestFriend,
  updateProfileSettings
} from '../services/socialApi';

export default function ProfilePage() {
  const { username } = useParams();
  const token = useSelector((state) => state.auth.token);
  const currentUser = useSelector((state) => state.auth.user);
  const [profile, setProfile] = useState(null);
  const [comparisonName, setComparisonName] = useState('');
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [bioDraft, setBioDraft] = useState('');
  const [visibilityDraft, setVisibilityDraft] = useState('public');

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await getProfile(username);
      setProfile(data);
      setBioDraft(data.user.bio || '');
      setVisibilityDraft(data.user.portfolioVisibility || 'public');
      setActionError(null);
    } catch (error) {
      setActionError(error.message || 'Unable to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const handleFollow = async () => {
    await followUser(username);
    await loadProfile();
  };

  const handleFriend = async () => {
    await requestFriend(username);
    await loadProfile();
  };

  const handleCompare = async () => {
    if (!comparisonName.trim()) return;
    const result = await compareProfiles(username, comparisonName.trim());
    setComparison(result);
  };

  const handleSaveSettings = async () => {
    setSavingProfile(true);
    try {
      const result = await updateProfileSettings({
        bio: bioDraft,
        portfolioVisibility: visibilityDraft
      });
      setProfile((current) => current ? { ...current, user: { ...current.user, ...result.profile } } : current);
      setActionError(null);
    } catch (error) {
      setActionError(error.message || 'Unable to save profile settings');
    } finally {
      setSavingProfile(false);
    }
  };

  const profileStats = useMemo(() => {
    if (!profile) return [];
    return [
      { label: 'XP', value: profile.user.xp.toLocaleString() },
      { label: 'Followers', value: profile.user.followersCount.toString() },
      { label: 'Friends', value: profile.user.friendsCount.toString() },
      { label: 'Portfolio value', value: profile.portfolio.hidden ? 'Hidden' : `$${profile.portfolio.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` }
    ];
  }, [profile]);

  const isOwner = Boolean(currentUser?.username && profile?.user?.username && currentUser.username === profile.user.username);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-3xl" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-10 w-72" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-12 w-32 rounded-full" />
              <Skeleton className="h-12 w-32 rounded-full" />
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-3xl" />
            ))}
          </div>
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Skeleton className="h-[32rem] rounded-[2rem]" />
          <Skeleton className="h-[32rem] rounded-[2rem]" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-rose-200">{actionError || 'Profile not found'}</div>;
  }

  const relationLabel = profile.relation.isFriend ? 'Friends' : profile.relation.isFollowing ? 'Following' : 'Connect';

  return (
    <div className="space-y-6">
      <div className="rounded-[2.5rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.99))] p-6 shadow-[0_28px_100px_-42px_rgba(15,23,42,0.95)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-2xl font-black text-slate-950">
              {(profile.user.name || profile.user.username || '?').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">Public profile</p>
              <h1 className="mt-2 text-4xl font-black text-white">{profile.user.name || profile.user.username}</h1>
              <p className="mt-1 text-sm text-slate-400">@{profile.user.username} • {profile.user.level} • {profile.user.streak} day streak</p>
              {profile.user.bio ? <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">{profile.user.bio}</p> : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {token ? (
              <>
                <button
                  type="button"
                  onClick={handleFollow}
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {relationLabel}
                </button>
                <button
                  type="button"
                  onClick={handleFriend}
                  className="rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950"
                >
                  Add friend
                </button>
              </>
            ) : (
              <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-300">
                Sign in to follow, friend, or compare portfolios.
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {profileStats.map((stat) => (
            <div key={stat.label} className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-500">{stat.label}</div>
              <div className="mt-2 text-2xl font-bold text-white">{stat.value}</div>
            </div>
          ))}
        </div>

        {isOwner && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Profile settings</h2>
                <p className="text-sm text-slate-400">Control what visitors can see on your public profile.</p>
              </div>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingProfile}
                className="rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingProfile ? 'Saving…' : 'Save settings'}
              </button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.3em] text-slate-500">Bio</label>
                <textarea
                  value={bioDraft}
                  onChange={(event) => setBioDraft(event.target.value)}
                  rows={4}
                  maxLength={240}
                  placeholder="Tell the community how you trade, learn, or what you are working on."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.3em] text-slate-500">Portfolio visibility</label>
                <select
                  value={visibilityDraft}
                  onChange={(event) => setVisibilityDraft(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="public">Public</option>
                  <option value="followers">Followers</option>
                  <option value="friends">Friends</option>
                  <option value="private">Private</option>
                </select>
                <p className="mt-3 text-sm text-slate-400">This setting controls whether your holdings and portfolio value are visible to other users.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {actionError && <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">{actionError}</div>}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Recent public posts</h2>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Community</span>
            </div>
            <div className="mt-4 space-y-4">
              {profile.recentPosts.length ? profile.recentPosts.map((post) => (
                <PostCard
                  key={post._id}
                  post={{ ...post, author: profile.user, likedByViewer: false }}
                  onLike={() => null}
                  onComment={() => null}
                />
              )) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">No public posts yet.</div>
              )}
            </div>
          </Card>

          <ActivityFeed items={profile.recentActivity} />
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-semibold text-white">Portfolio</h2>
            <p className="mt-1 text-sm text-slate-400">Public snapshot of holdings and performance.</p>
            <div className="mt-4 space-y-3">
              {profile.portfolio.hidden ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                  This portfolio is hidden based on the owner’s privacy settings.
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Total value</div>
                    <div className="mt-2 text-2xl font-bold text-white">${profile.portfolio.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Profit / loss</div>
                    <div className="mt-2 text-2xl font-bold text-emerald-300">${profile.portfolio.profitLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  </div>
                  <div className="space-y-2">
                    {profile.portfolio.holdings.map((holding) => (
                      <div key={holding.symbol} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-white">{holding.coinName}</div>
                            <div className="text-xs text-slate-400">{holding.quantity} units • {holding.symbol}</div>
                          </div>
                          <div className="text-right text-xs text-slate-400">
                            <div>${holding.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                            <div>{holding.profitLoss >= 0 ? '+' : ''}${holding.profitLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold text-white">Compare portfolios</h2>
            <p className="mt-1 text-sm text-slate-400">Compare this profile with another user.</p>
            {token ? (
              <div className="mt-4 flex gap-2">
                <input
                  value={comparisonName}
                  onChange={(event) => setComparisonName(event.target.value)}
                  placeholder="Other username"
                  className="flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={handleCompare}
                  className="rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950"
                >
                  Compare
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                Sign in to compare portfolios.
              </div>
            )}
            {comparison && (
              <div className="mt-4 space-y-3">
                {comparison.users.map((item) => (
                  <div key={item.username} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white">{item.name || item.username}</div>
                        <div className="text-xs text-slate-400">@{item.username}</div>
                      </div>
                      <div className="text-right text-sm text-slate-300">
                        <div>${item.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <div>{item.profitLoss >= 0 ? '+' : ''}${item.profitLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
                  Value gap: ${comparison.delta.valueDifference.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
