import apiClient from './apiClient';
import { cachedGet } from './requestCache';

export async function fetchLearnCourses() {
  return cachedGet('learn-courses', async () => {
    const { data } = await apiClient.get('/learn/courses');
    return data;
  }, { ttl: 300000, staleTtl: 900000 });
}

export async function fetchLearnCourse(id) {
  return cachedGet(`learn-course:${id}`, async () => {
    const { data } = await apiClient.get(`/learn/course/${id}`);
    return data;
  }, { ttl: 300000, staleTtl: 900000 });
}

export async function fetchLearnLesson(id) {
  return cachedGet(`learn-lesson:${id}`, async () => {
    const { data } = await apiClient.get(`/learn/lesson/${id}`);
    return data;
  }, { ttl: 300000, staleTtl: 900000 });
}

export async function saveLearnProgress(payload) {
  const { data } = await apiClient.post('/learn/progress', payload);
  return data;
}

export async function fetchLearnAnalytics(params = {}) {
  const period = String(params.period || '30d');
  return cachedGet(`learn-analytics:${period}`, async () => {
    const { data } = await apiClient.get('/learn/analytics', { params });
    return data;
  }, { ttl: 60000, staleTtl: 180000 });
}

export async function fetchLearnRecommendations(params = {}) {
  const period = String(params.period || '30d');
  return cachedGet(`learn-recommendations:${period}`, async () => {
    const { data } = await apiClient.get('/learn/recommendations', { params });
    return data;
  }, { ttl: 60000, staleTtl: 180000 });
}

export async function askLearnTeacherExplain(payload) {
  const { data } = await apiClient.post('/learn/ai/explain', payload);
  return data;
}

export async function askLearnTeacherSummarize(payload) {
  const { data } = await apiClient.post('/learn/ai/summarize', payload);
  return data;
}

export async function askLearnTeacherExamples(payload) {
  const { data } = await apiClient.post('/learn/ai/examples', payload);
  return data;
}