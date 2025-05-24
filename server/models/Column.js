const mongoose = require('mongoose');

const ColumnSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  position: {
    type: Number,
    required: true
  },
  jsonFileName: {
    type: String,
    trim: true,
    index: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Crear un índice compuesto para name y jsonFileName para evitar duplicados dentro del mismo proyecto
ColumnSchema.index({ name: 1, jsonFileName: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Column', ColumnSchema);