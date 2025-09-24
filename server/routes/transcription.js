const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const OpenAI = require('openai');
require('dotenv').config();

// Configurar la ruta de FFmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Configurar el cliente de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configuración de directorios
const UPLOAD_DIR = path.join(__dirname, '../uploads');
const TEMP_DIR = path.join(UPLOAD_DIR, 'temp');

// Asegurar que los directorios existan
[UPLOAD_DIR, TEMP_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configuración de almacenamiento para fragmentos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, TEMP_DIR);
  },
  filename: function (req, file, cb) {
    const fileId = req.body.fileId || 'unknown';
    const chunkNumber = req.body.chunkNumber || '0';
    cb(null, `${fileId}-${chunkNumber}`);
  }
});

// Tipos de archivo permitidos con sus extensiones
const ALLOWED_MIME_TYPES = {
  'video/mp4': ['.mp4', '.m4v'],
  'video/quicktime': ['.mov', '.qt'],
  'video/x-msvideo': ['.avi'],
  'video/x-ms-wmv': ['.wmv'],
  'video/x-matroska': ['.mkv'],
  'video/webm': ['.webm'],
  'video/3gpp': ['.3gp', '.3gpp'],
  'video/3gpp2': ['.3g2', '.3gpp2'],
  'video/mpeg': ['.mp4'],
  'application/octet-stream': ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.wmv', '.3gp', '.3g2']
};

// Extensiones permitidas (para validación adicional)
const ALLOWED_EXTENSIONS = ['.mp4', '.m4v', '.mov', '.qt', '.avi', '.wmv', '.mkv', '.webm', '.3gp', '.3gpp', '.3g2', '.3gpp2'];

// Función para validar la extensión del archivo
const validateFileExtension = (filename, mimeType) => {
  const ext = path.extname(filename).toLowerCase();
  // Si el tipo MIME está en la lista de permitidos, verificar extensión
  if (ALLOWED_MIME_TYPES[mimeType]) {
    return ALLOWED_MIME_TYPES[mimeType].includes(ext);
  }
  // Si no está en la lista, verificar extensión directamente
  return ALLOWED_EXTENSIONS.includes(ext);
};

// Filtro de archivos mejorado
const fileFilter = (req, file, cb) => {
  try {
    console.log('Validando archivo:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      fieldname: file.fieldname
    });

    // Si es un chunk, solo verificamos el tipo MIME básico
    if (file.fieldname === 'chunk') {
      console.log('Validando chunk de archivo');
      
      // Verificar si el tipo MIME es válido para chunks
      const validMimeTypes = Object.keys(ALLOWED_MIME_TYPES);
      if (validMimeTypes.includes(file.mimetype) || 
          file.mimetype === 'application/octet-stream' ||
          file.mimetype.startsWith('video/') ||
          file.mimetype.startsWith('application/')) {
        console.log('Chunk aceptado');
        return cb(null, true);
      }
      
      console.log('Tipo MIME no permitido para chunk:', file.mimetype);
      return cb(new Error(`Tipo de archivo no permitido para chunk: ${file.mimetype}`), false);
    }

    // Para archivos completos (no chunks), hacer validación más estricta
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Verificar extensión del archivo
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      console.log('Extensión no permitida:', ext);
      return cb(new Error(`Extensión de archivo no permitida: ${ext}`), false);
    }

    // Verificar tipo MIME
    if (file.mimetype in ALLOWED_MIME_TYPES || 
        Object.values(ALLOWED_MIME_TYPES).some(exts => exts.includes(ext))) {
      console.log('Archivo aceptado:', file.originalname);
      return cb(null, true);
    }

    console.log('Tipo MIME no permitido:', file.mimetype);
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
    
  } catch (error) {
    console.error('Error en fileFilter:');
    console.error('Mensaje:', error.message);
    console.error('Código:', error.code);
    console.error('Stack:', error.stack);
    
    if (error.response) {
      // La solicitud fue hecha y el servidor respondió con un código de estado
      // que está fuera del rango 2xx
      console.error('Datos de la respuesta de error:', error.response.data);
      console.error('Estado de la respuesta:', error.response.status);
      console.error('Cabeceras de la respuesta:', error.response.headers);
    } else if (error.request) {
      // La solicitud fue hecha pero no se recibió respuesta
      console.error('No se recibió respuesta del servidor de OpenAI');
      console.error('Solicitud:', error.request);
    } else {
      // Algo sucedió en la configuración de la solicitud que desencadenó un error
      console.error('Error al configurar la solicitud:', error.message);
    }
    
    throw new Error(`Error al generar la transcripción: ${error.message}`);
  }
};

// Configuración de multer optimizada para fragmentos grandes
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB por fragmento (aumentado desde 50MB)
    files: 1,
    fieldSize: 100 * 1024 * 1024, // 100MB
    fieldNameSize: 1000, // Tamaño máximo del nombre del campo
    headerPairs: 2000 // Cantidad máxima de pares de cabecera
  },
  preservePath: true, // Preservar la ruta del archivo
  buffer: false // Desactivar el almacenamiento en buffer
});

// Configurar express para manejar cuerpos grandes
router.use(express.json({ 
  limit: '100mb', // Aumentado desde 10MB
  parameterLimit: 100000,
  extended: true 
}));

router.use(express.urlencoded({ 
  limit: '100mb', // Aumentado desde 10MB
  parameterLimit: 100000,
  extended: true 
}));

// Middleware para manejar timeouts y configuraciones de carga
const uploadMiddleware = (req, res, next) => {
  // Establecer un timeout muy alto para la carga de archivos
  req.setTimeout(0); // Sin timeout
  
  // Configurar headers para permitir cargas grandes
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=600');
  
  next();
};

// Ruta para subir un archivo de video (obsoleto, mantenida por compatibilidad)
router.post('/upload', 
  uploadMiddleware,
  (req, res) => {
    res.status(410).json({ 
      success: false,
      error: 'Método obsoleto',
      message: 'Por favor, utilice el nuevo sistema de carga por fragmentos',
      endpoints: {
        checkChunks: 'POST /api/transcription/check-chunks',
        uploadChunk: 'POST /api/transcription/upload-chunk',
        combineChunks: 'POST /api/transcription/combine-chunks',
        cancelUpload: 'POST /api/transcription/cancel-upload'
      }
    });
  }
);

