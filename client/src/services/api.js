// client/src/services/api.js
import axios from 'axios';

// Socket.IO está deshabilitado temporalmente
const getSocketId = () => {
  // No hacer nada, solo para mantener la compatibilidad
  return null;
};

// Función dummy para mantener la compatibilidad
const createDummySocket = () => ({
  id: 'dummy-socket-id',
  connected: false,
  on: () => {},
  off: () => {},
  emit: () => {},
  connect: () => {},
  disconnect: () => {}
});

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // Required for sending cookies/auth headers
  timeout: 10000, // Aumentar timeout a 10 segundos
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

/**
 * API service for interacting with the backend
 */
const apiService = {
  // Socket dummy para mantener la compatibilidad
  socket: createDummySocket(),
  // Funciones dummy para mantener la compatibilidad
  on: () => {},
  off: () => {},
  emit: () => {},
  // Column operations
  getColumns: (jsonFileName = null) => {
    const params = jsonFileName ? { jsonFileName } : {};
    return api.get('/columns', { params });
  },
  reorderColumns: (data) => {
    console.log('Enviando solicitud de reordenamiento al servidor:', data);
    return api.patch('/columns/reorder', data)
      .then(response => {
        console.log('Respuesta del servidor (reorderColumns):', response.data);
        return response;
      })
      .catch(error => {
        console.error('Error en reorderColumns:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        throw error;
      });
  },
  getColumn: (id) => api.get(`/columns/${id}`),
  createColumn: (data) => api.post('/columns', data),
  updateColumn: (id, data) => api.patch(`/columns/${id}`, data),
  updateColumnOrder: (columnIds) => api.patch('/columns/update-order', { columnIds }),
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
  deleteJsonFile: (fileName) => api.delete(`/json-files/${encodeURIComponent(fileName)}`),

  // Project Configuration operations
  getProjectConfig: (jsonFileName) => api.get(`/project-config/${encodeURIComponent(jsonFileName)}`),
  updateProjectConfig: (jsonFileName, data) => api.put(`/project-config/${encodeURIComponent(jsonFileName)}`, data),
  updateProjectConfig: (jsonFileName, data) => api.put(`/project-config/${encodeURIComponent(jsonFileName)}`, data),

  // Preguntas operations (deshabilitadas temporalmente)
  getPreguntas: () => Promise.resolve([]),
  createPregunta: () => Promise.resolve({}),
  updatePregunta: () => Promise.resolve({}),
  deletePregunta: () => Promise.resolve({}),

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
          // Emit upload progress to the socket (deshabilitado temporalmente)
          // apiService.socket.emit('upload-progress', { progress: percentCompleted, socketId: getSocketId() });
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
