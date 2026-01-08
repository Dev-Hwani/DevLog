import api from './client';

export const followUser = async (userId) => {
  await api.post(`/api/users/${userId}/follow`);
};

export const unfollowUser = async (userId) => {
  await api.delete(`/api/users/${userId}/follow`);
};

export const listFollowers = async (userId, params) => {
  const response = await api.get(`/api/users/${userId}/followers`, { params });
  return response.data;
};

export const listFollowing = async (userId, params) => {
  const response = await api.get(`/api/users/${userId}/following`, { params });
  return response.data;
};
