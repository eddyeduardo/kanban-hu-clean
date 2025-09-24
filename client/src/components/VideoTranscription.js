import React, { useState, useCallback } from 'react';
import axios from 'axios';
import VideoUpload from './VideoUpload';

const VideoTranscription = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  // Función para descargar archivos
  const downloadFile = useCallback((fileData) => {
    if (!fileData) return;
    
    try {
      const { content, filename } = fileData;
      if (!content || !filename) {
        console.error('Datos de archivo inválidos para descarga');
        return;
      }

      // Crear un enlace temporal para la descarga
      const link = document.createElement('a');
      link.href = `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error al descargar el archivo:', err);
      setError(`Error al descargar el archivo: ${err.message}`);
    }
  }, []);

  // Manejar la carga exitosa del archivo
  const handleUploadComplete = useCallback(async (fileInfo) => {
    if (!fileInfo?.fileId) {
      setError('Error: No se pudo completar la carga del archivo');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setTranscriptionResult(null);
    setProcessingProgress(0);

    try {
      console.log('Iniciando proceso de transcripción para el archivo:', fileInfo.fileId);
      
      // Monitorear el progreso de la transcripción
      const progressInterval = setInterval(async () => {
        try {
          const response = await axios.get(`http://localhost:5000/api/transcription/status/${fileInfo.fileId}`);
          if (response.data?.progress) {
            setProcessingProgress(response.data.progress);
          }
          if (response.data?.status === 'completed' || response.data?.status === 'failed') {
            clearInterval(progressInterval);
          }
        } catch (err) {
          console.error('Error al verificar el estado de la transcripción:', err);
        }
      }, 2000);

      // Iniciar la transcripción
      const response = await axios.post('http://localhost:5000/api/transcription/process', {
        fileId: fileInfo.fileId,
        fileName: fileInfo.fileName
      });

      clearInterval(progressInterval);
      
      if (response.data.success) {
        console.log('Transcripción completada:', response.data);
        setTranscriptionResult(response.data);
        setProcessingProgress(100);
        
        // Descargar automáticamente el archivo TXT si está disponible
        if (response.data.files?.txt) {
          downloadFile(response.data.files.txt);
        }
      } else {
        throw new Error(response.data.error || 'Error desconocido al procesar la transcripción');
      }
    } catch (err) {
      console.error('Error al procesar la transcripción:', err);
      setError(
        err.response?.data?.message || 
        `Error al procesar el video: ${err.message}. Por favor, intenta de nuevo.`
      );
    } finally {
      setIsProcessing(false);
    }
  }, [downloadFile]);

  // Función para descargar archivos usando un enlace temporal
  const handleDownload = (filename) => {
    if (!filename) return;
    
    // Remove any existing /api/transcription/download/ prefix if present
    const cleanFilename = filename.replace(/^\/api\/transcription\/download\//, '');
    
    const link = document.createElement('a');
    link.href = `http://localhost:5000/api/transcription/download/${cleanFilename}`;
    link.setAttribute('download', cleanFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Transcripción de Video</h2>
      
      <div className="space-y-6">
        <div>
          <VideoUpload 
            onUploadComplete={handleUploadComplete}
            onError={(error) => setError(error)}
            apiEndpoint="http://localhost:5000/api/transcription"
          />
          
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Mostrar estado del procesamiento */}
        {isProcessing && (
          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h3 className="text-lg font-medium text-blue-800 mb-2">Procesando video...</h3>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              ></div>
            </div>
            <p className="mt-2 text-sm text-blue-700">
              Progreso: {processingProgress}%
              <br />
              <span className="text-xs text-blue-600">
                Este proceso puede tardar varios minutos dependiendo del tamaño del video.
              </span>
            </p>
          </div>
        )}
      </div>
      
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
