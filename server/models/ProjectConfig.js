const mongoose = require('mongoose');

const ProjectConfigSchema = new mongoose.Schema({
  jsonFileName: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  chartStartDate: {
    type: Date,
    default: Date.now
  },
  chartEndDate: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para actualizar la fecha de modificación antes de guardar
ProjectConfigSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('ProjectConfig', ProjectConfigSchema);
