import React, { useState } from 'react';
import axios from 'axios';

const VideoTranscription = () => {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcriptionResult, setTranscriptionResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'video/mp4') {
      setFile(selectedFile);
      setError(null);
    } else {
      setFile(null);
      setError('Por favor, selecciona un archivo MP4 válido.');
    }
  };

  const testServerConnection = async () => {
    try {
      console.log('Verificando conexión con el servidor...');
      const response = await axios.post('http://localhost:5000/api/transcription/test');
      console.log('Conexión con el servidor establecida:', response.data);
      return true;
    } catch (err) {
      console.error('Error al conectar con el servidor:', err);
      setError(`Error de conexión: ${err.message}. Verifica que el servidor esté en ejecución.`);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Por favor, selecciona un archivo MP4 válido.');
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setError(null);
    setTranscriptionResult(null);
    
    // Verificar conexión con el servidor antes de intentar cargar el archivo
    const serverConnected = await testServerConnection();
    if (!serverConnected) {
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('video', file);

    try {
      console.log('Enviando solicitud a la API de transcripción...');
      console.log('Archivo a enviar:', file.name, file.size, file.type);
      
      // Verificar que el FormData contiene el archivo
      console.log('FormData contiene:', formData.get('video') ? 'Archivo video presente' : 'Archivo video ausente');
      
      const response = await axios.post('http://localhost:5000/api/transcription/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
          console.log(`Progreso de carga: ${percentCompleted}%`);
        }
      });

      console.log('Respuesta recibida:', response.data);
      setTranscriptionResult(response.data);
      
      // Descargar automáticamente el archivo TXT
      if (response.data && response.data.files && response.data.files.txt) {
        console.log('Descargando automáticamente el archivo TXT...');
        downloadFile(response.data.files.txt);
      }
    } catch (err) {
      console.error('Error al procesar el video:', err);
      console.error('Detalles del error:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data
      });
      
      setError(
        err.response?.data?.message || 
        `Error ${err.response?.status || ''}: ${err.message}. Por favor, intenta de nuevo.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Función para descargar archivos usando un enlace temporal
  const downloadFile = (filename) => {
    const link = document.createElement('a');
    link.href = `http://localhost:5000/api/transcription/download/${filename}`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownload = (filename) => {
    downloadFile(filename);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold text-slate-700 mb-4">Transcripción de Video</h2>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Selecciona un archivo MP4
          </label>
          <input
            type="file"
            accept="video/mp4"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-medium
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          {file && (
            <p className="mt-2 text-sm text-slate-600">
              Archivo seleccionado: {file.name} ({Math.round(file.size / 1024 / 1024)} MB)
            </p>
          )}
        </div>
        
        <button
          type="submit"
          disabled={!file || isLoading}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            !file || isLoading ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Procesando...' : 'Transcribir Video'}
        </button>
      </form>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {isLoading && (
        <div className="mb-4">
          <p className="text-sm text-slate-600 mb-2">Subiendo y procesando video: {progress}%</p>
          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Este proceso puede tardar varios minutos dependiendo del tamaño del video.
          </p>
        </div>
      )}
      
      {transcriptionResult && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-slate-700 mb-3">Transcripción Completada</h3>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => handleDownload(transcriptionResult.files.txt)}
              className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
            >
              Descargar Texto (.txt)
            </button>
            <button
              onClick={() => handleDownload(transcriptionResult.files.vtt)}
              className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
            >
              Descargar Subtítulos (.vtt)
            </button>
            <button
              onClick={() => handleDownload(transcriptionResult.files.audio)}
              className="px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-700"
            >
              Descargar Audio (.mp3)
            </button>
          </div>
          
          <div className="border border-slate-200 rounded-md p-4 bg-slate-50 max-h-96 overflow-y-auto">
            <h4 className="text-sm font-medium text-slate-700 mb-2">Contenido de la Transcripción:</h4>
            <pre className="text-sm text-slate-600 whitespace-pre-wrap">
              {transcriptionResult.files.txtContent}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoTranscription;
