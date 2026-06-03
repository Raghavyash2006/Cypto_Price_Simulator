import apiClient from './apiClient';
import { cachedGet, invalidateCache } from './requestCache';

export async function getCommunityFeed(params = {}) {
  const limit = params.limit ?? 20;
  const cursor = params.cursor ?? '';
  return cachedGet(`social:feed:${limit}:${cursor}`, async () => {
    const { data } = await apiClient.get('/social/feed', { params });
    return data;
  }, { ttl: 30000, staleTtl: 120000 });
}

export async function createFeedPost(payload) {
  const { data } = await apiClient.post('/social/posts', payload);
  invalidateCache('social:');
  return data;
}

export async function likePost(postId) {
  const { data } = await apiClient.post(`/social/posts/${postId}/like`);
  invalidateCache('social:');
  return data;
}

export async function commentPost(postId, content) {
  const { data } = await apiClient.post(`/social/posts/${postId}/comments`, { content });
  invalidateCache('social:');
  return data;
}

export async function followUser(username) {
  const { data } = await apiClient.post('/social/follow', { username });
  return data;
}

export async function requestFriend(username) {
  const { data } = await apiClient.post('/social/friends/request', { username });
  return data;
}

export async function respondFriendRequest(payload) {
  const { data } = await apiClient.post('/social/friends/respond', payload);
  return data;
}

export async function getProfile(username) {
  const { data } = await apiClient.get(`/social/profile/${username}`);
  return data;
}

export async function compareProfiles(usernameA, usernameB) {
  const { data } = await apiClient.post('/social/compare', { usernameA, usernameB });
  return data;
}

export async function getCommunityLeaderboard(limit = 20) {
  return cachedGet(`social:leaderboard:${limit}`, async () => {
    const { data } = await apiClient.get('/social/leaderboard', { params: { limit } });
    return data;
  }, { ttl: 30000, staleTtl: 120000 });
}

export async function getActivityFeed(limit = 30) {
  return cachedGet(`social:activity:${limit}`, async () => {
    const { data } = await apiClient.get('/social/activity', { params: { limit } });
    return data;
  }, { ttl: 30000, staleTtl: 120000 });
}

export async function getCompetitions() {
  return cachedGet('social:competitions', async () => {
    const { data } = await apiClient.get('/social/competitions');
    return data;
  }, { ttl: 30000, staleTtl: 120000 });
}

export async function joinCompetition(competitionId) {
  const { data } = await apiClient.post('/social/competitions/join', { competitionId });
  invalidateCache('social:');
  return data;
}

export async function getCompetitionStandings(competitionId) {
  return cachedGet(`social:standings:${competitionId}`, async () => {
    const { data } = await apiClient.get(`/social/competitions/${competitionId}`);
    return data;
  }, { ttl: 30000, staleTtl: 120000 });
}

export async function getNotifications() {
  const { data } = await apiClient.get('/social/notifications');
  return data;
}

export async function updateProfileSettings(payload) {
  const { data } = await apiClient.patch('/social/profile/settings', payload);
  return data;
}
