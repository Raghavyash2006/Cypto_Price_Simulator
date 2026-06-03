import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Skeleton from '../components/common/Skeleton';
import { getArenaDashboard, getArenaMatch, getArenaMatchmaking, joinArenaTournament, createArenaTournament, leaveArena, queueBattle } from '../services/arenaApi';
import { getSocket } from '../services/socket';

const defaultTournamentForm = {
  title: 'Weekend Sprint Cup',
  description: 'Open tournament with live ranking updates and an auto-settle timer.',
  durationMinutes: 45,
  maxParticipants: 8,
  prizePool: 2500,
  entryFee: 0
};

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatTimeLeft(milliseconds) {
  const safe = Math.max(0, milliseconds || 0);
  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function matchProgress(match, now) {
  if (!match?.startsAt || !match?.endsAt) return 0;
  const start = new Date(match.startsAt).getTime();
  const end = new Date(match.endsAt).getTime();
  if (end <= start) return 0;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

function ArenaStatusBadge({ status }) {
  const tone = status === 'active' ? 'emerald' : status === 'waiting' ? 'amber' : 'slate';
  const classes = {
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    slate: 'bg-slate-500/15 text-slate-300 border-slate-500/30'
  };
  return <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] ${classes[tone]}`}>{status}</span>;
}

export default function ArenaPage() {
  const [dashboard, setDashboard] = useState({ matches: [], battles: [], tournaments: [], leaderboard: [], queue: [] });
  const [matchmaking, setMatchmaking] = useState({ queue: null, activeMatch: null });
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(Date.now());
  const [form, setForm] = useState(defaultTournamentForm);
  const socketRef = useRef(null);

  const selectedMatchStandings = useMemo(() => selectedMatch?.standings || [], [selectedMatch]);
  const leaderRows = dashboard.leaderboard || [];

  const refresh = async (preferredMatchId = selectedMatchId) => {
    const [arenaData, matchupData] = await Promise.all([getArenaDashboard(), getArenaMatchmaking()]);
    setDashboard(arenaData);
    setMatchmaking(matchupData);

    const nextMatchId = preferredMatchId || arenaData.matches?.[0]?._id || arenaData.tournaments?.[0]?._id || null;
    setSelectedMatchId(nextMatchId);

    if (nextMatchId) {
      const matchData = await getArenaMatch(nextMatchId);
      setSelectedMatch(matchData.match);
    } else {
      setSelectedMatch(null);
    }
  };

  useEffect(() => {
    refresh().catch(() => setLoading(false)).finally(() => setLoading(false));
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    socket.connect();

    const handleMatchUpdate = (payload) => {
      setDashboard((previous) => ({
        ...previous,
        matches: (previous.matches || []).map((match) => (match.id === payload.id ? payload : match)),
        battles: (previous.battles || []).map((match) => (match.id === payload.id ? payload : match)),
        tournaments: (previous.tournaments || []).map((match) => (match.id === payload.id ? payload : match))
      }));

      if (payload.id === selectedMatchId) {
        setSelectedMatch(payload);
      }
    };

    const handleMatchEnded = (payload) => {
      setMessage(`${payload.title} has finished. Rewards are being distributed.`);
      setSelectedMatch((current) => (current?.id === payload.id ? payload : current));
      refresh(payload.id).catch(() => null);
    };

    socket.on('arena:match:update', handleMatchUpdate);
    socket.on('arena:match:ended', handleMatchEnded);

    return () => {
      socket.off('arena:match:update', handleMatchUpdate);
      socket.off('arena:match:ended', handleMatchEnded);
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatchId]);

  useEffect(() => {
    if (!selectedMatchId || !socketRef.current) return undefined;
    socketRef.current.emit('arena:join', { matchId: selectedMatchId });
    return () => socketRef.current?.emit('arena:leave', { matchId: selectedMatchId });
  }, [selectedMatchId]);

  const handleQueueBattle = async () => {
    setBusy(true);
    setMessage('');
    try {
      const result = await queueBattle({ durationMinutes: 15, prizePool: 500 });
      if (result.state === 'matched' && result.match?.id) {
        setMessage('Battle found. You are now in a live match.');
        setSelectedMatchId(result.match.id);
        setSelectedMatch(result.match);
      } else {
        setMessage('You are in the battle queue. Waiting for an opponent.');
      }
      await refresh(result.match?.id || selectedMatchId);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateTournament = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const payload = {
        title: form.title,
        description: form.description,
        durationMinutes: Number(form.durationMinutes),
        maxParticipants: Number(form.maxParticipants),
        prizePool: Number(form.prizePool),
        entryFee: Number(form.entryFee)
      };
      const result = await createArenaTournament(payload);
      setMessage('Tournament created and opened for live trading.');
      setSelectedMatchId(result.match?.id || null);
      setSelectedMatch(result.match || null);
      await refresh(result.match?.id || selectedMatchId);
    } finally {
      setBusy(false);
    }
  };

  const handleJoinTournament = async (matchId) => {
    setBusy(true);
    setMessage('');
    try {
      const result = await joinArenaTournament(matchId);
      setSelectedMatchId(result.match?.id || matchId);
      setSelectedMatch(result.match || selectedMatch);
      setMessage('Joined the tournament. Your ranking will update live.');
      await refresh(matchId);
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async (matchId) => {
    setBusy(true);
    try {
      await leaveArena(matchId);
      setMessage('Left the arena match.');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleSelectMatch = async (matchId) => {
    setSelectedMatchId(matchId);
    const matchData = await getArenaMatch(matchId);
    setSelectedMatch(matchData.match);
    if (socketRef.current) {
      socketRef.current.emit('arena:join', { matchId });
    }
  };

  const remaining = selectedMatch ? new Date(selectedMatch.endsAt).getTime() - now : 0;
  const timerProgress = matchProgress(selectedMatch, now);
  const topScore = selectedMatchStandings[0]?.score || 1;
  const activeMatchCount = dashboard.matches?.filter((match) => match.status === 'active').length || 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 rounded-[2.5rem]" />
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Skeleton className="h-[32rem] rounded-[2rem]" />
            <Skeleton className="h-[28rem] rounded-[2rem]" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-[28rem] rounded-[2rem]" />
            <Skeleton className="h-[24rem] rounded-[2rem]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2.5rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.15),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] p-6 shadow-[0_28px_100px_-40px_rgba(15,23,42,0.95)] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-4">
            <div className="inline-flex rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-200">
              Real-time trading arena
            </div>
            <h1 className="text-4xl font-black text-white sm:text-5xl">Compete in live battles, timed tournaments, and ranked trading showdowns.</h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-400">
              Matchmaking pairs you with another trader, tournament rooms run on a live clock, and every buy or sell updates the leaderboard in real time.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleQueueBattle} disabled={busy} className="shadow-[0_0_0_1px_rgba(245,158,11,0.35)]">
                Quick battle
              </Button>
              <Link to="/trade" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Open trading desk
              </Link>
              <Link to="/community" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                View competitions
              </Link>
            </div>
            {message ? <p className="text-sm text-amber-200">{message}</p> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Live matches', value: activeMatchCount.toString() },
              { label: 'Waiting queue', value: String(dashboard.queue?.length || 0) },
              { label: 'Arena leaders', value: String(leaderRows.length) },
              { label: 'Rewards pending', value: String((dashboard.matches || []).filter((match) => match.status === 'active').length) }
            ].map((stat) => (
              <Card key={stat.label} className="bg-white/10">
                <div className="text-xs uppercase tracking-[0.3em] text-slate-500">{stat.label}</div>
                <div className="mt-2 text-3xl font-black text-white">{stat.value}</div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-300">Battle room</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Match feed and tournament board</h2>
                <p className="mt-2 text-sm text-slate-400">Select a room to follow its timer, standings, and reward distribution.</p>
              </div>
              <ArenaStatusBadge status={selectedMatch?.status || 'waiting'} />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {(dashboard.battles || []).concat(dashboard.tournaments || []).map((match) => (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => handleSelectMatch(match.id)}
                  className={`rounded-3xl border p-4 text-left transition ${match.id === selectedMatchId ? 'border-amber-400/60 bg-amber-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{match.title}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-500">{match.mode}</div>
                    </div>
                    <ArenaStatusBadge status={match.status} />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
                    <span>{match.participantsCount} players</span>
                    <span>{formatMoney(match.prizePool)} prize</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400" style={{ width: `${Math.round(matchProgress(match, now) * 100)}%` }} />
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Live rankings</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{selectedMatch?.title || 'Select a match to inspect live standings'}</h3>
              </div>
              {selectedMatch ? <span className="text-sm text-slate-400">Ends in {formatTimeLeft(remaining)}</span> : null}
            </div>

            {selectedMatch ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>Match timer</span>
                    <span>{Math.round(timerProgress * 100)}%</span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400 transition-all" style={{ width: `${Math.round(timerProgress * 100)}%` }} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-400">
                    <span>Mode: {selectedMatch.mode}</span>
                    <span>Prize: {formatMoney(selectedMatch.prizePool)}</span>
                    <span>Players: {selectedMatch.participantsCount}/{selectedMatch.maxParticipants}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedMatchStandings.map((row) => (
                    <div key={String(row.user)} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-white">#{row.rank} {row.user?.name || row.user?.username || 'Trader'}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-500">{row.tradesCount} trades</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-emerald-300">{row.score.toFixed(2)} pts</div>
                          <div className="text-xs text-slate-400">ROI {row.roiPct.toFixed(2)}%</div>
                        </div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                          style={{ width: `${Math.max(6, Math.min(100, (row.score / topScore) * 100))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  {selectedMatch.mode === 'tournament' ? (
                    <Button onClick={() => handleJoinTournament(selectedMatch.id)} disabled={busy || selectedMatch.participantsCount >= selectedMatch.maxParticipants}>
                      Join tournament
                    </Button>
                  ) : null}
                  <Button onClick={() => handleLeave(selectedMatch.id)} disabled={busy} className="bg-white/10 text-white hover:bg-white/15">
                    Leave room
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-slate-950/50 p-8 text-sm text-slate-400">
                Pick a battle or tournament to view the live room.
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-300">Tournament studio</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Create a live bracket</h3>
            <form className="mt-5 space-y-4" onSubmit={handleCreateTournament}>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500"
                placeholder="Tournament title"
              />
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                placeholder="Tournament description"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  min="10"
                  value={form.durationMinutes}
                  onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value }))}
                  className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
                  placeholder="Duration minutes"
                />
                <input
                  type="number"
                  min="4"
                  value={form.maxParticipants}
                  onChange={(event) => setForm((current) => ({ ...current, maxParticipants: event.target.value }))}
                  className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
                  placeholder="Max players"
                />
                <input
                  type="number"
                  min="0"
                  value={form.prizePool}
                  onChange={(event) => setForm((current) => ({ ...current, prizePool: event.target.value }))}
                  className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
                  placeholder="Prize pool"
                />
                <input
                  type="number"
                  min="0"
                  value={form.entryFee}
                  onChange={(event) => setForm((current) => ({ ...current, entryFee: event.target.value }))}
                  className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
                  placeholder="Entry fee"
                />
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                Launch tournament
              </Button>
            </form>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Arena leaderboard</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Season ranking</h3>
              </div>
              <Link to="/leaderboard" className="text-sm text-amber-200 hover:underline">
                Full board
              </Link>
            </div>
            <div className="mt-5 space-y-3">
              {leaderRows.length ? leaderRows.map((row) => (
                <div key={row.userId} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div>
                    <div className="font-semibold text-white">#{row.rank} {row.name || row.username}</div>
                    <div className="text-xs text-slate-400">@{row.username} • {row.matchesWon}/{row.matchesPlayed} wins</div>
                  </div>
                  <div className="text-right text-sm text-slate-300">
                    <div>{row.totalScore.toFixed(2)} pts</div>
                    <div>{row.averageRoi.toFixed(2)}% avg ROI</div>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-400">
                  Arena rankings will populate after completed matches.
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">Matchmaking status</h3>
              <ArenaStatusBadge status={matchmaking.activeMatch ? 'active' : matchmaking.queue ? 'waiting' : 'idle'} />
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              {matchmaking.queue ? <p>Queued for a battle since {new Date(matchmaking.queue.createdAt).toLocaleTimeString()}.</p> : <p>You are not in the queue.</p>}
              {matchmaking.activeMatch ? <p>Active match: {matchmaking.activeMatch.title}</p> : <p>No active match assigned yet.</p>}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={handleQueueBattle} disabled={busy}>
                Find opponent
              </Button>
              <Link to="/trade" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Trade now
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
