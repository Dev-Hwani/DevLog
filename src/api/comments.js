import api from './client';

export const listComments = async (articleId) => {
  const response = await api.get(`/api/articles/${articleId}/comments`);
  return response.data;
};

export const createComment = async (articleId, payload) => {
  const response = await api.post(`/api/articles/${articleId}/comments`, payload);
  return response.data;
};

export const updateComment = async (commentId, payload) => {
  const response = await api.put(`/api/comments/${commentId}`, payload);
  return response.data ?? null;
};

export const deleteComment = async (commentId) => {
  await api.delete(`/api/comments/${commentId}`);
};
