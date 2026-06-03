import apiClient from './apiClient';

export async function getPortfolioAnalytics(period = '30d') {
  const { data } = await apiClient.get('/trade/analytics', {
    params: { period }
  });
  return data;
}
