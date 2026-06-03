import apiClient from './apiClient';
import { cachedGet } from './requestCache';

function getBaseUrl() {
  return apiClient.defaults.baseURL || 'http://localhost:5000/api';
}

export async function getMentorSession() {
  return cachedGet('mentor-session', async () => {
    const { data } = await apiClient.get('/ai/history');
    return data?.data || data;
  }, { ttl: 15000, staleTtl: 60000 });
}

export async function sendMentorMessage({ message, signal } = {}) {
  const { data } = await apiClient.post('/ai/chat', { message }, { signal });
  return data?.data || data;
}

export async function clearMentorHistory() {
  const { data } = await apiClient.delete('/ai/history');
  return data?.data || data;
}
