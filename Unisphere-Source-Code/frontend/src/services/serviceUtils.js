import { api } from '@/api/axios';

const API_V1_PREFIX = '/api/v1';

export const normalizeApiPath = (path = '') => {
  if (typeof path !== 'string') {
    return path;
  }

  if (path === API_V1_PREFIX) {
    return '/';
  }

  if (path.startsWith(`${API_V1_PREFIX}/`)) {
    return path.slice(API_V1_PREFIX.length);
  }

  return path;
};

export const unwrapApiResponse = (response) => {
  const payload = response?.data;
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data;
  }

  return payload;
};

export const getApiErrorMessage = (error, fallback = 'Something went wrong') => {
  return error?.response?.data?.message || error?.message || fallback;
};

const buildHeaders = (data, headers = {}) => {
  if (data instanceof FormData) {
    return {
      ...headers,
      'Content-Type': 'multipart/form-data',
    };
  }

  return headers;
};

export const apiRequest = async (method, path, options = {}) => {
  const response = await api.request({
    method,
    url: normalizeApiPath(path),
    params: options.params,
    data: options.data,
    headers: buildHeaders(options.data, options.headers),
    responseType: options.responseType,
    signal: options.signal,
  });

  return unwrapApiResponse(response);
};

export const apiRequestRaw = (method, path, options = {}) => {
  return api.request({
    method,
    url: normalizeApiPath(path),
    params: options.params,
    data: options.data,
    headers: buildHeaders(options.data, options.headers),
    responseType: options.responseType,
    signal: options.signal,
  });
};

export const createFormData = (fields = {}) => {
  const formData = new FormData();

  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => formData.append(key, entry));
      return;
    }

    formData.append(key, value);
  });

  return formData;
};