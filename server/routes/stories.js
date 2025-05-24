const express = require('express');
const router = express.Router();
const Story = require('../models/Story');
const Column = require('../models/Column');
const mongoose = require('mongoose');

// Get all stories
router.get('/', async (req, res) => {
  try {
    // Obtener el nombre del archivo JSON de la consulta
    const { jsonFileName } = req.query;
    
    let query = {};
    
    if (jsonFileName) {
      // Si se proporciona un nombre de archivo, buscar historias asociadas a ese archivo
      query = { jsonFileName };
    }
    
    const stories = await Story.find(query).populate('column', 'name').sort({ position: 1 });
    res.json(stories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a story
router.post('/', async (req, res) => {
  try {
    // Check if column exists
    const column = await Column.findById(req.body.column);
    if (!column) return res.status(404).json({ message: 'Column not found' });
    
    // Find max position in the target column
    const maxPosition = await Story.findOne({ column: req.body.column }).sort({ position: -1 });
    const position = maxPosition ? maxPosition.position + 1 : 0;
    
    const story = new Story({
      title: req.body.title,
      criteria: req.body.criteria || [],
      column: req.body.column,
      position: position
    });
    
    const newStory = await story.save();
    res.status(201).json(newStory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get a specific story
router.get('/:id', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id).populate('column', 'name');
    if (!story) return res.status(404).json({ message: 'Story not found' });
    
    res.json(story);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a story
router.patch('/:id', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    
    // Check if we're changing the column
    if (req.body.column && req.body.column !== story.column.toString()) {
      const targetColumn = await Column.findById(req.body.column);
      if (!targetColumn) return res.status(404).json({ message: 'Target column not found' });
      
      // Si estamos haciendo drag and drop, respetamos la posición enviada por el cliente
      // Solo calculamos una nueva posición si no se especificó una posición o si no es un drag and drop
      if (req.body.position === undefined) {
        const maxPosition = await Story.findOne({ column: req.body.column }).sort({ position: -1 });
        req.body.position = maxPosition ? maxPosition.position + 1 : 0;
      }
    }
    
    // Update the fields
    if (req.body.title) story.title = req.body.title;
    
    // Si estamos actualizando los criterios, manejar los timestamps
    if (req.body.criteria) {
      // Procesar cada criterio para actualizar los timestamps
      req.body.criteria.forEach((newCriterion, index) => {
        const oldCriterion = story.criteria[index];
        
        // Si el criterio existe
        if (oldCriterion) {
          // Mantener la fecha de creación original
          newCriterion.createdAt = oldCriterion.createdAt;
          
          // Si el criterio se marcó como completado y antes no lo estaba
          if (newCriterion.checked && !oldCriterion.checked) {
            newCriterion.completedAt = new Date();
            console.log(`Criterion marked as completed: ${newCriterion.text}`);
          } 
          // Si el criterio se desmarcó
          else if (!newCriterion.checked && oldCriterion.checked) {
            newCriterion.completedAt = null;
            console.log(`Criterion unmarked: ${newCriterion.text}`);
          }
          // Si no cambió el estado, mantener el completedAt original
          else {
            newCriterion.completedAt = oldCriterion.completedAt;
          }
        } 
        // Si es un nuevo criterio
        else {
          newCriterion.createdAt = new Date();
          newCriterion.completedAt = newCriterion.checked ? new Date() : null;
        }
      });
      
      // Ordenar los criterios: primero los no completados, luego los completados
      req.body.criteria.sort((a, b) => {
        if (a.checked === b.checked) return 0;
        return a.checked ? 1 : -1; // Los no marcados primero
      });
      
      story.criteria = req.body.criteria;
    }
    
    if (req.body.column) story.column = req.body.column;
    if (req.body.position !== undefined) story.position = req.body.position;
    
    // Actualizar la fecha de finalización de la historia si se proporciona
    if (req.body.completedAt !== undefined) {
      console.log(`Updating story completion date: ${req.body.completedAt}`);
      story.completedAt = req.body.completedAt;
    }
    
    const updatedStory = await story.save();
    res.json(updatedStory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a story
router.delete('/:id', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    
    // Usar deleteOne() en lugar de remove()
    await Story.deleteOne({ _id: req.params.id });
    res.json({ message: 'Story deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Import stories from JSON
router.post('/import', async (req, res) => {
  try {
    console.log('Import request received - Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Import request received - Body:', JSON.stringify(req.body, null, 2));
    console.log('Import request received - Content Type:', req.headers['content-type']);
    
    // Si el cuerpo está vacío o no es un objeto, intentar analizar manualmente
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log('Empty body detected, attempting to parse raw body if available');
      // Esto es solo para depuración
      return res.status(400).json({ message: 'Empty request body detected. Please ensure you are sending valid JSON data with the correct Content-Type header.' });
    }
    
    // Obtener el nombre del archivo JSON y las historias de usuario
    const { jsonFileName, historias_de_usuario } = req.body;
    
    if (!historias_de_usuario || !Array.isArray(historias_de_usuario)) {
      console.log('Invalid data format:', req.body);
      return res.status(400).json({ message: 'Invalid data format. Expected "historias_de_usuario" array.' });
    }
    
    if (!jsonFileName) {
      console.log('Missing JSON file name');
      return res.status(400).json({ message: 'Missing JSON file name. Please provide a "jsonFileName" field.' });
    }
    
    // Importar o actualizar el registro del archivo JSON
    const JsonFile = require('../models/JsonFile');
    let jsonFile = await JsonFile.findOne({ fileName: jsonFileName });
    
    if (!jsonFile) {
      // Si el archivo no existe, crear un nuevo registro
      // Si viene uploadDate en el request, úsalo tal cual (ya es local del usuario)
      let uploadDate = req.body.uploadDate;
      if (!uploadDate) {
        // Si no viene, usa la fecha local del servidor (como antes)
        const now = new Date();
        const localYear = now.getFullYear();
        const localMonth = now.getMonth();
        const localDay = now.getDate();
        uploadDate = new Date(Date.UTC(localYear, localMonth, localDay, 0, 0, 0, 0));
      }
      jsonFile = new JsonFile({
        fileName: jsonFileName,
        storyCount: historias_de_usuario.length,
        uploadDate
      });
      await jsonFile.save();
      console.log(`Created new JSON file record: ${jsonFileName}`);
    } else {
      console.log(`Found existing JSON file record: ${jsonFileName}`);
    }
    
    // Verificar si existe la columna "Por Hacer" como columna por defecto
    let todoColumn = await Column.findOne({ name: 'Por Hacer', isDefault: true });
    
    // Si no existe, crearla como columna por defecto
    if (!todoColumn) {
      console.log('Creating default "Por Hacer" column');
      const maxPosition = await Column.findOne({ isDefault: true }).sort({ position: -1 });
      const position = maxPosition ? maxPosition.position + 1 : 0;
      
      todoColumn = new Column({
        name: 'Por Hacer',
        position: position,
        isDefault: true
      });
      await todoColumn.save();
    }
    
    // No crear automáticamente las columnas estándar, solo verificar que exista la columna "Por Hacer"
    console.log(`Using default "Por Hacer" column for JSON file: ${jsonFileName}`);
    
    // Find max position in the "Por Hacer" column
    const maxPosition = await Story.findOne({ column: todoColumn._id }).sort({ position: -1 });
    let currentPosition = maxPosition ? maxPosition.position + 1 : 0;
    
    const createdStories = [];
    
    console.log(`Processing ${historias_de_usuario.length} stories`);
    
    for (const storyData of historias_de_usuario) {
      console.log('Processing story:', storyData);
      
      // Check if we need to generate a new ID
      let storyId;
      if (storyData.id_historia) {
        // Check if it's a valid MongoDB ObjectId
        try {
          storyId = new mongoose.Types.ObjectId(storyData.id_historia);
        } catch (err) {
          console.log('Invalid ID, generating new one');
          storyId = new mongoose.Types.ObjectId();
        }
      } else {
        storyId = new mongoose.Types.ObjectId();
      }
      
      // Check if story with this ID already exists
      const existingStory = await Story.findOne({ _id: storyId });
      
      if (!existingStory) {
        // Crear criterios con timestamps
        const now = new Date();
        const criteria = (storyData.criterios_de_aceptacion || []).map(text => ({
          text,
          checked: false,
          createdAt: now,
          completedAt: null
        }));
        
        const story = new Story({
          _id: storyId,
          title: storyData.titulo || 'Sin título',
          criteria: criteria,
          column: todoColumn._id,
          position: currentPosition,
          jsonFileName: jsonFileName // Guardar el nombre del archivo JSON
        });
        
        try {
          const savedStory = await story.save();
          createdStories.push(savedStory);
          currentPosition++;
          console.log('Story saved successfully');
        } catch (err) {
          console.error('Error saving story:', err.message);
        }
      } else {
        console.log('Story already exists, skipping');
      }
    }
    
    console.log(`${createdStories.length} stories imported successfully`);
    
    res.status(201).json({
      message: `${createdStories.length} stories imported successfully`,
      stories: createdStories
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;