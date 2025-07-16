const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const OpenAI = require('openai');
const retry = require('async-retry');
require('dotenv').config();

// Configurar la ruta de FFmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Configurar el cliente de OpenAI
const { HttpsProxyAgent } = require('https-proxy-agent');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3, // Número de reintentos para las solicitudes fallidas
  timeout: 15 * 60 * 1000, // 15 minutos de timeout
  httpAgent: new (require('http').Agent)({ 
    keepAlive: true,
    maxSockets: 25,
    maxFreeSockets: 10,
    timeout: 15 * 60 * 1000 // 15 minutos
  }),
  fetch: (url, options) => {
    // Usar el agente de proxy HTTPS si es necesario
    if (process.env.HTTPS_PROXY) {
      options.agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
    }
    return fetch(url, options);
  }
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

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB
    files: 1
  }
});

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
async function dividirAudio(audioPath, segmentDuration = 240) { // 4 minutos por defecto
  try {
    console.log(`Dividiendo archivo de audio en segmentos de ${segmentDuration} segundos...`);
    
    const outputDir = path.dirname(audioPath);
    const baseName = path.basename(audioPath, path.extname(audioPath));
    const outputPattern = path.join(outputDir, `${baseName}_%03d.mp3`);
    
    // Usar una promesa para manejar correctamente el flujo asíncrono
    await new Promise((resolve, reject) => {
      const command = ffmpeg(audioPath)
        .output(outputPattern)
        .outputOptions([
          '-c copy', // Sin re-codificación para mayor velocidad
          '-f segment', // Formato de segmentación
          `-segment_time ${segmentDuration}`, // Duración de cada segmento
          '-reset_timestamps 1', // Reiniciar timestamps
          '-map 0:a:0', // Solo el primer canal de audio
          '-segment_format mp3', // Formato de salida
          '-segment_list_type flat', // Lista plana de segmentos
          '-segment_start_number 1' // Empezar desde el segmento 1
        ])
        .on('start', (commandLine) => {
          console.log('Comando ffmpeg:', commandLine);
        })
        .on('progress', (progress) => {
          console.log(`Progreso: ${Math.round(progress.percent)}%`);
        })
        .on('end', () => {
          console.log('División de audio completada');
          resolve();
        })
        .on('error', (err, stdout, stderr) => {
          console.error('Error en ffmpeg:', err.message);
          console.error('Salida estándar:', stdout);
          console.error('Error estándar:', stderr);
          reject(new Error(`Error al dividir el audio: ${err.message}`));
        });
    });

    // Retornar lista de segmentos generados, ordenados numéricamente
    const segmentFiles = fs.readdirSync(outputDir)
      .filter(f => {
        const match = f.match(new RegExp(`^${baseName}_(\\d+)\\.mp3$`));
        return match !== null;
      })
      .sort((a, b) => {
        const numA = parseInt(a.match(/_(\d+)\./)[1], 10);
        const numB = parseInt(b.match(/_(\d+)\./)[1], 10);
        return numA - numB;
      })
      .map(f => path.join(outputDir, f));

    console.log(`Se generaron ${segmentFiles.length} segmentos de audio`);
    return segmentFiles;

  } catch (error) {
    console.error('Error en dividirAudio:', error);
    throw new Error(`No se pudo dividir el archivo de audio: ${error.message}`);
  }
}

