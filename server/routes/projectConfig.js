const express = require('express');
const router = express.Router();
const ProjectConfig = require('../models/ProjectConfig');

// Obtener la configuración de un proyecto específico
router.get('/:jsonFileName', async (req, res) => {
  try {
    const { jsonFileName } = req.params;
    
    let config = await ProjectConfig.findOne({ jsonFileName });
    
    // Si no existe configuración para este proyecto, crear una por defecto
    if (!config) {
      // Calcular el próximo viernes como fecha de fin por defecto
      const today = new Date();
      const nextFriday = new Date(today);
      const dayOfWeek = today.getDay();
      // Si ya es viernes (5), avanzar una semana
      if (dayOfWeek === 5) {
        nextFriday.setDate(today.getDate() + 7);
      } else {
        // Calcular días hasta el próximo viernes
        nextFriday.setDate(today.getDate() + (5 - dayOfWeek + 7) % 7);
      }
      
      config = new ProjectConfig({
        jsonFileName,
        chartStartDate: today,
        chartEndDate: nextFriday
      });
      
      await config.save();
    }
    
    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener la configuración del proyecto' });
  }
});

// Actualizar la configuración de un proyecto
router.put('/:jsonFileName', async (req, res) => {
  try {
    const { jsonFileName } = req.params;
    const { chartStartDate, chartEndDate } = req.body;
    
    let config = await ProjectConfig.findOne({ jsonFileName });
    
    if (!config) {
      config = new ProjectConfig({
        jsonFileName,
        chartStartDate: chartStartDate || new Date(),
        chartEndDate: chartEndDate || null
      });
    } else {
      if (chartStartDate) config.chartStartDate = chartStartDate;
      if (chartEndDate) config.chartEndDate = chartEndDate;
    }
    
    await config.save();
    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar la configuración del proyecto' });
  }
});

module.exports = router;
