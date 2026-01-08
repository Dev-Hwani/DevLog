import api from './client';

export const fetchMe = async () => {
  const response = await api.get('/api/auth/me', {
    validateStatus: (status) => status === 200 || status === 204,
  });
  if (response.status === 204) {
    return null;
  }
  return response.data;
};

export const login = async (payload) => {
  const response = await api.post('/api/auth/login', payload);
  return response.data;
};

export const signup = async (payload) => {
  const response = await api.post('/api/auth/signup', payload);
  return response.data;
};

export const logout = async () => {
  await api.post('/api/auth/logout');
};

export const refresh = async () => {
  await api.post('/api/auth/refresh');
};
