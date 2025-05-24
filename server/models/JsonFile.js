const mongoose = require('mongoose');

const JsonFileSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  storyCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('JsonFile', JsonFileSchema);
