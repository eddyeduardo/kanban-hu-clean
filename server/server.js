const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const columnsRoutes = require('./routes/columns');
const storiesRoutes = require('./routes/stories');
const jsonFilesRoutes = require('./routes/jsonFiles');
const projectConfigRoutes = require('./routes/projectConfig');
const transcriptionRoutes = require('./routes/transcription');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configuración de CORS mejorada
const corsOptions = {
  origin: 'http://localhost:3000', // Origen del cliente React
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Configuración para manejar archivos grandes
const MAX_FILE_SIZE = '1gb';
const MAX_JSON_SIZE = '1gb';

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: MAX_JSON_SIZE }));
app.use(express.urlencoded({ limit: MAX_JSON_SIZE, extended: true, parameterLimit: 1000000 }));
app.use(express.static('uploads', { maxAge: '1d' })); // Cache estático por 1 día

// Middleware para manejar solicitudes OPTIONS
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