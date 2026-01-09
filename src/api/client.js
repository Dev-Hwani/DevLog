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
      notifyError('네트워크 오류입니다. 연결을 확인해 주세요.');
      return Promise.reject(error);
    }

    if (response.status !== 401 || config?.url?.includes('/api/auth/refresh')) {
      if (response.status >= 500) {
        notifyError('서버 오류입니다. 잠시 후 다시 시도해 주세요.');
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