// Limpieza de archivos temporales antiguos
function limpiarTemporales() {
  const maxAge = 24 * 60 * 60 * 1000; // 24 horas
  
  fs.readdir(TEMP_DIR, (err, files) => {
    if (err) {
      console.error('Error al leer directorio temporal:', err);
      return;
    }
    
    files.forEach(file => {
      const filePath = path.join(TEMP_DIR, file);
      
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        
        if (Date.now() - stats.mtime.getTime() > maxAge) {
          fs.unlink(filePath, err => {
            if (err) console.error('Error al eliminar archivo temporal:', filePath, err);
          });
        }
      });
    });
  });
}

// Ejecutar limpieza al iniciar y cada 24 horas
limpiarTemporales();
setInterval(limpiarTemporales, 24 * 60 * 60 * 1000);

// Limpiar archivos temporales más viejos de 24 horas
const cleanupOldFiles = () => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 horas
  
  // Limpiar archivos en el directorio de fragmentos
  fs.readdir(TEMP_DIR, (err, files) => {
    if (err) {
      console.error('Error al leer el directorio temporal:', err);
      return;
    }
    
    let deletedCount = 0;
    let errorCount = 0;
    
    files.forEach(file => {
      // Verificar si el archivo es un fragmento o un archivo temporal
      if (!file.match(/\.(chunk|part|tmp|temp)$/i) && !file.includes('_chunk_')) {
        return; // No es un archivo temporal, saltar
      }
      
      const filePath = path.join(TEMP_DIR, file);
      
      fs.stat(filePath, (err, stats) => {
        if (err) {
          errorCount++;
          return;
        }
        
        const fileAge = now - stats.mtimeMs;
        const isOldFile = fileAge > maxAge;
        const isOrphaned = file.match(/^[0-9a-f]{32}_chunk_\d+$/i) && 
                         !files.some(f => f.startsWith(file.split('_chunk_')[0] + '_'));
        
        if (isOldFile || isOrphaned) {
          fs.unlink(filePath, err => {
            if (err) {
              console.error(`Error al eliminar archivo temporal ${file}:`, err);
              errorCount++;
            } else {
              console.log(`Archivo temporal eliminado: ${file}`);
              deletedCount++;
            }
            
            // Verificar si es el último archivo y mostrar resumen
            if (deletedCount + errorCount >= files.length) {
              console.log(`Limpieza completada: ${deletedCount} archivos eliminados, ${errorCount} errores`);
            }
          });
        }
      });
    });
    
    if (files.length === 0) {
      console.log('No se encontraron archivos temporales para limpiar');
    }
  });
  
  // Limpiar directorios de transcripción antiguos (si existen)
  const transcriptionDir = path.join(__dirname, '../transcriptions');
  if (fs.existsSync(transcriptionDir)) {
    fs.readdir(transcriptionDir, (err, dirs) => {
      if (err) return;
      
      dirs.forEach(dir => {
        const dirPath = path.join(transcriptionDir, dir);
        fs.stat(dirPath, (err, stats) => {
          if (err || !stats.isDirectory()) return;
          
          const dirAge = now - stats.mtimeMs;
          if (dirAge > maxAge) {
            // Eliminar directorio y su contenido
            fs.rm(dirPath, { recursive: true }, err => {
              if (err) {
                console.error(`Error al eliminar directorio temporal ${dir}:`, err);
              } else {
                console.log(`Directorio temporal eliminado: ${dir}`);
              }
            });
          }
        });
      });
    });
  }
};

// Configurar limpieza programada
const setupCleanupSchedule = () => {
  // Ejecutar limpieza al iniciar con un pequeño retraso
  setTimeout(cleanupOldFiles, 10000); // 10 segundos después del inicio
  
  // Programar limpieza cada 6 horas
  const sixHours = 6 * 60 * 60 * 1000;
  setInterval(cleanupOldFiles, sixHours);
  
  // Limpiar al salir
  process.on('SIGINT', () => {
    console.log('Realizando limpieza final antes de salir...');
    cleanupOldFiles();
    process.exit(0);
  });
  
  process.on('uncaughtException', (err) => {
    console.error('Error no manejado:', err);
    cleanupOldFiles();
    process.exit(1);
  });
};

// Iniciar el programa de limpieza
setupCleanupSchedule();

// Almacenar el estado de las transcripciones en memoria
const transcriptionStatus = new Map();

// Endpoint para verificar el estado de una transcripción
router.get('/status/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const status = transcriptionStatus.get(fileId) || { status: 'not_found' };
    
    // Si el archivo de transcripción ya existe, devolver su información
    const txtPath = path.join(UPLOAD_DIR, `${fileId}.txt`);
    const vttPath = path.join(UPLOAD_DIR, `${fileId}.vtt`);
    
    if (fs.existsSync(txtPath) && fs.existsSync(vttPath)) {
      return res.json({
        success: true,
        status: 'completed',
        progress: 100,
        files: {
          txt: `/api/transcription/download/${path.basename(txtPath)}`,
          vtt: `/api/transcription/download/${path.basename(vttPath)}`
        }
      });
    }
    
    res.json({
      success: true,
      status: status.status || 'processing',
      progress: status.progress || 0,
      message: status.message || 'Procesando video...'
    });
    
  } catch (error) {
    console.error('Error al verificar el estado de la transcripción:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar el estado de la transcripción',
      details: error.message
    });
  }
});

