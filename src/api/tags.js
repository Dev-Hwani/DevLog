import api from './client';

export const listTags = async () => {
  const response = await api.get('/api/tags');
  return response.data;
};

export const listArticlesByTag = async (tag, params) => {
  const response = await api.get(`/api/tags/${tag}/articles`, { params });
  return response.data;
};
