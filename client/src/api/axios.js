import axios from 'axios';
import { store } from '../app/store';
import { setCredentials, logout } from '../features/auth/authSlice';

// Never fall back to localhost in production builds; it can cause the live app
// to accidentally write to the user's local backend.
const baseURL = import.meta.env.VITE_API_URL || '/api';

const axiosInstance = axios.create({
  baseURL,
  // Send the HttpOnly refresh cookie on auth endpoints
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue = [];

function processQueue(error, token) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
}

// The refresh token travels in an HttpOnly cookie — no body payload needed.
// Concurrent callers share one request: tokens are rotated server-side, so two
// parallel refreshes with the same cookie would invalidate the session.
let refreshPromise = null;
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${baseURL}/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => data.data.accessToken)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newAccessToken = await refreshSession();

        store.dispatch(setCredentials({ accessToken: newAccessToken }));
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        store.dispatch(logout());
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
