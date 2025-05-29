// client/src/services/api.js
import axios from 'axios';
import { io } from 'socket.io-client';

// Create a socket instance
const socket = io('http://localhost:5000', {
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Function to get the current socket ID
const getSocketId = () => {
  return socket?.id;
};

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // Required for sending cookies/auth headers
});

// Add request interceptor to include socket ID in headers
api.interceptors.request.use(
  (config) => {
    const socketId = getSocketId();
    if (socketId) {
      config.headers['socket-id'] = socketId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Export the socket instance and the getSocketId function
export { socket, getSocketId };

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
  getJsonFile: (fileName) => api.get(`/json-files/${encodeURIComponent(fileName)}`),
  getStoriesByJsonFile: (fileName) => api.get(`/json-files/${encodeURIComponent(fileName)}/stories`),

  // Project Configuration operations
  getProjectConfig: (jsonFileName) => api.get(`/project-config/${encodeURIComponent(jsonFileName)}`),
  updateProjectConfig: (jsonFileName, data) => api.put(`/project-config/${encodeURIComponent(jsonFileName)}`, data),

  /**
   * Uploads a video file for transcription.
   * @param {File} file - The video file to upload.
   * @returns {Promise<object>} The response data from the upload endpoint.
   */
  uploadVideo: async (file) => {
    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await api.post('/transcription/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload Progress: ${percentCompleted}%`);
          // Emit upload progress to the socket
          socket.emit('upload-progress', { progress: percentCompleted, socketId: getSocketId() });
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading video:', error);
      throw error;
    }
  },
};

export default apiService;
