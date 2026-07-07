import axiosInstance from './axios';

export const login = (payload) => axiosInstance.post('/auth/login', payload);

export const refresh = (refreshToken) => axiosInstance.post('/auth/refresh', { refreshToken });

export const logoutApi = (refreshToken) => axiosInstance.post('/auth/logout', { refreshToken });

export const forgotPassword = (email) => axiosInstance.post('/auth/forgot-password', { email });

export const resetPassword = (token, password) =>
  axiosInstance.post(`/auth/reset-password/${token}`, { password });

export const changePassword = (payload) => axiosInstance.post('/auth/change-password', payload);

export const getMe = () => axiosInstance.get('/auth/me');
