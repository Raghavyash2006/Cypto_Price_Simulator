import apiClient from './apiClient';
import { cachedGet } from './requestCache';

function resolveQuizId(payload = {}) {
  return payload.quizId || payload.quiz?.id || payload.quiz?._id || payload.id || payload._id || null;
}

export async function generateLearnQuiz(payload) {
  const { data } = await apiClient.post('/learn/quiz/generate', payload);
  return data;
}

export async function submitLearnQuiz(payload) {
  const normalizedPayload = {
    ...payload,
    quizId: resolveQuizId(payload)
  };

  const { data } = await apiClient.post('/learn/quiz/submit', normalizedPayload);
  return data;
}

export async function fetchLearnQuizHistory(params = {}) {
  const cacheKey = `learn-quiz-history:${params.lessonId || ''}:${params.courseId || ''}:${params.limit || 8}`;
  return cachedGet(cacheKey, async () => {
    const { data } = await apiClient.get('/learn/quiz/history', { params });
    return data;
  }, { ttl: 30000, staleTtl: 120000 });
}