// Endpoint para procesar un video
router.post('/process', 
  express.json({ limit: '10mb' }), // Aumentar el límite del tamaño del body
  async (req, res) => {
    console.log('=== INICIO DE SOLICITUD /process ===');
    
    // Validar que el cuerpo de la solicitud existe
    if (!req.body) {
      console.error('Error: No se recibió el cuerpo de la solicitud');
      return res.status(400).json({
        success: false,
        error: 'Se requiere un cuerpo JSON con fileId y fileName'
      });
    }
    
    const { fileId, fileName } = req.body;
    
    // Validar parámetros requeridos
    if (!fileId || !fileName) {
      const errorMsg = 'Se requieren fileId y fileName';
      console.error('Error en la solicitud:', errorMsg, { fileId, fileName });
      return res.status(400).json({
        success: false,
        error: errorMsg,
        received: { fileId, fileName }
      });
    }
    
    // Verificar si ya hay una transcripción en curso para este archivo
    if (transcriptionStatus.has(fileId) && 
        transcriptionStatus.get(fileId).status === 'processing') {
      const existingJob = transcriptionStatus.get(fileId);
      const message = `Ya hay una transcripción en curso para este archivo (iniciada el ${new Date(existingJob.startTime).toLocaleString()})`;
      
      console.warn(message, { fileId, existingJob });
      
      return res.status(409).json({
        success: false,
        error: message,
        jobStatus: existingJob
      });
    }
    
    // Inicializar el estado de la transcripción
    const jobStartTime = new Date().toISOString();
    const jobStatus = {
      status: 'processing',
      progress: 0,
      message: 'Iniciando procesamiento del video...',
      startTime: jobStartTime,
      fileId,
      fileName,
      lastUpdated: new Date().toISOString()
    };
    
    transcriptionStatus.set(fileId, jobStatus);
    
    console.log(`Iniciando procesamiento para fileId: ${fileId}, fileName: ${fileName}`);
    
    // Función para actualizar el estado de la transcripción
    const updateStatus = (updates) => {
      const currentStatus = transcriptionStatus.get(fileId) || {};
      const newStatus = { ...currentStatus, ...updates, lastUpdated: new Date().toISOString() };
      transcriptionStatus.set(fileId, newStatus);
      return newStatus;
    };
    
    try {
      console.log('=== BUSCANDO ARCHIVO DE VIDEO ===');
      console.log('FileId recibido:', fileId);
      console.log('FileName recibido:', fileName);
      
      // Listar archivos en el directorio para depuración
      const files = fs.readdirSync(UPLOAD_DIR);
      console.log('Archivos en el directorio de subidas:', files);
      
      // Buscar archivos que comiencen con el fileId
      const matchingFiles = files.filter(f => f.startsWith(`${fileId}-`));
      console.log('Archivos que coinciden con el fileId:', matchingFiles);
      
      if (matchingFiles.length === 0) {
        const errorMsg = `No se encontró ningún archivo con el fileId: ${fileId}\n` +
                       `Archivos disponibles: ${files.join(', ')}`;
        console.error(errorMsg);
        return res.status(404).json({
          success: false,
          error: 'No se encontró el archivo de video',
          details: errorMsg,
          availableFiles: files
        });
      }
      
      // Usar el primer archivo que coincida con el fileId
      const videoFileName = matchingFiles[0];
      const finalVideoPath = path.join(UPLOAD_DIR, videoFileName);
      console.log(`Usando archivo: ${finalVideoPath}`);
      
      // Verificar el tamaño del archivo
      const fileStats = fs.statSync(finalVideoPath);
      console.log('Archivo de video encontrado. Tamaño:', 
        (fileStats.size / (1024 * 1024)).toFixed(2), 'MB');
      
      // Actualizar estado
      transcriptionStatus.set(fileId, {
        status: 'processing',
        progress: 10,
        message: 'Extrayendo audio del video...'
      });
      
      // Extraer audio
      const audioPath = path.join(UPLOAD_DIR, `${fileId}.wav`);
      
      console.log('=== INICIANDO EXTRACCIÓN DE AUDIO ===');
      console.log('Video:', finalVideoPath);
      console.log('Tamaño del video:', (fs.statSync(finalVideoPath).size / (1024 * 1024)).toFixed(2), 'MB');
      console.log('Audio de salida:', audioPath);
      
      try {
        await extraerAudio(finalVideoPath, audioPath);
        console.log('Extracción de audio completada exitosamente');
      } catch (audioError) {
        console.error('=== ERROR DURANTE LA EXTRACCIÓN DE AUDIO ===');
        console.error('Mensaje:', audioError.message);
        console.error('Stack:', audioError.stack);
        
        // Verificar si el archivo de audio se creó parcialmente
        if (fs.existsSync(audioPath)) {
          console.log('Archivo de audio parcialmente creado. Tamaño:', 
            (fs.statSync(audioPath).size / (1024 * 1024)).toFixed(2), 'MB');
        }
        
        throw new Error(`Error al extraer el audio: ${audioError.message}`);
      }
      
      // Actualizar estado
      transcriptionStatus.set(fileId, {
        status: 'processing',
        progress: 30,
        message: 'Procesando audio...'
      });
      
      // Generar transcripción
      const result = await generarTranscripcion(audioPath);
      
      // Guardar archivos de transcripción
      const txtPath = path.join(UPLOAD_DIR, `${fileId}.txt`);
      const vttPath = path.join(UPLOAD_DIR, `${fileId}.vtt`);
      
      fs.writeFileSync(txtPath, result.text);
      fs.writeFileSync(vttPath, result.vtt);
      
      // Actualizar estado
      transcriptionStatus.set(fileId, {
        status: 'completed',
        progress: 100,
        message: 'Transcripción completada',
        files: {
          txt: `/api/transcription/download/${path.basename(txtPath)}`,
          vtt: `/api/transcription/download/${path.basename(vttPath)}`
        }
      });
      
      // Limpiar archivos temporales
      try {
        fs.unlinkSync(audioPath);
        fs.unlinkSync(finalVideoPath);
      } catch (error) {
        console.error('Error al limpiar archivos temporales:', error);
      }
      
      res.json({
        success: true,
        status: 'completed',
        progress: 100,
        message: 'Transcripción completada',
        files: {
          txt: `/api/transcription/download/${path.basename(txtPath)}`,
          vtt: `/api/transcription/download/${path.basename(vttPath)}`
        }
      });
      
    } catch (error) {
      console.error('Error al procesar el video:', error);
      transcriptionStatus.set(fileId, {
        status: 'error',
        progress: 0,
        message: `Error: ${error.message}`
      });
      
      res.status(500).json({
        success: false,
        status: 'error',
        error: 'Error al procesar el video',
        details: error.message
      });
    }
  }
);

// Endpoint para descargar archivos de transcripción
router.get('/download/:filename', (req, res) => {
  try {
    const filePath = path.join(UPLOAD_DIR, req.params.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Archivo no encontrado'
      });
    }
    
    res.download(filePath);
    
  } catch (error) {
    console.error('Error al descargar el archivo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al descargar el archivo',
      details: error.message
    });
  }
});

