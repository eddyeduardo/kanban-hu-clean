const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const columnsRoutes = require('./routes/columns');
const storiesRoutes = require('./routes/stories');
const jsonFilesRoutes = require('./routes/jsonFiles');
const projectConfigRoutes = require('./routes/projectConfig');
const transcriptionRoutes = require('./routes/transcription');
const insightsRoutes = require('./routes/insights');
const path = require('path');
const fs = require('fs');

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configuración detallada de CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (como aplicaciones móviles o curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `Origen '${origin}' no permitido por CORS`;
      console.warn(msg);
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'x-file-name',
    'x-file-size',
    'x-file-type',
    'x-file-id',
    'x-chunk-number',
    'x-total-chunks'
  ],
  exposedHeaders: [
    'Content-Disposition',
    'Content-Length',
    'X-File-Id',
    'X-Chunk-Number',
    'X-Total-Chunks'
  ],
  credentials: true,
  maxAge: 86400, // 24 horas de caché para preflight
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Configuración para manejar archivos grandes
const MAX_FILE_SIZE = '1gb';
const MAX_JSON_SIZE = '1gb';

// Crear directorio de subidas si no existe
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const TEMP_DIR = path.join(UPLOAD_DIR, 'temp');

[UPLOAD_DIR, TEMP_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Directorio creado: ${dir}`);
  }
});

// Middleware de logging de solicitudes
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  
  console.log(`\n=== Nueva solicitud ${requestId} ===`);
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  
  // Capturar el cuerpo de la solicitud para depuración
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - start;
    console.log(`\n=== Respuesta ${requestId} (${duration}ms) ===`);
    console.log(`Status: ${res.statusCode}`);
    console.log('Headers:', res.getHeaders());
    
    if (res.statusCode >= 400) {
      console.error('Error en la respuesta:', body);
    } else {
      console.log('Respuesta exitosa');
    }
    
    return originalSend.call(this, body);
  };
  
  next();
});

// Middleware CORS
app.use(cors(corsOptions));

// Middleware para analizar JSON y datos de formulario
app.use(express.json({ 
  limit: MAX_JSON_SIZE,
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      console.error('Error al analizar JSON:', e);
      throw new Error('Error en el formato JSON');
    }
  }
}));

app.use(express.urlencoded({ 
  limit: MAX_JSON_SIZE, 
  extended: true, 
  parameterLimit: 1000000 
}));

// Servir archivos estáticos
app.use('/uploads', express.static(UPLOAD_DIR, { 
  maxAge: '1d',
  setHeaders: (res, path) => {
    if (path.endsWith('.mp4') || path.endsWith('.mov') || path.endsWith('.avi')) {
      res.setHeader('Content-Disposition', 'inline');
    }
  }
}));

// Manejar solicitudes OPTIONS
app.options('*', cors(corsOptions));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27019/proyecto-adm', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

try {
  // Aumentar el límite de listeners de eventos
  require('events').EventEmitter.defaultMaxListeners = 15;
  
  // Configurar el límite de tamaño de carga HTTP
  app.use(express.json({ limit: MAX_JSON_SIZE, strict: false }));
  app.use(express.urlencoded({ 
    limit: MAX_JSON_SIZE, 
    extended: true, 
    parameterLimit: 1000000 
  }));
  
  console.log('Configuración de manejo de archivos grandes aplicada');
} catch (error) {
  console.error('Error al configurar el servidor para archivos grandes:', error);
}

// Routes
app.use('/api/columns', columnsRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/api/json-files', jsonFilesRoutes);
app.use('/api/project-config', projectConfigRoutes);
app.use('/api/transcription', transcriptionRoutes);
app.use('/api/insights', insightsRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Kanban API is running');
});

// Configuración del servidor HTTP
const server = require('http').createServer(app);

// Configurar timeouts del servidor
server.keepAliveTimeout = 120000; // 2 minutos
server.headersTimeout = 125000;    // 2 minutos + 5 segundos

// Manejo de errores global
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // No cerrar el proceso, intentar registrar y continuar
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Aplicación puede continuar ejecutándose
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Límite de tamaño de archivo: ${MAX_FILE_SIZE}`);
  console.log(`Límite de JSON: ${MAX_JSON_SIZE}`);
});