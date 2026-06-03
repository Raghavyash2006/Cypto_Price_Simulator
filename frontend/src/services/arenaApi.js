import apiClient from './apiClient';

export async function getArenaDashboard() {
  const res = await apiClient.get('/arena/dashboard');
  return res.data;
}

export async function getArenaMatches(params = {}) {
  const res = await apiClient.get('/arena/matches', { params });
  return res.data;
}

export async function getArenaMatch(matchId) {
  const res = await apiClient.get(`/arena/matches/${matchId}`);
  return res.data;
}

export async function getArenaMatchmaking() {
  const res = await apiClient.get('/arena/matchmaking');
  return res.data;
}

export async function queueBattle(payload = {}) {
  const res = await apiClient.post('/arena/battle/queue', payload);
  return res.data;
}

export async function createArenaTournament(payload) {
  const res = await apiClient.post('/arena/tournaments', payload);
  return res.data;
}

export async function joinArenaTournament(matchId) {
  const res = await apiClient.post(`/arena/tournaments/${matchId}/join`);
  return res.data;
}

export async function leaveArena(matchId) {
  const res = await apiClient.post(`/arena/matches/${matchId}/leave`);
  return res.data;
}

export async function getArenaLeaderboard(params = {}) {
  const res = await apiClient.get('/arena/leaderboard', { params });
  return res.data;
}

export async function getArenaActivity(params = {}) {
  const res = await apiClient.get('/arena/activity', { params });
  return res.data;
}

export async function resolveArenaMatches() {
  const res = await apiClient.post('/arena/resolve');
  return res.data;
}

export async function syncArenaTrade() {
  const res = await apiClient.post('/arena/sync');
  return res.data;
}