// Función para extraer el audio del video con configuración optimizada
async function extraerAudio(videoPath, audioPath) {
  console.log(`[${new Date().toISOString()}] Iniciando extracción de audio de ${videoPath} a ${audioPath}`);
  
  // Verificar que el archivo de video existe
  if (!fs.existsSync(videoPath)) {
    const error = new Error(`El archivo de video no existe: ${videoPath}`);
    error.code = 'ENOENT';
    console.error('Error en extraerAudio:', error.message);
    throw error;
  }
  
  // Verificar que FFmpeg está disponible
  if (!ffmpegInstaller.path) {
    const error = new Error('No se pudo encontrar la ruta de FFmpeg');
    console.error('Error en extraerAudio:', error.message);
    console.error('FFmpeg path:', ffmpegInstaller.path);
    throw error;
  }
  
  // Verificar que el archivo no esté vacío
  try {
    const stats = fs.statSync(videoPath);
    if (stats.size === 0) {
      throw new Error('El archivo de video está vacío');
    }
    console.log(`Tamaño del video: ${(stats.size / (1024 * 1024)).toFixed(2)}MB`);
  } catch (err) {
    console.error('Error al verificar el archivo de video:', err);
    throw err;
  }
  
  // Crear un directorio temporal único para el archivo de audio
  const tempDir = path.join(os.tmpdir(), `audio-${Date.now()}`);
  const tempAudioPath = path.join(tempDir, path.basename(audioPath));
  
  try {
    // Asegurarse de que el directorio temporal existe
    fs.mkdirSync(tempDir, { recursive: true });
    
    console.log(`Usando directorio temporal: ${tempDir}`);
    
    // Crear una promesa que maneje la extracción de audio
    const extractPromise = new Promise((resolve, reject) => {
      // Configuración optimizada para reducir tamaño
      const command = ffmpeg(videoPath)
        .setFfmpegPath(ffmpegInstaller.path)
        .output(tempAudioPath)
        .audioCodec('libmp3lame')
        .audioBitrate('48k')
        .audioChannels(1)
        .outputOptions([
          '-ar 16000',
          '-af volume=1.5',
          '-y' // Sobrescribir archivo si existe
        ]);
      
      // Manejo de eventos
      command
        .on('start', (cmd) => {
          console.log('=== COMANDO FFMPEG EJECUTADO ===');
          console.log(cmd);
          console.log('================================');
        })
        .on('stderr', (stderrLine) => {
          console.log('FFmpeg stderr:', stderrLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`Progreso: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log('FFmpeg finalizó la extracción');
          resolve();
        })
        .on('error', (err, stdout, stderr) => {
          console.error('Error en FFmpeg:', err);
          console.error('Salida estándar:', stdout);
          console.error('Error estándar:', stderr);
          reject(new Error(`Error al procesar el video con FFmpeg: ${err.message}`));
        });
      
      // Iniciar la extracción
      command.run();
    });
    
    // Configurar un timeout para la operación (15 minutos)
    const timeoutMs = 15 * 60 * 1000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Tiempo de espera agotado (${timeoutMs/60000} minutos) al extraer audio`));
      }, timeoutMs);
    });
    
    // Esperar a que termine la extracción o se agote el tiempo
    await Promise.race([extractPromise, timeoutPromise]);
    
    // Verificar que el archivo de audio se creó correctamente
    if (!fs.existsSync(tempAudioPath)) {
      throw new Error(`No se pudo crear el archivo de audio en ${tempAudioPath}`);
    }
    
    const stats = fs.statSync(tempAudioPath);
    if (stats.size === 0) {
      throw new Error(`El archivo de audio generado está vacío: ${tempAudioPath}`);
    }
    
    console.log(`Audio extraído exitosamente: ${tempAudioPath} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
    
    // Mover el archivo a su ubicación final
    fs.renameSync(tempAudioPath, audioPath);
    console.log(`Audio movido a: ${audioPath}`);
    
    return audioPath;
    
  } catch (error) {
    console.error('Error durante la extracción de audio:', error);
    
    // Limpiar archivos temporales en caso de error
    try {
      if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
      if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
    } catch (cleanupError) {
      console.error('Error al limpiar archivos temporales:', cleanupError);
    }
    
    throw error;
  } finally {
    // Limpiar el directorio temporal si está vacío
    try {
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        if (files.length === 0) {
          fs.rmdirSync(tempDir);
        }
      }
    } catch (cleanupError) {
      console.error('Error al limpiar directorio temporal:', cleanupError);
    }
  }
}

// Función para dividir el archivo de audio en segmentos
async function dividirAudio(audioPath, segmentDuration = 300) { // 5 minutos por defecto
  const outputPattern = path.join(
    path.dirname(audioPath),
    `${path.basename(audioPath, path.extname(audioPath))}_%03d.mp3`
  );
  
  await new Promise((resolve, reject) => {
    ffmpeg(audioPath)
      .output(outputPattern)
      .outputOptions([
        '-c copy',
        '-f segment',
        `-segment_time ${segmentDuration}`,
        '-reset_timestamps 1'
      ])
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  // Retornar lista de segmentos generados
  const baseName = path.basename(audioPath, path.extname(audioPath));
  return fs.readdirSync(path.dirname(audioPath))
    .filter(f => f.startsWith(`${baseName}_`) && f.endsWith('.mp3'))
    .sort()
    .map(f => path.join(path.dirname(audioPath), f));
}

// Función para transcribir un archivo de audio usando la API de OpenAI
async function transcribirConOpenAI(audioPath) {
  console.log(`Transcribiendo archivo: ${audioPath}`);
  
  try {
    // Usar el cliente oficial de OpenAI
    const { OpenAI } = require('openai');
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
      response_format: 'json'
    });
    
    return transcription.text || '';
  } catch (error) {
    console.error('Error en transcribirConOpenAI:', error);
    throw new Error(`Error en la API de OpenAI: ${error.message}`);
  }
}

// Función auxiliar para hacer peticiones con reintentos
async function fetchWithRetry(fn, maxRetries = 3, delayMs = 2000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Intento ${attempt} de ${maxRetries}...`);
      return await fn();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === maxRetries;
      const isRateLimit = error.status === 429;
      const isServerError = error.status >= 500 && error.status < 600;
      
      console.error(`Error en intento ${attempt}:`, error.message);
      
      if (isLastAttempt || (!isRateLimit && !isServerError)) {
        console.error('No se reintentará:', error.message);
        break;
      }
      
      // Calcular tiempo de espera exponencial
      const waitTime = delayMs * Math.pow(2, attempt - 1);
      console.log(`Reintentando en ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
}

// Función para generar el archivo .vtt y .txt usando OpenAI
async function generarTranscripcion(audioPath, fileId) {
  const startTime = Date.now();
  const updateInterval = 5000; // Actualizar progreso cada 5 segundos
  let lastUpdate = Date.now();
  
  // Función para actualizar el estado de progreso
  const updateProgress = (progress, message = '') => {
    const currentTime = Date.now();
    // Solo actualizar si ha pasado el tiempo mínimo entre actualizaciones
    if (currentTime - lastUpdate >= updateInterval || progress === 100) {
      console.log(`[${new Date().toISOString()}] Progreso: ${progress}% - ${message}`);
      if (fileId && transcriptionStatus.has(fileId)) {
        const currentStatus = transcriptionStatus.get(fileId);
        transcriptionStatus.set(fileId, {
          ...currentStatus,
          progress: Math.min(100, Math.max(0, progress)), // Asegurar que esté entre 0 y 100
          message: message || currentStatus.message,
          lastUpdated: new Date().toISOString()
        });
      }
      lastUpdate = currentTime;
    }
  };
  
  // Función para convertir tiempo en segundos a formato VTT (HH:MM:SS.mmm)
  function formatTime(seconds) {
    const date = new Date(0);
    date.setSeconds(seconds);
    return date.toISOString().substr(11, 12).replace('.', ',');
  }
  
  // Función para generar el contenido VTT a partir del texto
  function generateVTT(text) {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    let vttContent = 'WEBVTT\n\n';
    
    lines.forEach((line, index) => {
      // Crear un timestamp basado en el índice (esto es un ejemplo, deberías usar timestamps reales si los tienes)
      const startTime = index * 5; // 5 segundos por línea
      const endTime = startTime + 4.9;
      
      vttContent += `${index + 1}\n`;
      vttContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
      vttContent += `${line}\n\n`;
    });
    
    return vttContent;
  }
  
  // Configurar timeout para la transcripción (30 minutos)
  const controller = new AbortController();
  const timeoutDuration = 30 * 60 * 1000; // 30 minutos
  const timeoutId = setTimeout(() => {
    console.error(`[${new Date().toISOString()}] Timeout alcanzado después de ${timeoutDuration/1000} segundos`);
    controller.abort();
  }, timeoutDuration);

  try {
    console.log(`[${new Date().toISOString()}] Iniciando transcripción para: ${audioPath}`);
    updateProgress(30, 'Preparando archivo de audio...');
    
    // Verificar que la API key de OpenAI está configurada
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('La clave de API de OpenAI no está configurada en las variables de entorno');
    }
    
    // Verificar que el archivo de audio existe
    if (!fs.existsSync(audioPath)) {
      throw new Error(`El archivo de audio no existe: ${audioPath}`);
    }
    
    // Verificar tamaño del archivo (máx 25MB para Whisper)
    const stats = fs.statSync(audioPath);
    const maxSize = 25 * 1024 * 1024; // 25MB
    
    updateProgress(35, 'Analizando archivo de audio...');
    
    let transcriptionText = '';
    let segments = [];
    
    if (stats.size > maxSize) {
      // Procesamiento para archivos grandes (dividir en segmentos)
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`Archivo de audio demasiado grande (${sizeMB}MB), dividiendo en segmentos...`);
      updateProgress(40, `Dividiendo archivo grande (${sizeMB}MB) en segmentos más pequeños...`);
      
      segments = await dividirAudio(audioPath);
      console.log(`Archivo dividido en ${segments.length} segmentos`);
      updateProgress(45, `Procesando ${segments.length} segmentos de audio...`);
      
      const segmentResults = [];
      const segmentProgress = 50 / segments.length; // 50% del progreso total para los segmentos
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        console.log(`Procesando segmento ${i + 1}/${segments.length}: ${segment}`);
        updateProgress(
          45 + (i * segmentProgress), 
          `Procesando segmento ${i + 1}/${segments.length}...`
        );
        
        try {
          const result = await transcribirConOpenAI(segment);
          segmentResults.push(result);
          console.log(`Segmento ${i + 1} completado`);
        } catch (error) {
          console.error(`Error en segmento ${i + 1}:`, error);
          // Continuar con los demás segmentos en lugar de fallar completamente
          continue;
        }
      }
      
      if (segmentResults.length === 0) {
        throw new Error('No se pudo procesar ningún segmento de audio');
      }
      
      updateProgress(95, 'Combinando resultados de los segmentos...');
      // Combinar resultados de los segmentos
      transcriptionText = segmentResults.join('\n\n');
    } else {
      // Procesamiento para archivos pequeños (menos de 25MB)
      updateProgress(50, 'Transcribiendo audio...');
      console.log(`Transcribiendo archivo de audio (${(stats.size / (1024 * 1024)).toFixed(2)}MB)...`);
      
      try {
        transcriptionText = await transcribirConOpenAI(audioPath);
        updateProgress(95, 'Transcripción completada');
      } catch (error) {
        console.error('Error en la transcripción:', error);
        throw new Error(`Error al transcribir el audio: ${error.message}`);
      }
    }
    
    // Generar formato VTT
    updateProgress(97, 'Generando formato VTT...');
    const vttContent = generateVTT(transcriptionText);
    
    // Retornar resultados
    return {
      text: transcriptionText,
      vtt: vttContent,
      segments: transcriptionText.split('\n\n').map((text, index) => ({
        segment: index + 1,
        text: text.trim()
      }))
    };
  } catch (error) {
    const errorTime = Date.now();
    const duration = (errorTime - startTime) / 1000;
    console.error(`[${new Date().toISOString()}] Error después de ${duration.toFixed(2)}s en generarTranscripcion:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      status: error.status,
      path: audioPath,
      stack: error.stack
    });
    
    // Proporcionar un mensaje de error más descriptivo
    let errorMessage = 'Error al generar la transcripción';
    
    if (error.name === 'AbortError' || error.code === 'ABORT_ERR') {
      errorMessage = `La transcripción excedió el tiempo máximo de espera (${timeoutDuration/1000}s)`;
    } else if (error.code === 'ENOENT') {
      errorMessage = `No se pudo encontrar el archivo de audio: ${audioPath}`;
    } else if (error.response) {
      errorMessage = `Error de la API de OpenAI: ${error.response.status} - ${error.response.statusText}`;
      console.error('Detalles del error de la API:', error.response.data);
    } else {
      errorMessage = `Error al generar la transcripción: ${error.message}`;
    }
    
    const enhancedError = new Error(errorMessage);
    enhancedError.originalError = error;
    throw enhancedError;
  } finally {
    // No es necesario cerrar nada ya que usamos readFileSync
    
    // Registrar duración total del proceso
    const endTime = Date.now();
    console.log(`Tiempo total de transcripción: ${(endTime - startTime) / 1000} segundos`);
  }
}; // Cierre de la función generarTranscripcion

