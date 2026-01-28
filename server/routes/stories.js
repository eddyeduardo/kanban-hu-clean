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
    
    // Get column name for the user field
    const columnName = column.name || 'Sin columna';
    
    // Crear objeto con todos los campos de la historia
    const storyData = {
      title: req.body.title,
      criteria: req.body.criteria || [],
      column: req.body.column,
      position: position,
      user: columnName, // Establecer el usuario como el nombre de la columna por defecto
      esfuerzo: req.body.esfuerzo || '',
      tipo: req.body.tipo || '',
      // Incluir id_historia si está presente (puede ser undefined)
      ...(req.body.id_historia && { id_historia: req.body.id_historia }),
      // Incluir jsonFileName si está presente
      ...(req.body.jsonFileName && { jsonFileName: req.body.jsonFileName })
    };

    console.log('Creando nueva historia con datos:', JSON.stringify(storyData, null, 2));
    
    const story = new Story(storyData);
    
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

    // Buscar la columna destino si se especifica
    let targetColumn = null;
    if (req.body.column) {
      targetColumn = await Column.findById(req.body.column);
      if (!targetColumn) return res.status(404).json({ message: 'Target column not found' });

      // Si estamos cambiando de columna, calcular posición si no se especificó
      if (req.body.column !== story.column?.toString()) {
        if (req.body.position === undefined) {
          const maxPosition = await Story.findOne({ column: req.body.column }).sort({ position: -1 });
          req.body.position = maxPosition ? maxPosition.position + 1 : 0;
        }
      }
    }

    // Actualizar los campos básicos
    if (req.body.title) story.title = req.body.title;

    // Actualizar esfuerzo si se proporciona
    if ('esfuerzo' in req.body) {
      story.esfuerzo = req.body.esfuerzo || '';
    }

    // Actualizar tipo si se proporciona
    if ('tipo' in req.body) {
      story.tipo = req.body.tipo || '';
    }

    // Actualizar id_historia si se proporciona (incluso si es null o vacío)
    if ('id_historia' in req.body) {
      story.id_historia = req.body.id_historia || undefined; // Usar undefined para eliminar el campo si es vacío
    }

    // Actualizar user si se proporciona (incluso si es null o vacío) o si se está cambiando de columna
    if ('user' in req.body || req.body.column) {
      // Si se proporciona un usuario explícitamente, usarlo
      // Si no, usar el nombre de la columna como usuario
      story.user = req.body.user ||
                 (targetColumn ? targetColumn.name : undefined) ||
                 story.user;

      console.log('Actualizando usuario de la historia:', {
        storyId: story._id,
        oldUser: story.user,
        newUser: req.body.user || (targetColumn ? targetColumn.name : 'No cambiado'),
        columnChanged: !!req.body.column,
        newColumn: req.body.column
      });
    }
    
    // Actualizar jsonFileName si se proporciona (incluso si es null o vacío)
    if ('jsonFileName' in req.body) {
      story.jsonFileName = req.body.jsonFileName || undefined; // Usar undefined para eliminar el campo si es vacío
    }
    
    console.log('Actualizando historia con datos:', {
      id_historia: story.id_historia,
      user: story.user,
      jsonFileName: story.jsonFileName,
      column: req.body.column
    });
    
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
    
    // Actualizar la columna si se proporciona
    if (req.body.column) {
      console.log(`Actualizando columna a: ${req.body.column}`);
      story.column = req.body.column;
      
      // Si no se proporcionó un usuario, usar el nombre de la columna
      if (!story.user) {
        const targetColumn = await Column.findById(req.body.column);
        if (targetColumn) {
          story.user = targetColumn.name;
          console.log(`Usuario actualizado con el nombre de la columna: ${story.user}`);
        }
      }
    }
    
    // Actualizar posición si se proporciona
    if (req.body.position !== undefined) {
      console.log(`Actualizando posición a: ${req.body.position}`);
      story.position = req.body.position;
    }
    
    // Actualizar la fecha de finalización de la historia si se proporciona
    if (req.body.completedAt !== undefined) {
      console.log(`Actualizando fecha de finalización: ${req.body.completedAt}`);
      story.completedAt = req.body.completedAt;
    }
    
    console.log('Guardando historia con datos:', {
      id_historia: story.id_historia,
      user: story.user,
      jsonFileName: story.jsonFileName,
      column: story.column,
      position: story.position
    });
    
    // Guardar la historia
    const updatedStory = await story.save();
    
    // Hacer un populate del campo column para asegurarnos de que tenemos los datos actualizados
    const populatedStory = await Story.findById(updatedStory._id).populate('column', 'name');
    
    console.log('Historia guardada con éxito:', JSON.stringify({
      _id: populatedStory._id,
      id_historia: populatedStory.id_historia,
      user: populatedStory.user,
      jsonFileName: populatedStory.jsonFileName,
      column: populatedStory.column,
      position: populatedStory.position
    }, null, 2));
    
    res.json(populatedStory);
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
    
    // Obtener el nombre del archivo JSON, las historias de usuario y las preguntas
    const { jsonFileName, historias_de_usuario, preguntas_para_aclarar = [] } = req.body;
    
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
        uploadDate,
        storyCount: historias_de_usuario.length,
        preguntas_para_aclarar: Array.isArray(preguntas_para_aclarar) ? preguntas_para_aclarar : []
      });
      console.log(`Created new JSON file record: ${jsonFileName}`);
    } else {
      // Si el archivo ya existe, actualizar el contador de historias y las preguntas
      jsonFile.storyCount = historias_de_usuario.length;
      if (Array.isArray(preguntas_para_aclarar)) {
        jsonFile.preguntas_para_aclarar = preguntas_para_aclarar;
      }
      console.log(`Updated existing JSON file record: ${jsonFileName}`);
    }
    
    // Guardar los cambios en el archivo JSON
    await jsonFile.save();
    
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
        
        // Debug log para verificar los datos de la historia
        console.log('Story data:', {
          titulo: storyData.titulo,
          usuario: storyData.usuario,
          esfuerzo: storyData.esfuerzo,
          tipo: storyData.tipo,
          requerimiento: storyData.requerimiento,
          hasCriterios: storyData.criterios_de_aceptacion ? storyData.criterios_de_aceptacion.length : 0
        });

        // Usar 'titulo' o 'requerimiento' como título, con 'Sin título' como valor por defecto
        const titulo = storyData.titulo || storyData.requerimiento || 'Sin título';

        const story = new Story({
          _id: storyId,
          id_historia: storyData.id_historia || null,
          title: titulo,
          user: storyData.usuario,
          esfuerzo: storyData.esfuerzo || '',
          tipo: storyData.tipo || '',
          criteria: criteria,
          column: todoColumn._id,
          position: currentPosition,
          jsonFileName: jsonFileName
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