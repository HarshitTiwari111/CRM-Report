import axiosInstance from './axios';

export const getSettings = () => axiosInstance.get('/settings');

export const updateSettings = (payload) => axiosInstance.put('/settings', payload);
