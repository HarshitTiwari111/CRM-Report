import axiosInstance from './axios';

export const clockIn = () => axiosInstance.post('/attendance/clock-in');

export const clockOut = () => axiosInstance.post('/attendance/clock-out');

export const getMyAttendance = (month) => axiosInstance.get('/attendance/me', { params: { month } });

export const getAllAttendance = (params) => axiosInstance.get('/attendance', { params });
