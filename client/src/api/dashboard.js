import axiosInstance from './axios';

export const getAdminDashboard = () => axiosInstance.get('/dashboard/admin');

export const getEmployeeDashboard = () => axiosInstance.get('/dashboard/employee');