// Ruta para verificar fragmentos existentes
router.post('/check-chunks', 
  uploadMiddleware,
  express.json(),
  async (req, res) => {
    try {
      const { fileId, totalChunks, fileSize } = req.body;
      
      console.log(`\n=== Verificación de fragmentos existentes ===`);
      console.log(`Archivo ID: ${fileId}`);
      console.log(`Total de fragmentos esperados: ${totalChunks}`);
      console.log(`Tamaño total del archivo: ${fileSize} bytes`);
      
      // Validar parámetros requeridos
      if (!fileId || !totalChunks) {
        const errorMsg = 'Faltan parámetros requeridos (fileId, totalChunks)';
        console.error(`Error: ${errorMsg}`);
        return res.status(400).json({ 
          success: false,
          error: errorMsg 
        });
      }
      
      // Directorio donde se almacenan los fragmentos
      const chunkDir = path.join(TEMP_DIR, fileId);
      
      // Verificar si el directorio de fragmentos existe
      if (!fs.existsSync(chunkDir)) {
        console.log('No se encontraron fragmentos existentes');
        return res.status(200).json({
          success: true,
          fileId,
          totalChunks: parseInt(totalChunks),
          uploadedChunks: [],
          isComplete: false
        });
      }
      
      // Leer fragmentos existentes
      const chunkFiles = fs.readdirSync(chunkDir)
        .filter(file => file.startsWith('chunk-'))
        .sort();
      
      console.log(`Fragmentos encontrados: ${chunkFiles.length}/${totalChunks}`);
      
      // Determinar si la carga está completa
      const isComplete = chunkFiles.length >= parseInt(totalChunks);
      
      // Si está completa, verificar el tamaño total
      let totalSize = 0;
      if (isComplete) {
        totalSize = chunkFiles.reduce((sum, file) => {
          const stats = fs.statSync(path.join(chunkDir, file));
          return sum + stats.size;
        }, 0);
        
        console.log(`Tamaño total de fragmentos: ${totalSize} bytes`);
        
        // Si el tamaño no coincide, considerar la carga como incompleta
        if (fileSize && totalSize !== parseInt(fileSize)) {
          console.warn('El tamaño total de los fragmentos no coincide con el tamaño del archivo');
          isComplete = false;
        }
      }
      
      // Extraer números de fragmento
      const uploadedChunks = chunkFiles.map(file => {
        const match = file.match(/chunk-(\d+)/);
        return match ? parseInt(match[1]) : -1;
      }).filter(n => n >= 0);
      
      // Enviar respuesta
      return res.status(200).json({
        success: true,
        fileId,
        totalChunks: parseInt(totalChunks),
        uploadedChunks,
        isComplete,
        totalSize
      });
      
    } catch (error) {
      console.error('Error al verificar fragmentos:', error);
      return res.status(500).json({
        success: false,
        error: 'Error al verificar fragmentos existentes',
        details: error.message
      });
    }
  }
);

