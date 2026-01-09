import api from './client';

export const listArticles = async (params) => {
  const response = await api.get('/api/articles', { params });
  return response.data;
};

export const getArticle = async (id) => {
  const response = await api.get(`/api/articles/${id}`);
  return response.data;
};

export const createArticle = async (payload) => {
  const response = await api.post('/api/articles', payload);
  return response.data;
};

export const updateArticle = async (id, payload) => {
  const response = await api.put(`/api/articles/${id}`, payload);
  return response.data ?? null;
};

export const deleteArticle = async (id) => {
  await api.delete(`/api/articles/${id}`);
};

export const updateVisibility = async (id, payload) => {
  await api.patch(`/api/articles/${id}/visibility`, payload);
};

export const uploadThumbnail = async (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  await api.post(`/api/articles/${id}/thumbnail`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
