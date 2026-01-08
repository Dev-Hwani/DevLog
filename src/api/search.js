import api from './client';

export const searchArticles = async (params) => {
  const response = await api.get('/api/search', { params });
  return response.data;
};