// Ruta para subir un fragmento de archivo
router.post('/upload-chunk', 
  uploadMiddleware,
  upload.single('chunk'),
  async (req, res) => {
    try {
      const { fileId, chunkNumber, totalChunks, fileName, fileType } = req.body;
      
      console.log(`\n=== Inicio de subida de fragmento ===`);
      console.log(`Archivo: ${fileName} (${fileId})`);
      console.log(`Fragmento: ${parseInt(chunkNumber) + 1}/${totalChunks}`);
      console.log(`Tamaño del fragmento recibido: ${req.file ? req.file.size : 0} bytes`);
      
      // Validar parámetros requeridos
      if (!fileId || chunkNumber === undefined || !totalChunks || !fileName) {
        const errorMsg = 'Faltan parámetros requeridos';
        console.error(`Error: ${errorMsg}`, { fileId, chunkNumber, totalChunks, fileName });
        return res.status(400).json({ 
          success: false,
          error: errorMsg 
        });
      }
      
      // Validar que se recibió un archivo
      if (!req.file) {
        const errorMsg = 'No se recibió ningún fragmento de archivo';
        console.error(`Error: ${errorMsg}`);
        return res.status(400).json({ 
          success: false,
          error: 'No se recibió ningún fragmento o el archivo es inválido' 
        });
      }
      
      // Validar el tipo MIME del fragmento
      const isValidMimeType = Object.keys(ALLOWED_MIME_TYPES).includes(req.file.mimetype);
      if (!isValidMimeType) {
        // Eliminar el archivo subido si el tipo no es válido
        if (req.file && req.file.path) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ 
          success: false,
          error: `Tipo de archivo no permitido: ${req.file.mimetype}`,
          allowedTypes: Object.keys(ALLOWED_MIME_TYPES)
        });
      }
      
      // Crear directorio para los fragmentos si no existe
      const chunkDir = path.join(TEMP_DIR, fileId);
      if (!fs.existsSync(chunkDir)) {
        fs.mkdirSync(chunkDir, { recursive: true });
      }
      
      // Mover el archivo temporal a la ubicación correcta de forma segura
      const chunkFilename = `chunk-${String(chunkNumber).padStart(5, '0')}`;
      const chunkPath = path.join(chunkDir, chunkFilename);
      
      // Usar un enfoque más seguro para mover el archivo
      let readStream, writeStream;
      try {
        // Primero copiar y luego eliminar el original
        readStream = fs.createReadStream(req.file.path);
        writeStream = fs.createWriteStream(chunkPath);
        
        // Manejar errores de los streams
        readStream.on('error', (err) => {
          console.error('Error en el stream de lectura:', err);
          if (writeStream) writeStream.destroy();
        });
        
        writeStream.on('error', (err) => {
          console.error('Error en el stream de escritura:', err);
          if (readStream) readStream.destroy();
        });
        
        // Usar pipeline para un manejo más robusto de los streams
        const { pipeline } = require('stream/promises');
        await pipeline(readStream, writeStream);
        
        console.log(`Fragmento copiado exitosamente a: ${chunkPath}`);
        
        // Cerrar los streams
        if (readStream) readStream.close();
        if (writeStream) writeStream.close();
        
        // Esperar un momento para asegurar que el sistema operativo haya liberado el archivo
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Eliminar el archivo temporal
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (err) {
        console.error('Error al procesar el fragmento:', err);
        
        // Cerrar los streams si existen
        if (readStream) readStream.close();
        if (writeStream) writeStream.close();
        
        // Limpiar archivos temporales
        const cleanup = async () => {
          try {
            if (req.file?.path && fs.existsSync(req.file.path)) {
              await fs.promises.unlink(req.file.path);
            }
            if (chunkPath && fs.existsSync(chunkPath)) {
              await fs.promises.unlink(chunkPath);
            }
          } catch (cleanupErr) {
            console.error('Error al limpiar archivos temporales:', cleanupErr);
          }
        };
        
        await cleanup();
        
        // Lanzar un error más descriptivo
        throw new Error(`Error al procesar el fragmento: ${err.message}`);
      } finally {
        // Asegurarse de que los streams estén cerrados
        if (readStream) readStream.destroy();
        if (writeStream) writeStream.destroy();
      }
      
      // Verificar fragmentos subidos
      const uploadedChunks = fs.readdirSync(chunkDir)
        .filter(file => file.startsWith('chunk-'))
        .sort();
      
      const isComplete = uploadedChunks.length >= parseInt(totalChunks);
      
      // Registrar información de depuración
      console.log(`Fragmento ${chunkNumber} guardado en: ${chunkPath}`);
      console.log(`Fragmentos subidos: ${uploadedChunks.length}/${totalChunks}`);
      console.log(`¿Subida completa?: ${isComplete ? 'Sí' : 'No'}`);
      
      // Si la subida está completa, podemos iniciar el proceso de combinación
      if (isComplete) {
        console.log(`Todos los fragmentos (${totalChunks}) han sido subidos correctamente`);
        // Aquí podrías iniciar automáticamente el proceso de combinación
        // o simplemente notificar al frontend para que lo inicie
      }
      
      // Enviar respuesta exitosa
      return res.status(200).json({
        success: true,
        chunkNumber: parseInt(chunkNumber),
        totalChunks: parseInt(totalChunks),
        uploadedChunks: uploadedChunks.length,
        isComplete,
        fileId,
        message: 'Fragmento subido correctamente'
      });
      
    } catch (error) {
      console.error('Error al procesar el fragmento:', error);
      return res.status(500).json({
        success: false,
        error: 'Error al procesar el fragmento',
        details: error.message
      });
    }
  }
);

