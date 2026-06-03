import apiClient from './apiClient';

export async function registerRequest(payload) {
  const { data } = await apiClient.post('/auth/register', payload);
  return data;
}

export async function loginRequest(payload) {
  const { data } = await apiClient.post('/auth/login', payload);
  return data;
}

export async function refreshAuthRequest() {
  const { data } = await apiClient.post('/auth/refresh');
  return data;
}

export async function fetchCurrentUserRequest() {
  const { data } = await apiClient.get('/auth/me');
  return data;
}

export async function logoutRequest() {
  const { data } = await apiClient.post('/auth/logout');
  return data;
}