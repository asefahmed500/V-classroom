const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  emoji: { type: String, required: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true },
  roomId: { type: String, required: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['text', 'file', 'system'], default: 'text' },
  fileData: {
    fileName: String,
    fileSize: Number,
    fileType: String,
    fileUrl: String,
    thumbnail: String
  },
  replyTo: String,
  reactions: [reactionSchema],
  createdAt: { type: Date, default: Date.now },
  editedAt: Date,
  isDeleted: { type: Boolean, default: false }
});

// Indexes for efficient queries
messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ messageId: 1 });
messageSchema.index({ userId: 1 });

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);