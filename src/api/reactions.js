import api from './client';

export const likeArticle = async (articleId) => {
  const response = await api.post(`/api/articles/${articleId}/like`);
  return response.data;
};

export const unlikeArticle = async (articleId) => {
  const response = await api.delete(`/api/articles/${articleId}/like`);
  return response.data;
};

export const bookmarkArticle = async (articleId) => {
  const response = await api.post(`/api/articles/${articleId}/bookmark`);
  return response.data;
};

export const unbookmarkArticle = async (articleId) => {
  const response = await api.delete(`/api/articles/${articleId}/bookmark`);
  return response.data;
};
