import axiosInstance from './axios';

export const getGoogleSheets = () => axiosInstance.get('/google-sheets');

export const saveGoogleSheet = (payload) => axiosInstance.post('/google-sheets', payload);

export const syncGoogleSheet = (id) => axiosInstance.post(`/google-sheets/${id}/sync`);

export const getGoogleSheetTasks = (id, params) => axiosInstance.get(`/google-sheets/${id}/tasks`, { params });

export const selfAssignGoogleSheetTask = (taskId) =>
  axiosInstance.patch(`/google-sheets/tasks/${taskId}/self-assign`);

export const assignGoogleSheetTask = (taskId, employeeId) =>
  axiosInstance.patch(`/google-sheets/tasks/${taskId}/assign`, { employeeId });

export const updateGoogleSheetTaskProgress = (taskId, payload) =>
  axiosInstance.patch(`/google-sheets/tasks/${taskId}/progress`, payload);

export const deleteGoogleSheet = (id) => axiosInstance.delete(`/google-sheets/${id}`);
