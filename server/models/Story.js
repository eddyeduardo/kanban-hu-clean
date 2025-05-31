const mongoose = require('mongoose');

const CriterionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  checked: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  isManuallyCreated: {
    type: Boolean,
    default: false
  }
});

const StorySchema = new mongoose.Schema({
  user: {
    type: String,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  criteria: [CriterionSchema],
  column: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Column',
    required: true
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
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Story', StorySchema);