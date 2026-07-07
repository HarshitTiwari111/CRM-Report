import axiosInstance from './axios';

export const getActivityLogs = (params) => axiosInstance.get('/activity-logs', { params });
