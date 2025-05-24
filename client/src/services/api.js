import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
});

/**
 * API service for interacting with the backend
 */
const apiService = {
  // Column operations
  getColumns: (jsonFileName = null) => {
    const params = jsonFileName ? { jsonFileName } : {};
    return api.get('/columns', { params });
  },
  getColumn: (id) => api.get(`/columns/${id}`),
  createColumn: (data) => api.post('/columns', data),
  updateColumn: (id, data) => api.patch(`/columns/${id}`, data),
  deleteColumn: (id) => api.delete(`/columns/${id}`),
  
  // Story operations
  getStories: (jsonFileName = null) => {
    const params = jsonFileName ? { jsonFileName } : {};
    return api.get('/stories', { params });
  },
  getStory: (id) => api.get(`/stories/${id}`),
  createStory: (data) => api.post('/stories', data),
  updateStory: (id, data) => api.patch(`/stories/${id}`, data),
  deleteStory: (id) => api.delete(`/stories/${id}`),
  
  // Import stories from JSON
  importStories: (data) => api.post('/stories/import', data),
  
  // JSON Files operations
  getJsonFiles: () => api.get('/json-files'),
  getStoriesByJsonFile: (fileName) => api.get(`/json-files/${encodeURIComponent(fileName)}/stories`),
  
  // Project Configuration operations
  getProjectConfig: (jsonFileName) => api.get(`/project-config/${encodeURIComponent(jsonFileName)}`),
  updateProjectConfig: (jsonFileName, data) => api.put(`/project-config/${encodeURIComponent(jsonFileName)}`, data)
};

export default apiService;