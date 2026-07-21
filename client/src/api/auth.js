import axiosInstance from './axios';

export const login = (payload) => axiosInstance.post('/auth/login', payload);

export const register = (payload) => axiosInstance.post('/auth/register', payload);

// Refresh token is carried by the HttpOnly cookie; no payload needed
export const refresh = () => axiosInstance.post('/auth/refresh', {});

export const logoutApi = () => axiosInstance.post('/auth/logout', {});

export const forgotPassword = (email) => axiosInstance.post('/auth/forgot-password', { email });

export const resetPassword = (token, password) =>
  axiosInstance.post(`/auth/reset-password/${token}`, { password });

export const changePassword = (payload) => axiosInstance.post('/auth/change-password', payload);

export const getMe = () => axiosInstance.get('/auth/me');

// Two-factor authentication
export const verifyTwoFactorLogin = (payload) =>
  axiosInstance.post('/auth/2fa/verify-login', payload);

export const setupTwoFactor = () => axiosInstance.post('/auth/2fa/setup', {});

export const enableTwoFactor = (code) => axiosInstance.post('/auth/2fa/enable', { code });

export const disableTwoFactor = (payload) => axiosInstance.post('/auth/2fa/disable', payload);
