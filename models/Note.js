const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  content: { type: String, default: '' },
  lastModifiedBy: { type: String, required: true },
  lastModifiedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  version: { type: Number, default: 1 },
  collaborators: [{
    userId: String,
    userName: String,
    lastActive: { type: Date, default: Date.now }
  }]
});

// Index for efficient queries
noteSchema.index({ roomId: 1 });
noteSchema.index({ lastModifiedAt: -1 });

module.exports = mongoose.models.Note || mongoose.model('Note', noteSchema);