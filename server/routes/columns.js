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

// Reorder columns
router.patch('/reorder', async (req, res) => {
  console.log('=== INICIO DE SOLICITUD DE REORDENAMIENTO ===');
  console.log('Cuerpo de la solicitud:', JSON.stringify(req.body, null, 2));
  console.log('Headers:', req.headers);
  
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { draggedId, targetId, jsonFileName } = req.body;
    console.log('Datos recibidos:', { draggedId, targetId, jsonFileName });
    
    if (!draggedId || !targetId) {
      const errorMsg = 'Faltan parámetros requeridos';
      console.error(errorMsg, { draggedId, targetId });
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false, 
        message: errorMsg,
        receivedData: req.body
      });
    }
    
    if (!draggedId || !targetId) {
      console.error('Faltan parámetros requeridos:', { draggedId, targetId });
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Se requieren draggedId y targetId' });
    }
    
    // Construir el query para incluir columnas
    const query = {};
    if (jsonFileName) {
      query.jsonFileName = jsonFileName;
      console.log('Buscando columnas con jsonFileName:', jsonFileName);
    } else {
      query.isDefault = true;
      console.log('Buscando columnas por defecto (isDefault: true)');
    }
    
    console.log('Buscando columnas con query:', query);
    
    // Obtener las columnas ordenadas por posición
    const columns = await Column.find(query).sort({ position: 1 }).session(session);
    console.log(`Se encontraron ${columns.length} columnas`);
    
    // Verificar que tengamos columnas para trabajar
    if (columns.length === 0) {
      console.error('No se encontraron columnas para reordenar');
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'No columns found to reorder' });
    }
    
    // Encontrar los índices de las columnas involucradas
    const draggedIndex = columns.findIndex(col => col._id.toString() === draggedId);
    const targetIndex = columns.findIndex(col => col._id.toString() === targetId);
    
    console.log('Índices encontrados:', { 
      draggedIndex, 
      targetIndex,
      columns: columns.map((c, i) => `${i}: ${c.name} (${c._id})`)
    });
    
    if (draggedIndex === -1 || targetIndex === -1) {
      console.error('No se encontraron las columnas:', { 
        draggedId, 
        targetId,
        availableIds: columns.map(c => c._id.toString())
      });
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Column not found' });
    }
    
    // Mover la columna arrastrada a la nueva posición
    const [movedColumn] = columns.splice(draggedIndex, 1);
    columns.splice(targetIndex, 0, movedColumn);
    
    console.log('Nuevo orden de columnas:');
    columns.forEach((col, index) => {
      console.log(`${index}: ${col.name} (${col._id})`);
    });
    
    // Actualizar las posiciones de todas las columnas en una sola operación
    const updatePromises = columns.map(async (col, index) => {
      try {
        const result = await Column.findByIdAndUpdate(
          col._id,
          { $set: { position: index } },
          { new: true, session }
        );
        console.log(`Actualizada columna ${col.name} a posición ${index}:`, 
          result ? 'éxito' : 'falló');
        return result;
      } catch (error) {
        console.error(`Error actualizando columna ${col._id}:`, error);
        throw error;
      }
    });
    
    // Esperar a que todas las actualizaciones se completen
    const updatedColumns = await Promise.all(updatePromises);
    
    // Confirmar la transacción
    await session.commitTransaction();
    session.endSession();
    
    console.log('Todas las columnas se actualizaron correctamente');
    
    res.json({ 
      message: 'Columns reordered successfully',
      columns: updatedColumns
    });
    
  } catch (error) {
    console.error('Error en el reordenamiento:', error);
    
    // Intentar abortar la transacción si hay un error
    if (session && session.inTransaction()) {
      console.log('Abortando transacción...');
      await session.abortTransaction();
    }
    
    if (session) {
      console.log('Cerrando sesión...');
      await session.endSession();
    }
    
    console.error('Error completo:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    res.status(500).json({ 
      message: 'Error reordering columns', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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