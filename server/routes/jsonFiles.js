const express = require('express');
const router = express.Router();
const JsonFile = require('../models/JsonFile');
const Story = require('../models/Story');
const Column = require('../models/Column');

// Obtener todos los archivos JSON
router.get('/', async (req, res) => {
  try {
    const jsonFiles = await JsonFile.find().sort({ uploadDate: -1 });
    res.json(jsonFiles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener un archivo JSON específico por nombre de archivo
router.get('/:fileName', async (req, res) => {
  try {
    const fileName = req.params.fileName;
    
    // Buscar el archivo por nombre
    const jsonFile = await JsonFile.findOne({ fileName });
    
    if (!jsonFile) {
      return res.status(404).json({ message: 'JSON file not found' });
    }
    
    res.json(jsonFile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cargar historias y columnas de un archivo JSON específico
router.get('/:fileName/stories', async (req, res) => {
  try {
    const fileName = req.params.fileName;
    
    // Verificar si el archivo existe
    const jsonFile = await JsonFile.findOne({ fileName });
    if (!jsonFile) {
      return res.status(404).json({ message: 'JSON file not found' });
    }
    
    // Obtener todas las historias asociadas con este archivo
    const stories = await Story.find({ jsonFileName: fileName })
      .populate('column', 'name')
      .sort({ position: 1 });
    
    // Obtener las columnas asociadas con este archivo y las columnas por defecto
    const Column = require('../models/Column');
    const columns = await Column.find({ $or: [{ jsonFileName: fileName }, { isDefault: true }] }).sort({ position: 1 });
    
    res.json({
      jsonFile,
      stories,
      columns
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
