import apiClient from './apiClient';

export async function fetchPortfolioSnapshot() {
  const { data } = await apiClient.get('/portfolio');
  return data;
}

export async function fetchPortfolioTransactions(limit = 100) {
  const { data } = await apiClient.get('/transactions', { params: { limit } });
  return data;
}

export async function buyPortfolioAsset(payload) {
  const { data } = await apiClient.post('/portfolio/buy', payload);
  return data;
}

export async function sellPortfolioAsset(payload) {
  const { data } = await apiClient.post('/portfolio/sell', payload);
  return data;
}