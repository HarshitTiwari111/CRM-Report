import axiosInstance from './axios';

export const getProductivity = (range) => axiosInstance.get('/analytics/productivity', { params: { range } });

export const getDepartmentPerformance = () => axiosInstance.get('/analytics/department-performance');

export const getEmployeePerformance = () => axiosInstance.get('/analytics/employee-performance');

export const getTopPerformers = () => axiosInstance.get('/analytics/top-performers');

export const getCompletionTrend = () => axiosInstance.get('/analytics/completion-trend');
