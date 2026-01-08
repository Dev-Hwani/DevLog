import axios from 'axios';
import { API_BASE_URL } from './config';
import { notifyAuthExpired, notifyError } from './eventBus';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let isRefreshing = false;
let refreshPromise = null;

const refreshAccessToken = () =>
  axios.post(`${API_BASE_URL}/api/auth/refresh`, null, { withCredentials: true });

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error || {};

    if (!response) {
      notifyError('Network error. Check your connection and try again.');
      return Promise.reject(error);
    }

    if (response.status !== 401 || config?.url?.includes('/api/auth/refresh')) {
      if (response.status >= 500) {
        notifyError('Server error. Please try again shortly.');
      }
      return Promise.reject(error);
    }

    if (config._retry) {
      notifyAuthExpired();
      return Promise.reject(error);
    }

    config._retry = true;

    try {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshAccessToken().finally(() => {
          isRefreshing = false;
        });
      }
      await refreshPromise;
      return api(config);
    } catch (refreshError) {
      notifyAuthExpired();
      return Promise.reject(refreshError);
    }
  }
);

export default api;
