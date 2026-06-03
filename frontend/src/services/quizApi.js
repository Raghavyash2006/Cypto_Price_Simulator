import apiClient from './apiClient';
import { cachedGet } from './requestCache';

export async function getQuizzes(params = {}) {
  const cacheKey = `quizzes:${JSON.stringify(params || {})}`;
  return cachedGet(cacheKey, async () => {
    const { data } = await apiClient.get('/quizzes', { params });
    return data;
  }, { ttl: 60000, staleTtl: 180000 });
}

export async function getQuiz(quizId) {
  return cachedGet(`quiz:${quizId}`, async () => {
    const { data } = await apiClient.get(`/quizzes/${quizId}`);
    return data;
  }, { ttl: 300000, staleTtl: 900000 });
}

export async function createQuiz(payload) {
  const { data } = await apiClient.post('/quizzes/generate', payload);
  return data;
}

export async function submitQuiz(payload) {
  const { data } = await apiClient.post('/quizzes/submit', payload);
  return data;
}

export async function getQuizLeaderboard(params = {}) {
  const cacheKey = `quiz-leaderboard:${JSON.stringify(params || {})}`;
  return cachedGet(cacheKey, async () => {
    const { data } = await apiClient.get('/quizzes/leaderboard', { params });
    return data;
  }, { ttl: 30000, staleTtl: 120000 });
}

export async function getQuizAnalytics(params = {}) {
  const cacheKey = `quiz-analytics:${JSON.stringify(params || {})}`;
  return cachedGet(cacheKey, async () => {
    const { data } = await apiClient.get('/quizzes/analytics', { params });
    return data;
  }, { ttl: 30000, staleTtl: 120000 });
}
