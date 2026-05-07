import axios from 'axios';

// Get base URL from environment variables, fallback to localhost for dev
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
const USER_STORAGE_KEY = 'unisphere_user';
const ROLE_STORAGE_KEY = 'unisphere_role';

const refreshClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let refreshPromise = null;
let pendingRequests = [];

const isBrowser = typeof window !== 'undefined';

const clearStoredAuth = () => {
  if (!isBrowser) return;
  window.localStorage.removeItem(USER_STORAGE_KEY);
  window.localStorage.removeItem(ROLE_STORAGE_KEY);
};

const getStoredRole = () => {
  if (!isBrowser) return null;
  return window.localStorage.getItem(ROLE_STORAGE_KEY);
};

const getRefreshPathByRole = (role) => {
  if (!role) return null;

  if (role === 'faculty' || role === 'hod') {
    return '/faculty/refresh-token';
  }

  if (role === 'admin' || role === 'superadmin') {
    return '/admin/refresh-token';
  }

  // student + club leadership roles use student auth routes
  if (role === 'student' || role === 'club_president' || role === 'club_vice_president') {
    return '/students/refresh-token';
  }

  return null;
};

const isAuthEndpoint = (url = '') => {
  if (typeof url !== 'string') return false;

  return [
    '/auth/login',
    '/students/login',
    '/students/forgot-password',
    '/students/reset-password',
    '/students/refresh-token',
    '/faculty/login',
    '/faculty/forgot-password',
    '/faculty/reset-password',
    '/faculty/refresh-token',
    '/admin/login',
    '/admin/forgot-password',
    '/admin/reset-password',
    '/admin/refresh-token',
  ].some((path) => url.startsWith(path));
};

const shouldSkipRefresh = (config = {}) => {
  if (config._skipAuthRefresh) return true;
  return isAuthEndpoint(config.url);
};

const flushPendingRequests = (error) => {
  pendingRequests.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
      return;
    }
    resolve();
  });
  pendingRequests = [];
};

const redirectToLoginIfNeeded = () => {
  if (!isBrowser) return;

  const currentPath = window.location.pathname;
  const authPages = ['/login', '/forgot-password', '/reset-password'];
  if (authPages.some((path) => currentPath.startsWith(path))) {
    return;
  }

  window.location.assign('/login');
};

const refreshAccessToken = async () => {
  const role = getStoredRole();
  const refreshPath = getRefreshPathByRole(role);

  if (!refreshPath) {
    throw new Error('Cannot refresh access token: unknown or missing role');
  }

  await refreshClient.post(refreshPath, {}, {
    _skipAuthRefresh: true,
  });
};

const normalizeUrl = (url = '') => {
  if (typeof url !== 'string') {
    return url;
  }

  if (url === '/api/v1') {
    return '/';
  }

  if (url.startsWith('/api/v1/')) {
    return url.slice('/api/v1'.length);
  }

  return url;
};

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Crucial for sending cookies (JWT) with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (config.url) {
    config.url = normalizeUrl(config.url);
  }

  return config;
});

// Interceptor for responses to handle token refresh or global 401s
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;

    if (!originalRequest || status !== 401 || shouldSkipRefresh(originalRequest) || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({
          resolve: async () => {
            try {
              resolve(api.request(originalRequest));
            } catch (retryError) {
              reject(retryError);
            }
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    refreshPromise = refreshAccessToken();

    try {
      await refreshPromise;
      flushPendingRequests();
      return api.request(originalRequest);
    } catch (refreshError) {
      flushPendingRequests(refreshError);
      clearStoredAuth();
      redirectToLoginIfNeeded();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  }
);