// Función para procesar un solo segmento de audio
async function procesarSegmento(segmentPath, index) {
  let fileStream;
  let controller;
  let timeout;
  
  try {
    console.log(`[Segmento ${index}] Iniciando procesamiento...`);
    
    // Verificar que el archivo existe y tiene tamaño mayor a 0
    const stats = fs.statSync(segmentPath);
    if (stats.size === 0) {
      throw new Error(`El archivo del segmento está vacío: ${segmentPath}`);
    }
    
    console.log(`[Segmento ${index}] Tamaño: ${(stats.size / (1024 * 1024)).toFixed(2)}MB`);
    
    // Usar stream para leer el archivo
    fileStream = fs.createReadStream(segmentPath);
    
    // Configurar timeout más largo para la solicitud (10 minutos)
    controller = new AbortController();
    timeout = setTimeout(() => {
      console.error(`[Segmento ${index}] Timeout de 10 minutos alcanzado`);
      controller.abort();
    }, 10 * 60 * 1000);
    
    console.log(`[Segmento ${index}] Enviando a la API de OpenAI...`);
    
    const response = await retry(
      async () => {
        const startTime = Date.now();
        try {
          // Crear un nuevo stream para cada intento
          if (fileStream && !fileStream.destroyed) {
            fileStream.destroy();
          }
          fileStream = fs.createReadStream(segmentPath);
          
          const result = await openai.audio.transcriptions.create(
            {
              file: fileStream,
              model: 'whisper-1',
              response_format: 'srt',
              language: 'es',
              temperature: 0.1, // Reducir la aleatoriedad
              prompt: 'Transcripción de reunión en español' // Contexto para mejorar la calidad
            },
            {
              signal: controller.signal,
              timeout: 10 * 60 * 1000, // 10 minutos
              maxRetries: 2, // Reintentos adicionales
              backoff: 1000 // Tiempo entre reintentos
            }
          );
          
          const processingTime = (Date.now() - startTime) / 1000;
          console.log(`[Segmento ${index}] Transcripción completada en ${processingTime.toFixed(1)}s`);
          return result;
          
        } catch (error) {
          console.error(`[Segmento ${index}] Error en la solicitud:`, {
            message: error.message,
            code: error.code,
            type: error.type
          });
          
          // Si el error es de tipo abort o timeout, no reintentar
          if (error.name === 'AbortError' || 
              error.message.includes('aborted') || 
              error.message.includes('timeout')) {
            throw error;
          }
          
          // Para errores de conexión, esperar un poco antes de reintentar
          if (error.message.includes('connection') || error.message.includes('socket')) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          throw error;
        }
      },
      {
        retries: 2, // Número de reintentos
        minTimeout: 3000, // Tiempo mínimo entre reintentos
        maxTimeout: 10000, // Tiempo máximo entre reintentos
        onRetry: (error, attempt) => {
          console.log(`[Segmento ${index}] Reintentando (${attempt}/2)...`);
          // Cerrar el stream actual si existe
          if (fileStream && !fileStream.destroyed) {
            fileStream.destroy();
          }
        }
      }
    );
    
    // Limpiar el timeout si la operación fue exitosa
    if (timeout) clearTimeout(timeout);
    
    if (!response) {
      throw new Error('La API no devolvió ninguna respuesta');
    }
    
    console.log(`[Segmento ${index}] Procesando respuesta...`);
    const processed = processSrtResponse(response);
    
    // Verificar que la respuesta tenga contenido
    if (!processed || (!processed.vtt && !processed.text)) {
      throw new Error('La respuesta de la API no contiene datos de transcripción');
    }
    
    console.log(`[Segmento ${index}] Procesamiento completado exitosamente`);
    return processed;
    
  } catch (error) {
    console.error(`[Segmento ${index}] Error crítico:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    });
    
    // Si hay un error, devolver un objeto con un mensaje de error
    return {
      vtt: `[Error en segmento ${index}: ${error.message}]`,
      text: `[Error en segmento ${index}: ${error.message}]`
    };
    
  } finally {
    // Limpiar timeouts
    if (timeout) clearTimeout(timeout);
    
    // Cerrar el stream si está abierto
    if (fileStream && !fileStream.destroyed) {
      fileStream.destroy();
    }
    
    // Limpiar archivo temporal después de un pequeño retraso
    setTimeout(() => {
      try {
        if (fs.existsSync(segmentPath)) {
          fs.unlink(segmentPath, (err) => {
            if (err) {
              console.error(`[Segmento ${index}] Error eliminando archivo temporal:`, err);
            } else {
              console.log(`[Segmento ${index}] Archivo temporal eliminado: ${segmentPath}`);
            }
          });
        }
      } catch (e) {
        console.error(`[Segmento ${index}] Error en limpieza final:`, e);
      }
    }, 1000);
}

// Función para generar la transcripción del audio
async function generarTranscripcion(audioPath) {
  console.log('=== INICIANDO PROCESO DE TRANSCRIPCIÓN ===');
  console.log(`Archivo: ${audioPath}`);
  
  // Verificar que el archivo de audio existe y es accesible
  try {
    if (!fs.existsSync(audioPath)) {
      throw new Error(`El archivo de audio no existe: ${audioPath}`);
    }
    
    const stats = fs.statSync(audioPath);
    console.log(`Tamaño del archivo: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
    
    if (stats.size === 0) {
      throw new Error('El archivo de audio está vacío');
    }
  } catch (error) {
    console.error('Error al verificar el archivo de audio:', error);
    throw new Error(`Error en el archivo de audio: ${error.message}`);
  }
  
  // Tamaño máximo para procesamiento directo (20MB para dejar margen)
  const maxSize = 20 * 1024 * 1024;
  
  try {
    const stats = fs.statSync(audioPath);
    
    if (stats.size > maxSize) {
      console.log('Archivo grande detectado, dividiendo en segmentos...');
      
      // Dividir el audio en segmentos más pequeños (3 minutos por defecto)
      const segmentDuration = 180; // 3 minutos en segundos
      const segments = await dividirAudio(audioPath, segmentDuration);
      console.log(`Archivo dividido en ${segments.length} segmentos`);
      
      // Procesar segmentos en lotes
      const batchSize = 2; // Reducido a 2 para evitar sobrecarga
      const transcriptions = [];
      
      for (let i = 0; i < segments.length; i += batchSize) {
        const batch = segments.slice(i, i + batchSize);
        const batchNumber = Math.floor(i/batchSize) + 1;
        const totalBatches = Math.ceil(segments.length/batchSize);
        
        console.log(`\n--- Procesando lote ${batchNumber} de ${totalBatches} ---`);
        
        // Procesar el lote actual en paralelo
        const batchPromises = batch.map(async (segment, idx) => {
          const segmentIndex = i + idx + 1;
          const segmentStats = fs.statSync(segment);
          
          console.log(`[${segmentIndex}/${segments.length}] Procesando segmento (${(segmentStats.size / (1024 * 1024)).toFixed(2)} MB)...`);
          
          try {
            const result = await procesarSegmento(segment, segmentIndex);
            console.log(`[${segmentIndex}/${segments.length}] Segmento procesado exitosamente`);
            return result;
          } catch (error) {
            console.error(`[${segmentIndex}/${segments.length}] Error en segmento:`, error.message);
            return {
              vtt: `[Error en segmento ${segmentIndex}: ${error.message}]`,
              text: `[Error en segmento ${segmentIndex}: ${error.message}]`
            };
          }
        });
        
        // Esperar a que terminen todos los segmentos del lote actual
        const batchResults = await Promise.all(batchPromises);
        transcriptions.push(...batchResults);
        
        // Pequeña pausa entre lotes para evitar sobrecargar la API
        if (i + batchSize < segments.length) {
          const waitTime = 15000; // 15 segundos
          console.log(`Esperando ${waitTime/1000} segundos antes del siguiente lote...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      
      // Combinar todas las transcripciones
      console.log('\nCombinando resultados de segmentos...');
      const combined = {
        vtt: 'WEBVTT\n\n' + transcriptions.map(t => t.vtt).filter(Boolean).join('\n\n'),
        text: transcriptions.map(t => t.text).filter(Boolean).join('\n\n')
      };
      
      // Verificar que al menos hay algo de contenido
      if (!combined.vtt.trim() && !combined.text.trim()) {
        throw new Error('No se pudo generar ninguna transcripción de los segmentos');
      }
      
      console.log('=== TRANSCRIPCIÓN COMPLETADA CON ÉXITO ===');
      return combined;
      
    } else {
      // Si el archivo es pequeño, procesarlo directamente
      console.log('Procesando archivo pequeño directamente...');
      try {
        const result = await procesarSegmento(audioPath, 1);
        
        // Verificar que la respuesta tenga contenido
        if ((!result.vtt || !result.vtt.trim()) && (!result.text || !result.text.trim())) {
          throw new Error('La API no devolvió ningún contenido de transcripción');
        }
        
        console.log('=== TRANSCRIPCIÓN COMPLETADA CON ÉXITO ===');
        return result;
      } catch (error) {
        console.error('Error al procesar el archivo pequeño:', error);
        throw new Error(`Error al procesar el archivo: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Error en generarTranscripcion:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    // Proporcionar un mensaje de error más descriptivo
    let errorMessage = 'Error al generar la transcripción';
    
    if (error.name === 'AbortError') {
      errorMessage = 'La transcripción tardó demasiado tiempo en completarse';
    } else if (error.code === 'ENOENT') {
      errorMessage = `No se pudo encontrar el archivo de audio: ${audioPath}`;
    } else if (error.response) {
      errorMessage = `Error de la API: ${error.response.status} - ${error.response.statusText}`;
    }
    
    throw new Error(`${errorMessage}: ${error.message}`);
    
  } finally {
    // Asegurarse de cerrar el stream si está abierto
    if (fileStream) {
      fileStream.destroy();
    }
  }
}

// Función auxiliar para procesar la respuesta SRT
function processSrtResponse(apiResponse) {
  // Si la respuesta es un string (formato SRT), procesarla directamente
  if (typeof apiResponse === 'string') {
    return processSrtContent(apiResponse);
  }
  
  // Si es un objeto de respuesta de la API, extraer el texto
  if (apiResponse && typeof apiResponse.text === 'string') {
    // Si la API ya devolvió texto plano, usarlo directamente
    return {
      vtt: `WEBVTT\n\n${apiResponse.text}`,
      text: apiResponse.text
    };
  }
  
  // Si no podemos procesar la respuesta, lanzar un error
  console.error('Formato de respuesta no soportado:', apiResponse);
  throw new Error('Formato de respuesta de la API no soportado');
}

// Función para procesar contenido SRT
function processSrtContent(srtContent) {
  let vttContent = 'WEBVTT\n\n';
  let txtContent = '';
  
  // Verificar si el contenido ya tiene el encabezado WEBVTT
  if (srtContent.trim().startsWith('WEBVTT')) {
    vttContent = srtContent;
    // Extraer solo el texto para el archivo .txt
    const segments = srtContent.split('\n\n').filter(s => s.trim());
    segments.forEach(segment => {
      const lines = segment.split('\n');
      if (lines.length > 2) { // Ignorar líneas de tiempo
        const text = lines.slice(2).join(' ').trim();
        if (text) txtContent += `${text}\n`;
      }
    });
  } else {
    // Procesar formato SRT tradicional
    const segments = srtContent.split('\n\n').filter(s => s.trim());
    
    segments.forEach(segment => {
      const lines = segment.split('\n');
      if (lines.length >= 3) {
        const times = lines[1].replace(/,/g, '.');
        const text = lines.slice(2).join(' ').trim();
        
        if (times && text) {
          vttContent += `${times}\n${text}\n\n`;
          txtContent += `${text}\n`;
        }
      }
    });
  }
  
  return {
    vtt: vttContent.trim(),
    text: txtContent.trim()
  };
}

// Ruta simple para verificar que el endpoint POST está funcionando
router.post('/test', (req, res) => {
  console.log('POST a /api/transcription/test recibido');
  res.json({ message: 'POST a /api/transcription/test funciona correctamente' });
});

// Ruta para subir un archivo de video y procesarlo
router.post('/upload', upload.single('video'), async (req, res) => {
  console.log('POST a /api/transcription/upload recibido');
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

    // Verificar espacio en disco
    const diskSpace = require('check-disk-space').default;
    const { free } = await diskSpace(uploadsDir);
    if (free < req.file.size * 3) { // Necesitamos al menos 3x el tamaño del video
      throw new Error('Espacio en disco insuficiente para procesar el video');
    }

    // 1. Extraer audio del video
    console.log('Extrayendo audio del video...');
    await extraerAudio(videoPath, audioPath);
    console.log('Audio extraído exitosamente');

    // 2. Generar la transcripción
    console.log('Iniciando transcripción con Whisper...');
    const result = await generarTranscripcion(audioPath);
    
    if (!result || (!result.vtt && !result.text)) {
      throw new Error('No se pudo generar la transcripción: la respuesta de la API está vacía o es inválida');
    }
    
    // 3. Guardar los archivos de transcripción
    console.log('Guardando archivos de transcripción...');
    const vttPath = path.join(uploadsDir, `${fileBaseName}.vtt`);
    const txtPath = path.join(uploadsDir, `${fileBaseName}.txt`);
    
    // Asegurarse de que los directorios existan
    await fs.promises.mkdir(path.dirname(vttPath), { recursive: true });
    
    // Crear un array de promesas para guardar los archivos
    const savePromises = [];
    
    // Solo guardar VTT si hay contenido
    if (result.vtt) {
      savePromises.push(
        fs.promises.writeFile(vttPath, result.vtt, 'utf8')
          .then(() => console.log(`Archivo VTT guardado: ${vttPath}`))
      );
    }
    
    // Solo guardar TXT si hay contenido
    if (result.text) {
      savePromises.push(
        fs.promises.writeFile(txtPath, result.text, 'utf8')
          .then(() => console.log(`Archivo TXT guardado: ${txtPath}`))
      );
    }
    
    // Esperar a que se guarden todos los archivos
    await Promise.all(savePromises);
    
    console.log('Transcripción completada exitosamente');
    
    // 4. Devolver las rutas de los archivos generados
    const responseData = {
      success: true,
      message: 'Transcripción completada exitosamente',
      files: {
        video: path.basename(videoPath),
        audio: path.basename(audioPath)
      }
    };
    
    // Solo incluir las rutas de los archivos que se crearon exitosamente
    if (result.vtt) {
      responseData.files.vtt = path.basename(vttPath);
    }
    
    if (result.text) {
      responseData.files.txt = path.basename(txtPath);
      responseData.files.txtContent = result.text;
    }
    
    // Enviar la respuesta
    res.json(responseData);
    
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
