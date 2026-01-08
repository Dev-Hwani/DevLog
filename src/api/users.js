import api from './client';

export const getUserProfile = async (userId) => {
  const response = await api.get(`/api/users/${userId}`);
  return response.data;
};

export const getMeProfile = async () => {
  const response = await api.get('/api/users/me');
  return response.data;
};

export const updateMeProfile = async (payload) => {
  const response = await api.put('/api/users/me', payload);
  return response.data;
};

export const updateProfileImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  await api.post('/api/users/me/profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const listUserArticles = async (userId, params) => {
  const response = await api.get(`/api/users/${userId}/articles`, { params });
  return response.data;
};
