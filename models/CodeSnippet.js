const mongoose = require('mongoose')

const codeSnippetSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true,
    enum: ['javascript', 'typescript', 'python', 'java', 'cpp', 'css', 'html']
  },
  roomId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  isShared: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Index for efficient queries
codeSnippetSchema.index({ roomId: 1, createdAt: -1 })
codeSnippetSchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.models.CodeSnippet || mongoose.model('CodeSnippet', codeSnippetSchema)