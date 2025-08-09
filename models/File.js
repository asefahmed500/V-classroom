const mongoose = require('mongoose')

const fileSchema = new mongoose.Schema({
  fileId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    default: null
  },
  roomId: {
    type: String,
    required: true,
    index: true
  },
  uploadedBy: {
    type: String,
    required: true
  },
  uploadedByName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  downloads: {
    type: Number,
    default: 0
  },
  isShared: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String
  }],
  favorites: [{
    userId: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
})

// Indexes for efficient queries
fileSchema.index({ roomId: 1, uploadedAt: -1 })
fileSchema.index({ uploadedBy: 1, uploadedAt: -1 })
fileSchema.index({ isDeleted: 1 })

module.exports = mongoose.models.File || mongoose.model('File', fileSchema)