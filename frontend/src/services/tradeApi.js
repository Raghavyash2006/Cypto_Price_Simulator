import apiClient from './apiClient';

export async function buyCoin(coinId, quantity) {
  const res = await apiClient.post('/trade/buy', { coinId, quantity });
  return res.data;
}

export async function sellCoin(coinId, quantity) {
  const res = await apiClient.post('/trade/sell', { coinId, quantity });
  return res.data;
}

export async function getPortfolio() {
  const res = await apiClient.get('/trade/portfolio');
  return res.data;
}

export async function getPortfolioAnalytics() {
  const res = await apiClient.get('/trade/analytics');
  return res.data;
}
