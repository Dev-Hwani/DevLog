import api from './client';

export const fetchFollowingFeed = async (params) => {
  const response = await api.get('/api/feed', { params });
  return response.data;
};

export const fetchTrendingFeed = async (params) => {
  const response = await api.get('/api/feed/trending', { params });
  return response.data;
};
