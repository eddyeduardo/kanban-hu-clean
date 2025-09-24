import React, { useState, useRef, useCallback } from 'react';
import { FaUpload, FaSpinner, FaCheck, FaTimes, FaPause, FaPlay } from 'react-icons/fa';

// Tamaño de cada fragmento en bytes (50MB)
const CHUNK_SIZE = 50 * 1024 * 1024;

// Configuración de reintentos
const MAX_RETRIES = 3; // Número máximo de reintentos por fragmento
const RETRY_DELAY = 1000; // Tiempo base de espera entre reintentos en ms

/**
 * Componente para subir videos grandes mediante fragmentos
 */
const VideoUpload = ({ onUploadComplete, onError, apiEndpoint = '/api/transcription' }) => {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = React.useState(0);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [status, setStatus] = React.useState('');
  const [fileId, setFileId] = React.useState('');
  const [uploadedChunks, setUploadedChunks] = React.useState(0);
  const [totalChunks, setTotalChunks] = React.useState(0);
  const [uploadSpeed, setUploadSpeed] = React.useState('0 KB/s');
  const [timeRemaining, setTimeRemaining] = React.useState('--');
  const [resumeData, setResumeData] = React.useState(null);
  const uploadStartTime = React.useRef(null);
  const lastProgressUpdate = React.useRef(0);
  
  const uploadController = useRef(null);
  const retryCounts = useRef({});
  const pendingChunks = useRef([]);
  const isMounted = useRef(true);

  // Tipos de archivo permitidos con sus extensiones
  const ALLOWED_TYPES = {
    'video/mp4': ['.mp4', '.m4v'],
    'video/quicktime': ['.mov', '.qt'],
    'video/x-msvideo': ['.avi'],
    'video/x-ms-wmv': ['.wmv'],
    'video/x-matroska': ['.mkv'],
    'video/webm': ['.webm'],
    'video/3gpp': ['.3gp', '.3gpp'],
    'video/3gpp2': ['.3g2', '.3gpp2']
  };

  // Obtener todas las extensiones permitidas para el atributo accept
  const ALLOWED_EXTENSIONS = Object.values(ALLOWED_TYPES).flat().join(',');

  // Función para formatear bytes a una cadena legible
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Efecto para verificar subidas pendientes al cargar el componente
  React.useEffect(() => {
    const checkPendingUploads = async () => {
      console.log('Verificando subidas pendientes...');
      const savedData = localStorage.getItem('uploadResumeData');
      if (savedData) {
        console.log('Datos de reanudación encontrados:', JSON.parse(savedData));
        try {
          const { fileName, fileSize, timestamp } = JSON.parse(savedData);
          const hoursSinceLastAttempt = (Date.now() - timestamp) / (1000 * 60 * 60);
          
          if (hoursSinceLastAttempt < 24) { // Solo ofrecer reanudar si fue hace menos de 24 horas
            const shouldResume = window.confirm(
              `Tienes una subida incompleta de "${fileName}" (${formatFileSize(fileSize)}). ¿Deseas reanudarla?`
            );
            
            if (shouldResume) {
              // Aquí podrías implementar la lógica para reanudar la subida
              // cargando el archivo nuevamente y usando los datos guardados
              alert('Por favor, selecciona el mismo archivo para reanudar la subida.');
            } else {
              // Eliminar datos de reanudación si el usuario no quiere continuar
              localStorage.removeItem('uploadResumeData');
            }
          } else {
            // Eliminar datos de reanudación si han pasado más de 24 horas
            localStorage.removeItem('uploadResumeData');
          }
        } catch (error) {
          console.error('Error al procesar datos de reanudación:', error);
          localStorage.removeItem('uploadResumeData');
        }
      }
    };
    
    checkPendingUploads();
    
    // Limpiar al desmontar
    return () => {
      // No detenemos la subida si el componente se desmonta
      // Solo marcamos que el componente está desmontado
      isMounted.current = false;
    };
  }, []); // Eliminamos la dependencia a isUploading

  // Función para formatear el tamaño del archivo
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Manejar la selección de archivo
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    console.log('Archivo seleccionado:', {
      name: selectedFile.name,
      size: formatBytes(selectedFile.size),
      type: selectedFile.type
    });
    
    // Validar tipo de archivo
    const fileExtension = selectedFile.name.toLowerCase().slice(((selectedFile.name.lastIndexOf('.') - 1) >>> 0) + 2);
    const isValidType = Object.entries(ALLOWED_TYPES).some(([mime, exts]) => 
      selectedFile.type === mime || exts.some(ext => `.${fileExtension}` === ext.toLowerCase())
    );

    if (!isValidType) {
      onError?.(`Tipo de archivo no soportado. Formatos permitidos: ${Object.values(ALLOWED_TYPES).flat().join(', ')}`);
      return;
    }

    // Validar tamaño máximo (2GB)
    const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
    if (selectedFile.size > MAX_FILE_SIZE) {
      onError?.(`El archivo es demasiado grande. Tamaño máximo permitido: 2GB`);
      return;
    }

    setFile(selectedFile);
    setProgress(0);
    setStatus('');
    setFileId('');
    setUploadedChunks(0);
    setTotalChunks(Math.ceil(selectedFile.size / CHUNK_SIZE));
  };

  // Generar un ID único para el archivo
  const generateFileId = () => {
    return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Función para calcular la velocidad de carga y el tiempo restante
  const updateUploadStats = (loaded, total) => {
    const now = Date.now();
    const elapsed = (now - uploadStartTime.current) / 1000; // en segundos
    
    if (elapsed > 0) {
      const speed = loaded / elapsed; // bytes por segundo
      const remainingBytes = total - loaded;
      const remainingTime = remainingBytes / speed; // en segundos
      
      // Actualizar la velocidad de carga (KB/s o MB/s)
      if (speed > 1024 * 1024) {
        setUploadSpeed(`${(speed / (1024 * 1024)).toFixed(1)} MB/s`);
      } else {
        setUploadSpeed(`${(speed / 1024).toFixed(1)} KB/s`);
      }
      
      // Actualizar el tiempo restante
      if (remainingTime > 0) {
        const hours = Math.floor(remainingTime / 3600);
        const minutes = Math.floor((remainingTime % 3600) / 60);
        const seconds = Math.floor(remainingTime % 60);
        
        if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m`);
        } else if (minutes > 0) {
          setTimeRemaining(`${minutes}m ${seconds}s`);
        } else {
          setTimeRemaining(`${Math.max(1, seconds)}s`);
        }
      }
    }
  };

  // Función para subir un fragmento
  const uploadChunk = useCallback(async (fileId, chunk, chunkNumber, totalChunks) => {
    console.log(`[UPLOAD] Preparando subida del fragmento ${chunkNumber + 1}/${totalChunks}`);
    
    try {
      // Crear el FormData
      const formData = new FormData();
      
      // Verificar que el chunk sea válido
      if (!chunk || chunk.size === 0) {
        throw new Error(`Fragmento ${chunkNumber + 1} está vacío o es inválido`);
      }
      
      // Agregar datos al FormData
      formData.append('chunk', chunk, `chunk-${chunkNumber}`);
      formData.append('fileId', fileId);
      formData.append('chunkNumber', chunkNumber);
      formData.append('totalChunks', totalChunks);
      formData.append('fileName', file?.name || 'video.mp4');
      formData.append('fileType', file?.type || 'video/mp4');
      formData.append('chunkSize', chunk.size);

      const retryCount = retryCounts.current[chunkNumber] || 0;
      
      if (retryCount > MAX_RETRIES) {
        const errorMsg = `Número máximo de reintentos (${MAX_RETRIES}) alcanzado para el fragmento ${chunkNumber + 1}`;
        console.error('[UPLOAD]', errorMsg);
        throw new Error(errorMsg);
      }

      console.log(`[UPLOAD] Enviando fragmento ${chunkNumber + 1}/${totalChunks} (${formatBytes(chunk.size)})...`);
      console.log(`[UPLOAD] Intento ${retryCount + 1}/${MAX_RETRIES + 1}`);
      
      const startTime = Date.now();
      
      // Construir la URL correcta para la API
      const uploadUrl = `${apiEndpoint}${apiEndpoint.endsWith('/') ? '' : '/'}upload-chunk`;
      console.log(`[UPLOAD] URL de la API: ${uploadUrl}`);
      
      // Verificar si el controlador de aborto sigue activo
      if (uploadController.current?.signal?.aborted) {
        console.log('[UPLOAD] Subida cancelada por el usuario (antes de fetch)');
        throw new DOMException('Subida cancelada por el usuario', 'AbortError');
      }
      
      try {
        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
          signal: uploadController.current?.signal,
          // No establecer Content-Type, el navegador lo hará con el boundary correcto
          // headers: { 'Accept': 'application/json' },
          credentials: 'include'
        });
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000; // en segundos
        
        console.log(`[UPLOAD] Respuesta recibida en ${duration.toFixed(2)}s`);
        console.log(`[UPLOAD] Estado: ${response.status} ${response.statusText}`);
        
        // Verificar si la respuesta es OK
        if (!response.ok) {
          let errorText;
          try {
            errorText = await response.text();
            console.error('[UPLOAD] Error en la respuesta del servidor:', {
              status: response.status,
              statusText: response.statusText,
              body: errorText
            });
          } catch (e) {
            console.error('[UPLOAD] Error al leer el cuerpo de la respuesta de error:', e);
            errorText = 'No se pudo leer el mensaje de error del servidor';
          }
          
          const error = new Error(`Error en la subida (${response.status}): ${response.statusText}`);
          error.status = response.status;
          error.responseText = errorText;
          throw error;
        }

        // Procesar la respuesta exitosa
        let result;
        try {
          result = await response.json();
          console.log('[UPLOAD] Fragmento subido exitosamente:', result);
          return result;
        } catch (e) {
          console.error('[UPLOAD] Error al analizar la respuesta JSON:', e);
          throw new Error('La respuesta del servidor no es un JSON válido');
        }
        
      } catch (error) {
        console.error('[UPLOAD] Error en la petición fetch:', {
          name: error.name,
          message: error.message,
          type: error.type,
          code: error.code,
          status: error.status
        });
        throw error; // Relanzar para manejarlo en el catch externo
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`[UPLOAD] Subida del fragmento ${chunkNumber + 1} cancelada por el usuario`);
        throw error; // No reintentar si fue cancelado por el usuario
      }
      
      console.error(`[UPLOAD] Error al subir el fragmento ${chunkNumber + 1}:`, {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        status: error.status
      });
      
      // Si hay un error de red, mostrar más detalles
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.error('[UPLOAD] Error de red - Verifica lo siguiente:', [
          '1. ¿El servidor está en ejecución?',
          '2. ¿La URL de la API es correcta?',
          '3. ¿Hay algún problema de CORS?',
          '4. ¿Hay algún firewall bloqueando la conexión?'
        ].join('\n'));
      }
      
      // Reintentar si no se ha alcanzado el máximo de reintentos
      const currentRetry = retryCounts.current[chunkNumber] || 0;
      if (currentRetry < MAX_RETRIES) {
        const nextRetry = currentRetry + 1;
        const delay = Math.min(1000 * Math.pow(2, nextRetry - 1), 30000); // Backoff exponencial con máximo 30s
        
        console.log(`[UPLOAD] Reintentando fragmento ${chunkNumber + 1} (${nextRetry}/${MAX_RETRIES}) en ${delay}ms...`);
        
        retryCounts.current[chunkNumber] = nextRetry;
        
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(uploadChunk(fileId, chunk, chunkNumber, totalChunks));
          }, delay);
        });
      } else {
        console.error(`[UPLOAD] Se agotaron los reintentos para el fragmento ${chunkNumber + 1}`);
        throw new Error(`No se pudo subir el fragmento después de ${MAX_RETRIES} intentos: ${error.message}`);
      }
    }
  }, [apiEndpoint, file?.name, file?.type]);

  // Verificar fragmentos ya subidos
  const checkExistingChunks = async (fileId, totalChunks, fileSize) => {
    console.log('checkExistingChunks llamado con:', { fileId, totalChunks, fileSize });
    try {
      console.log('Enviando solicitud a:', `${apiEndpoint}/check-chunks`);
      const response = await fetch(`${apiEndpoint}/check-chunks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          totalChunks,
          fileSize
        })
      });

      console.log('Respuesta recibida, status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en la respuesta:', errorText);
        throw new Error('Error al verificar fragmentos existentes');
      }

      const data = await response.json();
      console.log('Fragmentos existentes:', data.uploadedChunks || []);
      return data.uploadedChunks || [];
    } catch (error) {
      console.error('Error en checkExistingChunks:', error);
      return [];
    }
  };

  // Combinar fragmentos en el servidor
  const combineChunks = useCallback(async (currentFileId, fileName, totalChunks) => {
    try {
      console.log('Enviando solicitud para combinar fragmentos con:', { 
        fileId: currentFileId, 
        fileName, 
        totalChunks 
      });
      
      const response = await fetch(`${apiEndpoint}/combine-chunks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: currentFileId,
          fileName: fileName,
          totalChunks: totalChunks
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error al combinar fragmentos. Respuesta del servidor:', errorData);
        throw new Error(`Error al combinar fragmentos: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error al combinar fragmentos:', error);
      throw error;
    }
  }, [apiEndpoint]);

  // Referencia para el contador de fragmentos subidos (se mueve al nivel del componente)
  const uploadedCountRef = useRef(0);
  
  // Procesar la cola de fragmentos
  const processQueue = useCallback(async (currentFileId) => {
    if (!isMounted.current || isPaused) {
      console.log(`[QUEUE] Procesamiento en pausa o componente desmontado`);
      return;
    }

    console.log(`[QUEUE] Iniciando procesamiento de cola. Fragmentos pendientes: ${pendingChunks.current.length}`);
    
    // Función para verificar si la subida está completa
    const checkIfUploadComplete = async () => {
      // Verificar si hay fragmentos pendientes
      if (pendingChunks.current.length === 0) {
        console.log('[QUEUE] No hay más fragmentos para procesar');
        // Verificar si la subida está completa
        if (uploadedCountRef.current >= totalChunks) {
          console.log('[QUEUE] Todos los fragmentos han sido subidos');
          // Llamar a la función para combinar fragmentos
          try {
            console.log(`[QUEUE] Llamando a combineChunks con fileId: ${currentFileId}, fileName: ${file.name}, totalChunks: ${totalChunks}`);
            const result = await combineChunks(currentFileId, file.name, totalChunks);
            console.log('[QUEUE] Fragmentos combinados exitosamente:', result);
            
            if (isMounted.current) {
              setStatus('¡Subida completada!');
              setProgress(100);
              setIsUploading(false);
              setFile(null);
              
              onUploadComplete?.({
                fileId: currentFileId,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                totalChunks: totalChunks,
                ...result
              });
            }
          } catch (error) {
            console.error('[QUEUE] Error al combinar fragmentos:', error);
            if (isMounted.current) {
              setStatus('Error al combinar fragmentos');
              onError?.(`Error al combinar fragmentos: ${error.message}`);
              setIsUploading(false);
            }
          }
        }
        return;
      }

      // Procesar el siguiente fragmento
      const nextChunk = pendingChunks.current.shift();
      if (!nextChunk) {
        console.log('[QUEUE] No hay más fragmentos pendientes');
        return;
      }

      console.log(`[QUEUE] Llamando a uploadChunk para fragmento ${nextChunk.chunkNumber + 1}...`);
      
      // Actualizar el contador de fragmentos subidos
      uploadedCountRef.current += 1;
      const newCount = uploadedCountRef.current;
      const progress = Math.round((newCount / totalChunks) * 100);
      
      console.log(`[QUEUE] Progreso actualizado a: ${progress}% (${newCount}/${totalChunks})`);
      
      // Actualizar el estado
      setUploadedChunks(newCount);
      setProgress(progress);
      setStatus(`Subiendo fragmentos (${newCount}/${totalChunks} completados)...`);
      
      // Forzar actualización del estado
      await new Promise(resolve => setTimeout(resolve, 0));

      // Subir el fragmento
      try {
        await uploadChunk(currentFileId, nextChunk.chunk, nextChunk.chunkNumber, totalChunks);
      } catch (error) {
        console.error('[QUEUE] Error al subir fragmento:', error);
        // Reintentar o cancelar según sea necesario
        if (isMounted.current) {
          setStatus(`Error al subir fragmento: ${error.message}`);
          onError?.(`Error al subir fragmento: ${error.message}`);
          setIsUploading(false);
        }
        return;
      }

      // Verificar si ya terminamos
      if (newCount >= totalChunks) {
        console.log('[QUEUE] Todos los fragmentos han sido subidos');
        checkIfUploadComplete();
        return;
      }
      
      // Procesar el siguiente fragmento en el siguiente ciclo de evento
      setTimeout(() => {
        if (isMounted.current) {
          checkIfUploadComplete();
        }
      }, 0);
    };

    // Iniciar el procesamiento de la cola
    checkIfUploadComplete();
  }, [apiEndpoint, file, isPaused, totalChunks, combineChunks, onUploadComplete, onError]);

  // Función para cancelar la subida
  const cancelUpload = useCallback(() => {
    if (uploadController.current) {
      uploadController.current.abort();
      uploadController.current = null;
    }
    
    // Limpiar estado
    setProgress(0);
    setStatus('Subida cancelada');
    setIsUploading(false);
    setIsPaused(false);
    pendingChunks.current = [];
    
    // Opcional: Llamar al endpoint para limpiar fragmentos
    if (fileId) {
      fetch(`${apiEndpoint}/cancel-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId })
      }).catch(console.error);
    }
  }, [apiEndpoint, fileId]);

  // Toggle para iniciar/pausar la subida
  const toggleUpload = async () => {
    // Asegurarse de que el componente esté montado
    isMounted.current = true;
    
    if (isPaused) {
      // Reanudar subida
      console.log('Reanudando subida...');
      setIsPaused(false);
      setStatus('Reanudando subida...');
      
      // Usar setTimeout para asegurar que el estado se actualice
      setTimeout(() => {
        processQueue(fileId);
      }, 100);
      return;
    }

    // Pausar subida
    if (isUploading) {
      console.log('Pausando subida...');
      setIsPaused(true);
      setStatus('Subida pausada');
      return;
    }

    // Iniciar nueva subida
    if (!file) {
      console.log('No hay archivo seleccionado');
      return;
    }

    console.log('Iniciando nueva subida para archivo:', file.name);
    const currentFileId = fileId || generateFileId();
    console.log('File ID generado:', currentFileId);
    
    setFileId(currentFileId);
    setIsUploading(true);
    setStatus('Preparando subida...');
    setProgress(0);
    setUploadedChunks(0);
    retryCounts.current = {};
    uploadController.current = new AbortController();
    
    console.log('Estado inicializado, verificando fragmentos existentes...');

    try {
      // Calcular el número total de fragmentos
      const totalChunksCount = Math.ceil(file.size / CHUNK_SIZE);
      console.log(`Total de fragmentos necesarios: ${totalChunksCount}`);
      
      // Verificar fragmentos existentes
      const existingChunks = await checkExistingChunks(currentFileId, totalChunksCount, file.size);
      console.log(`Fragmentos existentes: ${existingChunks.length}/${totalChunksCount}`);
      
      // Crear array de fragmentos para subir
      const chunksToUpload = [];
      for (let i = 0; i < totalChunksCount; i++) {
        if (!existingChunks.includes(i)) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(file.size, start + CHUNK_SIZE);
          console.log(`Creando fragmento ${i + 1}/${totalChunksCount}: bytes ${start} a ${end}`);
          const chunk = file.slice(start, end, file.type);
          chunksToUpload.push({ 
            chunk, 
            chunkNumber: i,
            start,
            end
          });
        }
      }

      console.log(`Fragmentos a subir: ${chunksToUpload.length}/${totalChunksCount}`);
      
      // Actualizar el estado con el total de fragmentos
      setTotalChunks(totalChunksCount);
      setUploadedChunks(existingChunks.length);
      setStatus(`Subiendo fragmentos (${existingChunks.length}/${totalChunksCount} completados)...`);
      
      // Iniciar la subida de fragmentos
      if (chunksToUpload.length > 0) {
        console.log('Iniciando subida de fragmentos...');
        pendingChunks.current = [...chunksToUpload];
        await processQueue(currentFileId);
      } else {
        console.log('No hay fragmentos nuevos para subir. Verificando si se puede combinar...');
        if (existingChunks.length >= totalChunksCount - 1) {
          console.log('Todos los fragmentos ya están subidos. Combinando...');
          await combineChunksAndComplete(currentFileId);
        } else {
          throw new Error('No hay fragmentos para subir pero tampoco hay suficientes para combinar');
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError' && isMounted.current) {
        console.error('Error en la subida:', error);
        setStatus('Error en la subida');
        onError?.(`Error al subir el archivo: ${error.message}`);
      }
    } finally {
      if (isMounted.current && !isPaused) {
        setIsUploading(false);
      }
    }
  };
  
  // Función auxiliar para combinar fragmentos y completar la subida
  const combineChunksAndComplete = useCallback(async (fileId) => {
    if (!file) return;
    
    setStatus('Combinando fragmentos...');
    try {
      const result = await combineChunks(fileId, file.name);
      
      if (!isMounted.current) return;
      
      console.log('Fragmentos combinados exitosamente:', result);
      setStatus('¡Subida completada!');
      setProgress(100);
      
      onUploadComplete?.({
        fileId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        ...result
      });
      
      // Limpiar el estado después de completar la subida
      setIsUploading(false);
      setFile(null);
      pendingChunks.current = [];
      
    } catch (error) {
      console.error('Error al combinar fragmentos:', error);
      if (isMounted.current) {
        setStatus('Error al combinar fragmentos');
        onError?.(`Error al combinar fragmentos: ${error.message}`);
        setIsUploading(false);
      }
      throw error;
    }
  }, [combineChunks, file, onUploadComplete, onError]);

  // La función cancelUpload ya está definida más arriba con useCallback

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="video-upload">
          Seleccionar video para transcripción
        </label>
        <div className="flex items-center space-x-4">
          <label className="flex-1">
            <input
              id="video-upload"
              type="file"
              accept={ALLOWED_EXTENSIONS}
              onChange={handleFileChange}
              disabled={isUploading && !isPaused}
              className="hidden"
            />
            <div className="flex items-center justify-between px-4 py-2 border rounded-md cursor-pointer hover:bg-gray-50">
              <span className="text-gray-700 truncate">
                {file ? file.name : 'Seleccionar archivo...'}
              </span>
              <FaUpload className="text-gray-500" />
            </div>
          </label>
          
          {file && (
            <div className="flex space-x-2">
              {!isUploading ? (
                <button
                  type="button"
                  onClick={toggleUpload}
                  disabled={!file}
                  className={`px-4 py-2 rounded-md text-white font-medium ${
                    file ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  Subir
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={toggleUpload}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 flex items-center space-x-2"
                  >
                    {isPaused ? (
                      <>
                        <FaPlay size={14} />
                        <span>Reanudar</span>
                      </>
                    ) : (
                      <>
                        <FaPause size={14} />
                        <span>Pausar</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={cancelUpload}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center space-x-2"
                  >
                    <FaTimes size={14} />
                    <span>Cancelar</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        
        {file && (
          <div className="mt-2 text-sm text-gray-500">
            Tamaño: {(file.size / (1024 * 1024)).toFixed(2)} MB • 
            Fragmentos: {totalChunks} • 
            {status}
          </div>
        )}
      </div>
      
      {progress > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progreso: {progress}%</span>
            <span>{uploadedChunks} de {totalChunks} fragmentos</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ 
                width: `${progress}%`,
                backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)',
                backgroundSize: '1rem 1rem',
                animation: 'progressStripes 1s linear infinite'
              }}
            ></div>
          </div>
          <style jsx>{`
            @keyframes progressStripes {
              0% { background-position: 1rem 0; }
              100% { backgroundPosition: 0 0; }
            }
          `}</style>
          
          {/* Información de progreso detallada */}
          <div className="w-full flex justify-between text-xs text-gray-500 mt-1">
            <span>{Math.round(progress)}% completado</span>
            <span>{uploadedChunks} de {totalChunks} fragmentos</span>
            <span>{uploadSpeed}</span>
            <span>{timeRemaining} restantes</span>
          </div>
        </div>
      )}
      
      {status && (
        <div className={`p-3 rounded-md text-sm ${
          status.includes('Error') || status.includes('cancelada')
            ? 'bg-red-100 text-red-700'
            : status.includes('completada')
            ? 'bg-green-100 text-green-700'
            : 'bg-blue-100 text-blue-700'
        }`}>
          <div className="flex items-center">
            {isUploading && !isPaused ? (
              <FaSpinner className="animate-spin mr-2" />
            ) : status.includes('completada') ? (
              <FaCheck className="mr-2" />
            ) : status.includes('Error') ? (
              <FaTimes className="mr-2" />
            ) : null}
            {status}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoUpload;
