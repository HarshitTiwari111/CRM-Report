import axiosInstance from './axios';

export const getDailyUpdates = (params) => axiosInstance.get('/daily-updates', { params });

export const createDailyUpdate = (payload) => axiosInstance.post('/daily-updates', payload);