// Ruta para combinar fragmentos
router.post('/combine-chunks', 
  uploadMiddleware,
  express.json({ limit: '10mb' }),
  async (req, res) => {
    const startTime = Date.now();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`\n[${requestId}] Iniciando combinación de fragmentos`, {
      fileId: req.body.fileId,
      fileName: req.body.fileName,
      totalChunks: req.body.totalChunks
    });
    
    try {
      const { fileId, fileName, totalChunks } = req.body;
      
      if (!fileId || !fileName || !totalChunks) {
        const errorMsg = 'Faltan parámetros requeridos (fileId, fileName, totalChunks)';
        console.error(`[${requestId}] ${errorMsg}`);
        return res.status(400).json({ 
          success: false,
          error: errorMsg 
        });
      }
      
      const outputFileName = `${fileId}-${Date.now()}-${path.basename(fileName)}`;
      const outputPath = path.join(UPLOAD_DIR, outputFileName);
      
      // Crear el directorio de salida si no existe
      if (!fs.existsSync(path.dirname(outputPath))) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      }
      
      console.log(`[${requestId}] Combinando ${totalChunks} fragmentos en: ${outputPath}`);
      
      // Verificar que todos los fragmentos existen antes de empezar
      const chunkDir = path.join(TEMP_DIR, fileId);
      console.log(`[${requestId}] Buscando fragmentos en: ${chunkDir}`);
      
      // Verificar que el directorio existe
      if (!fs.existsSync(chunkDir)) {
        const errorMsg = `No se encontró el directorio de fragmentos para el archivo ${fileId}`;
        console.error(`[${requestId}] ${errorMsg}`);
        return res.status(400).json({
          success: false,
          error: errorMsg
        });
      }
      
      // Listar todos los fragmentos en el directorio
      const chunkFiles = fs.readdirSync(chunkDir)
        .filter(file => file.startsWith('chunk-'))
        .sort((a, b) => {
          const numA = parseInt(a.replace('chunk-', ''));
          const numB = parseInt(b.replace('chunk-', ''));
          return numA - numB;
        });
      
      console.log(`[${requestId}] Fragmentos encontrados:`, chunkFiles);
      
      // Verificar que tenemos todos los fragmentos necesarios
      const missingChunks = [];
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(chunkDir, `chunk-${String(i).padStart(5, '0')}`);
        console.log(`[${requestId}] Verificando fragmento ${i} en: ${chunkPath}`);
        
        if (!fs.existsSync(chunkPath)) {
          console.error(`[${requestId}] Fragmento ${i} no encontrado`);
          missingChunks.push(i);
        } else {
          const stats = fs.statSync(chunkPath);
          console.log(`[${requestId}] Fragmento ${i} encontrado, tamaño: ${stats.size} bytes`);
        }
      }
      
      if (missingChunks.length > 0) {
        const errorMsg = `Faltan fragmentos: ${missingChunks.join(', ')}`;
        console.error(`[${requestId}] ${errorMsg}`);
        return res.status(400).json({
          success: false,
          error: errorMsg,
          missingChunks,
          availableChunks: chunkFiles
        });
      }
      
      // Crear el stream de escritura
      const writeStream = fs.createWriteStream(outputPath, { flags: 'a' });
      
      // Función para escribir un chunk de forma secuencial
      const processChunk = async (chunkNumber) => {
        const chunkFilename = `chunk-${String(chunkNumber).padStart(5, '0')}`;
        const chunkPath = path.join(chunkDir, chunkFilename);
        
        console.log(`[${requestId}] Procesando fragmento ${chunkNumber} desde: ${chunkPath}`);
        
        try {
          // Leer el chunk completo en memoria
          const chunkData = await fs.promises.readFile(chunkPath);
          console.log(`[${requestId}] Fragmento ${chunkNumber} leído, tamaño: ${chunkData.length} bytes`);
          
          // Escribir el chunk en el archivo de salida
          await new Promise((resolve, reject) => {
            writeStream.write(chunkData, (error) => {
              if (error) {
                console.error(`[${requestId}] Error al escribir fragmento ${chunkNumber}:`, error);
                return reject(error);
              }
              console.log(`[${requestId}] Fragmento ${chunkNumber} escrito correctamente`);
              resolve();
            });
          });
          
          // Eliminar el chunk después de escribirlo
          try {
            await fs.promises.unlink(chunkPath);
            console.log(`[${requestId}] Fragmento ${chunkNumber} eliminado correctamente`);
          } catch (unlinkError) {
            console.error(`[${requestId}] Error al eliminar fragmento ${chunkNumber}:`, unlinkError);
            // No fallar si no se puede eliminar, solo registrar el error
          }
          
        } catch (error) {
          console.error(`[${requestId}] Error al procesar fragmento ${chunkNumber}:`, error);
          throw error;
        }
      };
      
      // Procesar los chunks de forma secuencial para evitar problemas de concurrencia
      for (let i = 0; i < totalChunks; i++) {
        await processChunk(i);
      }
      
      // Cerrar el stream de escritura
      await new Promise((resolve, reject) => {
        writeStream.on('error', reject);
        writeStream.end(() => {
          console.log(`[${requestId}] Archivo combinado guardado en: ${outputPath}`);
          resolve();
        });
      });
      
      // Verificar que el archivo de salida existe y tiene un tamaño válido
      const stats = await fs.promises.stat(outputPath);
      if (stats.size === 0) {
        throw new Error('El archivo de salida está vacío');
      }
      
      console.log(`[${requestId}] Combinación completada en ${(Date.now() - startTime) / 1000} segundos`);
      
      // Enviar respuesta exitosa
      return res.json({
        success: true,
        message: 'Archivo combinado exitosamente',
        filePath: outputPath,
        fileName: outputFileName,
        fileSize: stats.size
      });
      
    } catch (error) {
      console.error(`[${requestId}] Error al combinar fragmentos:`, error);
      return res.status(500).json({
        success: false,
        error: 'Error al combinar fragmentos',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } finally {
      console.log(`[${requestId}] Fin de la solicitud (${Date.now() - startTime}ms)\n`);
    }
  }
);

