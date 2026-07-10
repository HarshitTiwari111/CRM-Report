import axiosInstance from './axios';

export const getTasks = (params) => axiosInstance.get('/tasks', { params });

export const createTask = (formData) =>
  axiosInstance.post('/tasks', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getTask = (id) => axiosInstance.get(`/tasks/${id}`);

export const updateTask = (id, formData) =>
  axiosInstance.put(`/tasks/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteTask = (id) => axiosInstance.delete(`/tasks/${id}`);

export const setTaskStatus = (id, status) => axiosInstance.patch(`/tasks/${id}/status`, { status });

export const selfAssignTask = (id) => axiosInstance.patch(`/tasks/${id}/self-assign`);

export const duplicateTask = (id) => axiosInstance.post(`/tasks/${id}/duplicate`);

export const bulkUpdateTasks = (ids, update) =>
  axiosInstance.post('/tasks/bulk-update', { ids, update });

export const bulkDeleteTasks = (ids) => axiosInstance.post('/tasks/bulk-delete', { ids });

export const getCopyPreviousTasks = () => axiosInstance.get('/tasks/copy-previous');

export const importCsvTasks = (formData) =>
  axiosInstance.post('/tasks/import-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
