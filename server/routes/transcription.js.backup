const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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

// Configurar multer para el almacenamiento de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Usar timestamp para evitar colisiones de nombres
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtro para aceptar solo archivos MP4
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'video/mp4') {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos MP4'), false);
  }
};

// Configuración de multer optimizada para archivos grandes
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB
    files: 1,
    fieldSize: 1024 * 1024 * 1024 // 1GB
  },
  // Deshabilitar el almacenamiento en memoria para archivos grandes
  buffer: false
});

// Configurar express para manejar cuerpos grandes
router.use(express.json({ limit: '1gb' }));
router.use(express.urlencoded({ limit: '1gb', extended: true }));

// Función para extraer el audio del video con configuración optimizada
function extraerAudio(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    console.log(`Iniciando extracción de audio de ${videoPath} a ${audioPath}`);
    
    // Verificar que el archivo de video existe
    if (!fs.existsSync(videoPath)) {
      const error = new Error(`El archivo de video no existe: ${videoPath}`);
      error.code = 'ENOENT';
      return reject(error);
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
      return reject(err);
    }
    
    // Configuración optimizada para reducir tamaño
    const command = ffmpeg(videoPath)
      .output(audioPath)
      .audioCodec('libmp3lame')
      .audioBitrate('48k')      // Reducir a 48kbps
      .audioChannels(1)         // Mono en lugar de estéreo
      .outputOptions([
        '-ar 16000',           // Reducir frecuencia de muestreo a 16kHz
        '-af volume=1.5'       // Aumentar volumen para mejorar la calidad percibida
      ])
      .on('start', (cmd) => console.log('Comando FFmpeg:', cmd))
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`Progreso: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        try {
          // Verificar que el archivo de audio se creó correctamente
          if (!fs.existsSync(audioPath)) {
            throw new Error(`No se pudo crear el archivo de audio: ${audioPath}`);
          }
          
          const stats = fs.statSync(audioPath);
          if (stats.size === 0) {
            throw new Error(`El archivo de audio generado está vacío: ${audioPath}`);
          }
          
          console.log(`Extracción de audio completada exitosamente: ${audioPath} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
          resolve();
        } catch (error) {
          console.error('Error al verificar el archivo de audio generado:', error);
          reject(error);
        }
      })
      .on('error', (err, stdout, stderr) => {
        console.error('Error al extraer el audio:', err);
        console.error('Salida estándar:', stdout);
        console.error('Error estándar:', stderr);
        
        // Intentar limpiar el archivo de audio si se creó parcialmente
        try {
          if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
          }
        } catch (cleanupError) {
          console.error('Error al limpiar archivo de audio parcial:', cleanupError);
        }
        
        reject(new Error('Error al procesar el video con FFmpeg'));
      });

    // Configurar un timeout para la operación (10 minutos)
    const timeoutMs = 10 * 60 * 1000;
    const timeout = setTimeout(() => {
      console.error(`Tiempo de espera agotado (${timeoutMs}ms) al extraer audio`);
      command.kill('SIGKILL');
    }, timeoutMs);
    
    // Iniciar la extracción
    command.run();
    
    // Limpiar el timeout si la operación se completa antes
    command.on('end', () => clearTimeout(timeout));
    command.on('error', () => clearTimeout(timeout));
  });
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
async function generarTranscripcion(audioPath) {
  let audioFile;
  const startTime = Date.now();
  
  try {
    console.log(`[${new Date().toISOString()}] Iniciando transcripción para: ${audioPath}`);
    console.log('Iniciando transcripción con OpenAI...');
    
    // Verificar que el archivo de audio existe
    if (!fs.existsSync(audioPath)) {
      throw new Error(`El archivo de audio no existe: ${audioPath}`);
    }
    
    // Verificar tamaño del archivo (máx 25MB para Whisper)
    const stats = fs.statSync(audioPath);
    const maxSize = 25 * 1024 * 1024; // 25MB
    
    if (stats.size > maxSize) {
      console.log(`Archivo de audio demasiado grande (${(stats.size / (1024 * 1024)).toFixed(2)}MB), dividiendo en segmentos...`);
      const segments = await dividirAudio(audioPath);
      console.log(`Archivo dividido en ${segments.length} segmentos`);
      
      // Procesar cada segmento
      const transcriptions = [];
      for (const [index, segment] of segments.entries()) {
        console.log(`Procesando segmento ${index + 1}/${segments.length}...`);
        const segmentStats = fs.statSync(segment);
        console.log(`Tamaño del segmento: ${(segmentStats.size / (1024 * 1024)).toFixed(2)}MB`);
        
        try {
          const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(segment),
            model: 'whisper-1',
            response_format: 'srt',
            language: 'es'
          });
          
          // Convertir la respuesta SRT a formato VTT y extraer texto plano
          let vttContent = 'WEBVTT\n\n';
          let txtContent = '';
          const segments = transcription.split('\n\n').filter(s => s.trim());
          
          for (const segment of segments) {
            const lines = segment.split('\n');
            if (lines.length >= 3) {
              const times = lines[1].replace(/,/g, '.');
              const text = lines.slice(2).join(' ').trim();
              
              if (times && text) {
                vttContent += `${times}\n${text}\n\n`;
                txtContent += `${text}\n`;
              }
            }
          }
          
          transcriptions.push({
            vtt: vttContent.trim(),
            text: txtContent.trim()
          });
        } catch (error) {
          console.error(`Error procesando segmento ${index + 1}:`, error.message);
          throw new Error(`Error en segmento ${index + 1}: ${error.message}`);
        } finally {
          // Eliminar el segmento después de procesarlo
          try { fs.unlinkSync(segment); } catch (e) { console.error('Error eliminando segmento:', e); }
        }
      }
      
      // Combinar las transcripciones
      const combinedVtt = 'WEBVTT\n\n' + transcriptions.map(t => t.vtt).join('\n\n');
      const combinedTxt = transcriptions.map(t => t.text).join('\n\n');
      
      // Verificar que tenemos contenido
      if (!combinedTxt.trim()) {
        throw new Error('No se pudo extraer texto de la transcripción de los segmentos');
      }
      
      return {
        vtt: combinedVtt,
        txt: combinedTxt
      };
    }
    
    audioFile = fs.createReadStream(audioPath);
    
    // Configurar el timeout para la solicitud (10 minutos para archivos grandes)
    const controller = new AbortController();
    const timeoutDuration = 10 * 60 * 1000; // 10 minutos
    const timeoutId = setTimeout(() => {
      console.error(`Timeout alcanzado después de ${timeoutDuration/1000} segundos`);
      controller.abort();
    }, timeoutDuration);
    
    console.log(`[${new Date().toISOString()}] Enviando solicitud a la API de OpenAI (timeout: ${timeoutDuration/1000}s)...`);
    
    // Realizar la transcripción con OpenAI con reintentos
    const response = await fetchWithRetry(async () => {
      try {
        console.log(`[${new Date().toISOString()}] Iniciando solicitud a la API...`);
        const result = await openai.audio.transcriptions.create(
          {
            file: audioFile,
            model: 'whisper-1',
            response_format: 'srt',
            language: 'es'
          },
          {
            signal: controller.signal,
            maxRetries: 2 // Reintentos a nivel de la librería
          }
        );
        console.log(`[${new Date().toISOString()}] Respuesta recibida de la API`);
        return result;
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error en la solicitud a la API:`, {
          message: error.message,
          status: error.status,
          code: error.code,
          stack: error.stack
        });
        throw error;
      }
    }, 3, 2000); // 3 reintentos con espera exponencial
    
    // Limpiar el timeout si la solicitud fue exitosa
    clearTimeout(timeoutId);
    
    console.log('Transcripción recibida de OpenAI');
    
    // Asegurarse de que la respuesta sea un string
    const transcription = typeof response === 'string' ? response : '';
    
    if (!transcription) {
      throw new Error('La respuesta de la API de OpenAI está vacía o en un formato inesperado');
    }
    
    // Convertir SRT a VTT
    let vttContent = 'WEBVTT\n\n';
    let txtContent = ''; // Contenido para el archivo de texto plano
    
    // Procesar la transcripción SRT
    const segments = transcription.split('\n\n').filter(s => s.trim());
    
    if (segments.length === 0) {
      throw new Error('No se encontraron segmentos de transcripción en la respuesta');
    }
    
    for (const segment of segments) {
      const lines = segment.split('\n');
      if (lines.length >= 3) { // Debe tener al menos número, tiempo y texto
        // Convertir tiempo de SRT (00:00:00,000) a VTT (00:00:00.000)
        const times = lines[1].replace(/,/g, '.');
        const text = lines.slice(2).join(' ').trim();
        
        if (times && text) {
          vttContent += `${times}\n${text}\n\n`;
          txtContent += `${text}\n`;
        }
      }
    }
    
    if (!vttContent.trim() || !txtContent.trim()) {
      throw new Error('No se pudo extraer texto de la transcripción');
    }
    
    return {
      vtt: vttContent,
      txt: txtContent
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
    // Cerrar el stream si está abierto
    if (audioFile && typeof audioFile.close === 'function') {
      audioFile.close();
    }
    
    // Registrar duración total del proceso
    const endTime = Date.now();
    console.log(`[${new Date().toISOString()}] Tiempo total de procesamiento: ${((endTime - startTime) / 1000).toFixed(2)}s`);
  }
}

// Ruta simple para verificar que el endpoint POST está funcionando
router.post('/test', (req, res) => {
  console.log('POST a /api/transcription/test recibido');
  res.json({ message: 'POST a /api/transcription/test funciona correctamente' });
});

// Ruta para subir un archivo de video y procesarlo
// Configurar timeout para la carga de archivos
const uploadMiddleware = (req, res, next) => {
  console.log('Iniciando carga de archivo...');
  
  // Establecer un timeout de 30 minutos (1800000ms)
  req.setTimeout(1800000);
  
  // Manejar errores de timeout
  req.on('timeout', () => {
    console.error('Timeout en la carga del archivo');
    if (!res.headersSent) {
      res.status(408).json({ 
        error: 'La carga del archivo ha tardado demasiado tiempo',
        message: 'Por favor, intente con un archivo más pequeño o inténtelo de nuevo más tarde.'
      });
    }
  });
  
  next();
};

router.post('/upload', 
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
