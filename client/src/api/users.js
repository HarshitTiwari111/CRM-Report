import axiosInstance from './axios';

export const getUsers = (params) => axiosInstance.get('/users', { params });

export const createUser = (payload) => axiosInstance.post('/users', payload);

export const getUser = (id) => axiosInstance.get(`/users/${id}`);

export const updateUser = (id, payload) => axiosInstance.put(`/users/${id}`, payload);

export const deleteUser = (id) => axiosInstance.delete(`/users/${id}`);

export const setUserStatus = (id, isActive) =>
  axiosInstance.patch(`/users/${id}/status`, { isActive });

export const resetUserPassword = (id, newPassword) =>
  axiosInstance.patch(`/users/${id}/reset-password`, { newPassword });

export const assignUser = (id, payload) => axiosInstance.patch(`/users/${id}/assign`, payload);

export const getUserPerformance = (id) => axiosInstance.get(`/users/${id}/performance`);

export const updateMyProfile = (formData) =>
  axiosInstance.put('/users/me/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
