import axiosInstance from './axios';

export const getDailyUpdates = (params) => axiosInstance.get('/daily-updates', { params });

export const createDailyUpdate = (payload) => axiosInstance.post('/daily-updates', payload);

export const updateDailyUpdate = (id, data) => axiosInstance.put(`/daily-updates/${id}`, data);

export const deleteDailyUpdate = (id) => axiosInstance.delete(`/daily-updates/${id}`);