import axiosInstance from './axios';

// Departments
export const getDepartments = (params) => axiosInstance.get('/departments', { params });
export const createDepartment = (payload) => axiosInstance.post('/departments', payload);
export const updateDepartment = (id, payload) => axiosInstance.put(`/departments/${id}`, payload);
export const deleteDepartment = (id) => axiosInstance.delete(`/departments/${id}`);

// Teams
export const getTeams = (params) => axiosInstance.get('/teams', { params });
export const createTeam = (payload) => axiosInstance.post('/teams', payload);
export const updateTeam = (id, payload) => axiosInstance.put(`/teams/${id}`, payload);
export const deleteTeam = (id) => axiosInstance.delete(`/teams/${id}`);

// Projects
export const getProjects = (params) => axiosInstance.get('/projects', { params });
export const createProject = (payload) => axiosInstance.post('/projects', payload);
export const updateProject = (id, payload) => axiosInstance.put(`/projects/${id}`, payload);
export const deleteProject = (id) => axiosInstance.delete(`/projects/${id}`);

// Clients
export const getClients = (params) => axiosInstance.get('/clients', { params });

// Task Categories
export const getTaskCategories = (params) => axiosInstance.get('/task-categories', { params });
export const createTaskCategory = (payload) => axiosInstance.post('/task-categories', payload);
export const updateTaskCategory = (id, payload) =>
  axiosInstance.put(`/task-categories/${id}`, payload);
export const deleteTaskCategory = (id) => axiosInstance.delete(`/task-categories/${id}`);