// Ruta de prueba para verificar que el servidor está funcionando
router.post('/test', (req, res) => {
  console.log('POST a /api/transcription/test recibido');
  res.json({ 
    success: true,
    message: 'API de transcripción funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Ruta para subir un archivo de video (obsoleta, mantenida por compatibilidad)
router.post('/upload', 
  uploadMiddleware,
  (req, res) => {
    res.status(410).json({ 
      success: false,
      error: 'Método obsoleto',
      message: 'Por favor, utilice el nuevo sistema de carga por fragmentos',
      endpoints: {
        checkChunks: 'POST /api/transcription/check-chunks',
        uploadChunk: 'POST /api/transcription/upload-chunk',
        combineChunks: 'POST /api/transcription/combine-chunks',
        cancelUpload: 'POST /api/transcription/cancel-upload'
      }
    });
  }
);

// Eliminando la función duplicada de uploadMiddleware

// Ruta para subir un archivo de video (obsoleto, mantenida por compatibilidad)
router.post('/upload', 
  uploadMiddleware,
  (req, res) => {
    res.status(410).json({ 
      success: false,
      error: 'Método obsoleto',
      message: 'Por favor, utilice el nuevo sistema de carga por fragmentos',
      endpoints: {
        checkChunks: 'POST /api/transcription/check-chunks',
        uploadChunk: 'POST /api/transcription/upload-chunk',
        combineChunks: 'POST /api/transcription/combine-chunks',
        cancelUpload: 'POST /api/transcription/cancel-upload'
      }
    });
  }
);

// Ruta antigua de carga directa (mantenida por compatibilidad, pero marcada como obsoleta)
router.post('/upload-direct', 
  uploadMiddleware,
  upload.single('video'),
  async (req, res, next) => {
  try {
    if (!req.file) {
      console.error('No se recibió ningún archivo o el archivo es demasiado grande');
      return res.status(400).json({ 
        error: 'No se ha subido ningún archivo o el archivo excede el límite de tamaño',
        maxSize: '1GB'
      });
    }

    console.log('Archivo recibido:', {
      filename: req.file.originalname,
      size: (req.file.size / (1024 * 1024)).toFixed(2) + 'MB',
      mimetype: req.file.mimetype
    });

    const videoPath = req.file.path;
    const fileBaseName = path.basename(videoPath, path.extname(videoPath));
    const uploadsDir = path.dirname(videoPath);
    const audioPath = path.join(uploadsDir, `${fileBaseName}.mp3`);

    // Verificar espacio en disco con manejo de errores mejorado
    try {
      const diskSpace = require('check-disk-space').default;
      const { free } = await diskSpace(uploadsDir);
      const requiredSpace = req.file.size * 3; // Necesitamos al menos 3x el tamaño del video
      
      console.log(`Espacio en disco disponible: ${(free / (1024 * 1024)).toFixed(2)}MB`);
      console.log(`Espacio requerido: ${(requiredSpace / (1024 * 1024)).toFixed(2)}MB`);
      
      if (free < requiredSpace) {
        throw new Error(`Espacio en disco insuficiente. Se requieren al menos ${(requiredSpace / (1024 * 1024 * 1024)).toFixed(2)}GB libres.`);
      }
    } catch (error) {
      console.error('Error al verificar espacio en disco:', error);
      throw new Error(`Error al verificar el espacio en disco: ${error.message}`);
    }

    // 1. Extraer audio del video
    console.log('Extrayendo audio del video...');
    await extraerAudio(videoPath, audioPath);
    console.log('Audio extraído exitosamente');

    // 2. Generar transcripción
    console.log('Iniciando transcripción con Whisper...');
    const { vtt, txt } = await generarTranscripcion(audioPath);
    
    // 3. Guardar los archivos de transcripción
    console.log('Guardando archivos de transcripción...');
    const vttPath = path.join(uploadsDir, `${fileBaseName}.vtt`);
    const txtPath = path.join(uploadsDir, `${fileBaseName}.txt`);
    
    await Promise.all([
      fs.promises.writeFile(vttPath, vtt, 'utf8'),
      fs.promises.writeFile(txtPath, txt, 'utf8')
    ]);
    
    console.log('Transcripción completada exitosamente');
    
    // 4. Devolver las rutas de los archivos generados
    res.json({
      success: true,
      message: 'Transcripción completada exitosamente',
      files: {
        video: path.basename(videoPath),
        audio: path.basename(audioPath),
        vtt: path.basename(vttPath),
        txt: path.basename(txtPath),
        txtContent: txt
      }
    });

  } catch (error) {
    console.error('Error en el procesamiento del video:', error);
    
    // Limpiar archivos temporales en caso de error
    const filesToDelete = [
      req.file?.path,
      req.file?.path && path.join(path.dirname(req.file.path), 
        path.basename(req.file.path, path.extname(req.file.path)) + '.mp3')
    ].filter(Boolean);

    await Promise.allSettled(
      filesToDelete.map(file => 
        fs.promises.unlink(file).catch(e => 
          console.error(`Error al eliminar ${file}:`, e.message)
        )
      )
    );

    res.status(500).json({ 
      error: 'Error en el procesamiento del video',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Ruta para descargar un archivo generado
router.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads', filename);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'Archivo no encontrado' });
  }
});

// Ruta de prueba para verificar que el módulo está funcionando
router.get('/test', (req, res) => {
  res.json({ message: 'El módulo de transcripción está funcionando correctamente' });
});

module.exports = router;
