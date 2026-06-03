import { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { motion } from 'framer-motion';
import {
  createAdminQuiz,
  deleteAdminQuiz,
  deleteAdminUser,
  deleteModeratedComment,
  deleteModeratedPost,
  getAdminActivity,
  getAdminAnalytics,
  getAdminLeaderboard,
  getAdminNotifications,
  getAdminOverview,
  getAdminQuizzes,
  getAdminUsers,
  getModerationQueue,
  updateAdminQuiz,
  updateAdminUser
} from '../services/adminApi';

const TABS = ['overview', 'users', 'quizzes', 'leaderboard', 'analytics', 'activity', 'notifications', 'moderation'];

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function StatCard({ label, value, delta }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{delta}</p>
    </div>
  );
}

function AdminChart({ title, data, color = '#f59e0b' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const chart = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: data.map((entry) => entry.label),
        datasets: [
          {
            data: data.map((entry) => entry.count),
            borderColor: color,
            backgroundColor: `${color}22`,
            fill: true,
            tension: 0.35,
            pointRadius: 2
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.08)' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.08)' } }
        }
      }
    });

    return () => chart.destroy();
  }, [data, color]);

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="mt-4 h-48">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState({ users: [], page: 1, total: 0 });
  const [quizzes, setQuizzes] = useState({ quizzes: [], page: 1, total: 0 });
  const [leaderboard, setLeaderboard] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activity, setActivity] = useState({ transactions: [], activities: [] });
  const [notifications, setNotifications] = useState({ alerts: [], notifications: [] });
  const [moderation, setModeration] = useState({ posts: [], comments: [] });
  const [busy, setBusy] = useState(false);
  const [savingUserId, setSavingUserId] = useState(null);
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [quizForm, setQuizForm] = useState({
    mode: 'generated',
    title: '',
    category: 'wallet safety',
    level: 'beginner',
    difficulty: 'easy',
    timeLimitSeconds: 300,
    xpReward: 100,
    count: 5
  });
  const [search, setSearch] = useState('');

  async function loadSection(tab = activeTab) {
    setBusy(true);
    try {
      if (tab === 'overview') {
        setOverview(await getAdminOverview());
      } else if (tab === 'users') {
        setUsers(await getAdminUsers({ search }));
      } else if (tab === 'quizzes') {
        setQuizzes(await getAdminQuizzes({ search }));
      } else if (tab === 'leaderboard') {
        const data = await getAdminLeaderboard({ limit: 20 });
        setLeaderboard(data.leaderboard || []);
      } else if (tab === 'analytics') {
        setAnalytics(await getAdminAnalytics());
      } else if (tab === 'activity') {
        setActivity(await getAdminActivity({ limit: 20 }));
      } else if (tab === 'notifications') {
        setNotifications(await getAdminNotifications({ limit: 20 }));
      } else if (tab === 'moderation') {
        setModeration(await getModerationQueue({ limit: 20 }));
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadSection('overview');
    void loadSection('users');
    void loadSection('quizzes');
    void loadSection('leaderboard');
    void loadSection('analytics');
    void loadSection('activity');
    void loadSection('notifications');
    void loadSection('moderation');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'users' || activeTab === 'quizzes') {
      void loadSection(activeTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const stats = useMemo(() => {
    if (!overview) return [];
    return [
      { label: 'Users', value: formatNumber(overview.stats.users), delta: `${formatNumber(overview.charts.users.at(-1)?.count || 0)} new this week` },
      { label: 'Quizzes', value: formatNumber(overview.stats.quizzes), delta: `${formatNumber(overview.stats.notifications)} notifications stored` },
      { label: 'Alerts', value: formatNumber(overview.stats.activeAlerts), delta: `${formatNumber(overview.stats.competitions)} competitions live` },
      { label: 'Transactions', value: formatNumber(overview.stats.transactions), delta: `${formatNumber(overview.stats.activities)} social activities` }
    ];
  }, [overview]);

  async function handleUserUpdate(user, payload) {
    setSavingUserId(user.id);
    try {
      await updateAdminUser(user.id, payload);
      await loadSection('users');
      await loadSection('overview');
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleUserDelete(userId) {
    await deleteAdminUser(userId);
    await loadSection('users');
    await loadSection('overview');
  }

  async function handleQuizCreate(event) {
    event.preventDefault();
    await createAdminQuiz({
      ...quizForm,
      mode: quizForm.mode,
      count: Number(quizForm.count),
      timeLimitSeconds: Number(quizForm.timeLimitSeconds),
      xpReward: Number(quizForm.xpReward)
    });
    setQuizForm((current) => ({ ...current, title: '', count: 5 }));
    await loadSection('quizzes');
    await loadSection('overview');
  }

  async function handleQuizUpdate(quiz) {
    await updateAdminQuiz(quiz.id, {
      title: quiz.title,
      category: quiz.category,
      level: quiz.level,
      difficulty: quiz.difficulty,
      timeLimitSeconds: quiz.timeLimitSeconds,
      xpReward: quiz.xpReward
    });
    setEditingQuizId(null);
    await loadSection('quizzes');
  }

  async function handleQuizDelete(quizId) {
    await deleteAdminQuiz(quizId);
    await loadSection('quizzes');
    await loadSection('overview');
  }

  async function handleRemovePost(postId) {
    await deleteModeratedPost(postId);
    await loadSection('moderation');
  }

  async function handleRemoveComment(commentId) {
    await deleteModeratedComment(commentId);
    await loadSection('moderation');
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.2),_transparent_32%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.95))] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)] md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Admin panel</p>
            <h1 className="text-4xl font-semibold text-white md:text-5xl">Professional control center for the platform.</h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-300">
              Manage users, quizzes, leaderboard data, moderation, alerts, and analytics from one secure dashboard.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[22rem] lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Role</p>
              <p className="mt-2 text-2xl font-semibold text-white">Secure</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Status</p>
              <p className="mt-2 text-2xl font-semibold text-white">{busy ? 'Loading' : 'Live'}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab ? 'border-cyan-400/30 bg-cyan-400/15 text-cyan-100' : 'border-white/10 bg-white/5 text-slate-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <AdminChart title="New users" data={overview.charts.users} color="#22d3ee" />
            <AdminChart title="Transactions" data={overview.charts.transactions} color="#f59e0b" />
            <AdminChart title="Posts" data={overview.charts.posts} color="#a78bfa" />
            <AdminChart title="Activity" data={overview.charts.activity} color="#34d399" />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <h3 className="text-lg font-semibold text-white">Recent users</h3>
              <div className="mt-4 space-y-3">
                {overview.recent.users.map((user) => (
                  <div key={user.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-sm text-slate-300">
                    <div className="font-semibold text-white">{user.name || user.username}</div>
                    <div className="mt-1 text-slate-400">{user.email}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <h3 className="text-lg font-semibold text-white">Recent alerts</h3>
              <div className="mt-4 space-y-3">
                {overview.recent.alerts.map((alert) => (
                  <div key={alert.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-sm text-slate-300">
                    <div className="font-semibold text-white">{alert.title}</div>
                    <div className="mt-1 text-slate-400">{alert.type}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <h3 className="text-lg font-semibold text-white">Top leaderboard</h3>
              <div className="mt-4 space-y-3">
                {overview.leaderboard.map((entry) => (
                  <div key={entry.userId} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-sm text-slate-300">
                    <div className="font-semibold text-white">{entry.name || entry.username}</div>
                    <div className="mt-1 text-slate-400">{formatNumber(entry.totalXp)} XP</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">User management</h2>
              <p className="text-sm text-slate-400">Promote admins, suspend accounts, and review balances.</p>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search users"
              className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase tracking-[0.3em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">XP</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.users.map((user) => (
                  <tr key={user.id} className="border-t border-white/10">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-white">{user.name || user.username}</div>
                      <div className="text-xs text-slate-500">@{user.username} • {user.email}</div>
                    </td>
                    <td className="px-4 py-4">{formatNumber(user.xp)}</td>
                    <td className="px-4 py-4">${formatNumber(user.virtualBalance)}</td>
                    <td className="px-4 py-4">{user.isAdmin ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-4">{user.isActive ? 'Active' : 'Suspended'}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => void handleUserUpdate(user, { isAdmin: !user.isAdmin })} className="rounded-full border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">
                          {savingUserId === user.id ? 'Saving...' : user.isAdmin ? 'Revoke admin' : 'Make admin'}
                        </button>
                        <button type="button" onClick={() => void handleUserUpdate(user, { isActive: !user.isActive })} className="rounded-full border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">
                          {user.isActive ? 'Suspend' : 'Reactivate'}
                        </button>
                        <button type="button" onClick={() => void handleUserDelete(user.id)} className="rounded-full border border-rose-400/20 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/10">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'quizzes' && (
        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <form onSubmit={(event) => void handleQuizCreate(event)} className="space-y-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <div>
              <h2 className="text-2xl font-semibold text-white">Quiz management</h2>
              <p className="text-sm text-slate-400">Create generated quizzes or update existing catalog content.</p>
            </div>
            <select value={quizForm.mode} onChange={(event) => setQuizForm((current) => ({ ...current, mode: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white">
              <option value="generated">AI generated</option>
              <option value="manual">Manual</option>
            </select>
            <input value={quizForm.title} onChange={(event) => setQuizForm((current) => ({ ...current, title: event.target.value }))} placeholder="Title" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-500" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={quizForm.category} onChange={(event) => setQuizForm((current) => ({ ...current, category: event.target.value }))} placeholder="Category" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-500" />
              <select value={quizForm.level} onChange={(event) => setQuizForm((current) => ({ ...current, level: event.target.value }))} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              <input value={quizForm.difficulty} onChange={(event) => setQuizForm((current) => ({ ...current, difficulty: event.target.value }))} placeholder="Difficulty" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-500" />
              <input value={quizForm.timeLimitSeconds} onChange={(event) => setQuizForm((current) => ({ ...current, timeLimitSeconds: event.target.value }))} type="number" min="30" step="30" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <input value={quizForm.xpReward} onChange={(event) => setQuizForm((current) => ({ ...current, xpReward: event.target.value }))} type="number" min="0" step="10" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <input value={quizForm.count} onChange={(event) => setQuizForm((current) => ({ ...current, count: event.target.value }))} type="number" min="3" max="10" step="1" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
            </div>
            <button type="submit" className="w-full rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-300">Create quiz</button>
          </form>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Quiz</th>
                    <th className="px-4 py-3">Meta</th>
                    <th className="px-4 py-3">Stats</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quizzes.quizzes.map((quiz) => (
                    <tr key={quiz.id} className="border-t border-white/10 align-top">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-white">{quiz.title}</div>
                        <div className="text-xs text-slate-500">{quiz.category} • {quiz.level}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div>{quiz.difficulty}</div>
                        <div className="text-xs text-slate-500">{quiz.questionCount} questions</div>
                      </td>
                      <td className="px-4 py-4">
                        <div>{quiz.attemptCount} attempts</div>
                        <div className="text-xs text-slate-500">Avg {Math.round(quiz.averagePercentage || 0)}%</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => setEditingQuizId((current) => (current === quiz.id ? null : quiz.id))} className="rounded-full border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">{editingQuizId === quiz.id ? 'Close editor' : 'Edit'}</button>
                          <button type="button" onClick={() => void handleQuizDelete(quiz.id)} className="rounded-full border border-rose-400/20 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/10">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {editingQuizId && (
              <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                <p className="text-sm text-cyan-100">Use the table actions to save metadata changes after selecting the quiz to edit. For complex question editing, manage the payload from the API or generate a fresh quiz.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
          <h2 className="text-2xl font-semibold text-white">Leaderboard management</h2>
          <div className="mt-5 grid gap-3">
            {leaderboard.map((entry, index) => (
              <div key={entry.userId} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-lg font-semibold text-white">#{index + 1} {entry.name || entry.username}</div>
                  <div className="text-sm text-slate-400">{entry.bestPercentage}% best • {entry.attempts} attempts • {entry.passedAttempts} passes</div>
                </div>
                <div className="text-xl font-semibold text-amber-200">{formatNumber(entry.totalXp)} XP</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && analytics && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(analytics.summary).map(([label, value]) => (
              <StatCard key={label} label={label} value={formatNumber(value)} delta="Last 7 days" />
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <AdminChart title="User growth" data={analytics.charts.users} color="#22d3ee" />
            <AdminChart title="Quiz attempts" data={analytics.charts.quizAttempts} color="#f59e0b" />
            <AdminChart title="Social posts" data={analytics.charts.posts} color="#a78bfa" />
            <AdminChart title="Transactions" data={analytics.charts.transactions} color="#34d399" />
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <h2 className="text-2xl font-semibold text-white">User activity monitoring</h2>
            <div className="mt-4 space-y-3">
              {activity.transactions.map((transaction) => (
                <div key={transaction._id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
                  <div className="font-semibold text-white">{transaction.type.toUpperCase()} • {transaction.symbol || 'XP'}</div>
                  <div className="mt-1 text-slate-400">{transaction.user?.name || transaction.user?.username || 'User'} • {formatNumber(transaction.amount)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <h2 className="text-2xl font-semibold text-white">Platform feed</h2>
            <div className="mt-4 space-y-3">
              {activity.activities.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
                  <div className="font-semibold text-white">{item.title}</div>
                  <div className="mt-1 text-slate-400">{item.summary}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <h2 className="text-2xl font-semibold text-white">Notification management</h2>
            <div className="mt-4 space-y-3">
              {notifications.notifications.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
                  <div className="font-semibold text-white">{item.name || item.username}</div>
                  <div className="mt-1 text-slate-400">{item.message}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <h2 className="text-2xl font-semibold text-white">Active alerts</h2>
            <div className="mt-4 space-y-3">
              {notifications.alerts.map((alert) => (
                <div key={alert.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
                  <div className="font-semibold text-white">{alert.title}</div>
                  <div className="mt-1 text-slate-400">{alert.type} • {alert.isActive ? 'active' : 'paused'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'moderation' && (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <h2 className="text-2xl font-semibold text-white">Content moderation</h2>
            <div className="mt-4 space-y-3">
              {moderation.posts.map((post) => (
                <div key={post.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
                  <div className="font-semibold text-white">{post.author?.name || post.author?.username || 'User'}</div>
                  <div className="mt-1 text-slate-400">{post.content}</div>
                  <button type="button" onClick={() => void handleRemovePost(post.id)} className="mt-3 rounded-full border border-rose-400/20 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/10">Remove post</button>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <h2 className="text-2xl font-semibold text-white">Comment moderation</h2>
            <div className="mt-4 space-y-3">
              {moderation.comments.map((comment) => (
                <div key={comment.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
                  <div className="font-semibold text-white">{comment.author?.name || comment.author?.username || 'User'}</div>
                  <div className="mt-1 text-slate-400">{comment.content}</div>
                  <button type="button" onClick={() => void handleRemoveComment(comment.id)} className="mt-3 rounded-full border border-rose-400/20 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/10">Remove comment</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
