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

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // Límite de 100MB
  }
});

// Función para extraer el audio del video
function extraerAudio(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(audioPath)
      .audioCodec('libmp3lame')
      .audioBitrate('64k')  // Reducir a 64 kbps (ideal para voz)
      .outputOptions('-ar 22050')  // Reducir frecuencia de muestreo a 22.05 kHz
      .on('end', () => {
        console.log('Extracción de audio completada:', audioPath);
        resolve();
      })
      .on('error', (err) => {
        console.error('Error al extraer el audio:', err);
        reject(err);
      })
      .run();
  });
}

// Función para generar el archivo .vtt y .txt usando OpenAI
async function generarTranscripcion(audioPath) {
  try {
    console.log('Iniciando transcripción con OpenAI...');
    
    // Leer el archivo de audio
    const audioFile = fs.createReadStream(audioPath);
    
    // Realizar la transcripción con OpenAI
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'srt'
    });

    // Convertir SRT a VTT
    let vttContent = 'WEBVTT\n\n';
    let txtContent = ''; // Contenido para el archivo de texto plano
    
    // Procesar la transcripción SRT
    const segments = transcription.split('\n\n');
    for (const segment of segments) {
      if (segment.trim()) {
        const parts = segment.split('\n');
        if (parts.length >= 3) {
          // Convertir tiempo de SRT (00:00:00,000) a VTT (00:00:00.000)
          const times = parts[1].replace(/,/g, '.');
          const text = parts.slice(2).join('\n');
          
          vttContent += `${times}\n${text}\n\n`;
          
          // Añadir solo el texto al contenido TXT
          txtContent += `${text}\n`;
        }
      }
    }

    return {
      vtt: vttContent,
      txt: txtContent
    };
  } catch (error) {
    console.error('Error al generar los archivos de subtítulos:', error);
    throw error;
  }
}

// Ruta simple para verificar que el endpoint POST está funcionando
router.post('/test', (req, res) => {
  console.log('POST a /api/transcription/test recibido');
  res.json({ message: 'POST a /api/transcription/test funciona correctamente' });
});

// Ruta para subir un archivo de video y procesarlo
router.post('/upload', (req, res, next) => {
  console.log('POST a /api/transcription/upload recibido');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
}, upload.single('video'), async (req, res) => {
  console.log('Procesando archivo subido...');
  console.log('Archivo recibido:', req.file ? 'Sí' : 'No');
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    }

    const videoPath = req.file.path;
    const fileBaseName = path.basename(videoPath, path.extname(videoPath));
    const audioPath = path.join(path.dirname(videoPath), `${fileBaseName}.mp3`);
    
    // Extraer audio del video
    await extraerAudio(videoPath, audioPath);
    
    // Generar transcripción
    const { vtt, txt } = await generarTranscripcion(audioPath);
    
    // Guardar los archivos de transcripción
    const vttPath = path.join(path.dirname(videoPath), `${fileBaseName}.vtt`);
    const txtPath = path.join(path.dirname(videoPath), `${fileBaseName}.txt`);
    
    fs.writeFileSync(vttPath, vtt, 'utf8');
    fs.writeFileSync(txtPath, txt, 'utf8');
    
    // Devolver las rutas de los archivos generados
    res.json({
      success: true,
      files: {
        video: req.file.filename,
        audio: `${fileBaseName}.mp3`,
        vtt: `${fileBaseName}.vtt`,
        txt: `${fileBaseName}.txt`,
        txtContent: txt // Enviar el contenido del texto para mostrar en la interfaz
      }
    });
  } catch (error) {
    console.error('Error en el procesamiento del video:', error);
    res.status(500).json({ error: 'Error en el procesamiento del video', message: error.message });
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
