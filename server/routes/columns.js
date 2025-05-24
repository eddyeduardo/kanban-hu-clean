const express = require('express');
const router = express.Router();
const Column = require('../models/Column');
const Story = require('../models/Story');

// Get all columns
router.get('/', async (req, res) => {
  try {
    // Obtener el nombre del archivo JSON de la consulta
    const { jsonFileName } = req.query;
    
    let query = {};
    
    if (jsonFileName) {
      // Si se proporciona un nombre de archivo, buscar columnas asociadas a ese archivo o las columnas por defecto
      query = { $or: [{ jsonFileName }, { isDefault: true }] };
    }
    
    const columns = await Column.find(query).sort({ position: 1 });
    res.json(columns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a column
router.post('/', async (req, res) => {
  try {
    const { name, jsonFileName, isDefault } = req.body;
    
    // Validar que se proporcione un nombre de columna
    if (!name) {
      return res.status(400).json({ message: 'El nombre de la columna es obligatorio' });
    }
    
    // Si es una columna por defecto, verificar que no exista otra columna por defecto con el mismo nombre
    if (isDefault) {
      const existingDefaultColumn = await Column.findOne({ name, isDefault: true });
      if (existingDefaultColumn) {
        return res.status(400).json({ message: 'Ya existe una columna por defecto con este nombre' });
      }
    }
    
    // Si es una columna específica de un archivo JSON, verificar que no exista otra columna con el mismo nombre para ese archivo
    if (jsonFileName) {
      const existingColumn = await Column.findOne({ name, jsonFileName });
      if (existingColumn) {
        return res.status(400).json({ message: `Ya existe una columna con el nombre "${name}" para el archivo ${jsonFileName}` });
      }
    }
    
    // Find the maximum position value for columns of this type (default or specific to a JSON file)
    let query = {};
    if (jsonFileName) {
      query = { jsonFileName };
    } else if (isDefault) {
      query = { isDefault: true };
    }
    
    const maxPosition = await Column.findOne(query).sort({ position: -1 });
    const position = maxPosition ? maxPosition.position + 1 : 0;
    
    const column = new Column({
      name,
      position,
      jsonFileName,
      isDefault: isDefault || false
    });
    
    const newColumn = await column.save();
    res.status(201).json(newColumn);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get a specific column with its stories
router.get('/:id', async (req, res) => {
  try {
    const column = await Column.findById(req.params.id);
    if (!column) return res.status(404).json({ message: 'Column not found' });
    
    const stories = await Story.find({ column: req.params.id }).sort({ position: 1 });
    
    res.json({
      column,
      stories
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a column
router.patch('/:id', async (req, res) => {
  try {
    const column = await Column.findById(req.params.id);
    if (!column) return res.status(404).json({ message: 'Column not found' });
    
    if (req.body.name) column.name = req.body.name;
    if (req.body.position !== undefined) column.position = req.body.position;
    
    const updatedColumn = await column.save();
    res.json(updatedColumn);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a column
router.delete('/:id', async (req, res) => {
  try {
    const column = await Column.findById(req.params.id);
    if (!column) return res.status(404).json({ message: 'Column not found' });
    
    // Delete all stories in this column
    await Story.deleteMany({ column: req.params.id });
    
    await column.remove();
    res.json({ message: 'Column deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;