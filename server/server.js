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

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Para manejar datos de formularios
app.use(express.static('uploads')); // Servir archivos estáticos desde la carpeta uploads

// Middleware para manejar solicitudes OPTIONS
app.options('*', cors(corsOptions));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27019/proyecto-adm', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Aumentar el límite de tamaño de carga (por defecto es ~1MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});